# Architettura TTS (live backend)

> **SUPERSEDED:** PR #3 documentava un contratto v1 con `/api/v1`, cookie `tts_session` e campo `email`. Obsoleto. Questo documento descrive il backend live in PR #10 (`tts_server`).

## Panoramica

Applicazione monolitica Python: **FastAPI** + **worker Qwen3-TTS** + **coda seriale** + **SQLite**. Un processo `uvicorn` espone l'API su **`0.0.0.0:8765`** (configurabile via `HOST` / `PORT`).

```
┌─────────────────────────────────────────────────────────────────┐
│  uvicorn @ 0.0.0.0:8765 (same-origin UI in produzione)          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ HTTP API     │  │ (SPA static) │  │ JobQueue + Qwen3Worker │ │
│  │ FastAPI      │  │ produzione   │  │ inference seriale      │ │
│  └──────┬───────┘  └──────────────┘  └───────────┬────────────┘ │
│         │                                         │             │
│         ▼                                         ▼             │
│  ┌──────────────┐                        ┌────────────────────┐ │
│  │ SQLite       │                        │ DATA_DIR/users/    │ │
│  │ tts.db       │                        │ audio + export     │ │
│  └──────────────┘                        └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

| Componente | Percorso codice | Ruolo |
|---|---|---|
| App entry | `tts_server/main.py` | Lifespan: init worker, avvio coda |
| Router | `tts_server/api/` | Route HTTP (no prefisso `/api/v1`) |
| Auth | `tts_server/auth/` | Register/login, Bearer token |
| Schemi | `tts_server/schemas.py` | **Contratto JSON canonico** |
| DB | `tts_server/db/database.py` | SQLite: users, sessions, voices, jobs |
| Worker | `tts_server/worker/qwen3_worker.py` | Qwen3-TTS, chunking, export WAV/MP3 |
| Config | `tts_server/config.py` | Env: `HOST`, `PORT`, `DATA_DIR`, secrets |

## Contratto HTTP

- **Base:** root del server (`http://host:8765`), non `/api/v1`.
- **Auth:** `Authorization: Bearer <token>` da `AuthResponse`. Nessun cookie di sessione.
- **Identità:** `username` (non email). Modelli: `UserOut`, `AuthResponse`, `VoiceOut`, `JobOut`, `HealthOut`, `DeviceInfoOut` in `schemas.py`.
- **Register:** richiede `X-API-Key` (static API key server-side).

### Route map

| Path | Auth | Note |
|---|---|---|
| `GET /health` | no | Liveness pubblico |
| `POST /auth/register` | `X-API-Key` | 201 + token |
| `POST /auth/login` | no | Rate limit per IP |
| `POST /auth/logout` | Bearer | 204 |
| `GET /auth/me` | Bearer | |
| `POST /voices` | Bearer | multipart: `name`, `ref_text`, `language`, `audio` |
| `GET /voices` | Bearer | |
| `GET /voices/{voice_id}` | Bearer | |
| `DELETE /voices/{voice_id}` | Bearer | 204 |
| `POST /jobs` | Bearer | body: `voice_id`, `text`, `language?` |
| `GET /jobs` | Bearer | |
| `GET /jobs/{job_id}` | Bearer | polling status |
| `GET /jobs/{job_id}/download/wav` | Bearer | solo se `completed` |
| `GET /jobs/{job_id}/download/mp3` | Bearer | solo se `completed` |
| `GET /system/device` | Bearer | info device/worker |

## Autenticazione e sessioni

1. Register/login creano riga in `sessions` con `token` (url-safe random), `user_id`, `expires_at`.
2. `get_current_user_id` valida Bearer token contro SQLite.
3. Logout elimina la sessione per quel token.
4. Scadenza default: `TOKEN_EXPIRE_HOURS` (168 h).

Password: bcrypt via passlib. Login rate limit: sliding window per IP (`LOGIN_RATE_LIMIT_PER_MINUTE`).

## Ciclo di vita job

```
queued → running → completed | failed
```

1. `POST /jobs` inserisce job `queued`, testo eventualmente spezzato in chunk (`CHUNK_MAX_CHARS`).
2. `JobQueue` (thread background) prende un job alla volta (**coda seriale**).
3. Worker sintetizza chunk, concatena, scrive WAV; opzionalmente MP3.
4. DB aggiorna `status`, `chunk_count`, `device_used`, `wav_rel_path` / `mp3_rel_path`, timestamp.
5. Client poll `GET /jobs/{id}`; quando `status === "completed"` e `wav_available`/`mp3_available`, scarica da `/download/wav` o `/download/mp3`.

`JobOut.wav_available` e `JobOut.mp3_available` riflettono presenza file su disco (non sono valori di `status`).

## Worker e device

- Modello: `Qwen/Qwen3-TTS-12Hz-0.6B-Base` (`MODEL_ID`).
- Default device: **CPU** (`TTS_DEVICE=cpu`). Percorso locale supportato su Windows.
- XPU: gate fail-closed — richiede warmup generate completo; su Arc 140T testato NO-GO.
- `MOCK_WORKER=1`: sintesi mock per test/dev senza GPU/modello.
- `GPU_QUEUE_WORKERS=1`: un job inference attivo sul device.

## Persistenza (`DATA_DIR`)

Default **fuori repository** (vedi `tts_server/config.py`):

| OS | Path default |
|---|---|
| Windows | `%LOCALAPPDATA%\Polimar\tts` |
| Linux | `~/.local/share/polimar-tts` |

```
<DATA_DIR>/
├── tts.db
├── warmup/
└── users/
    └── <user_id>/
        ├── voices/<voice_id>/   # reference audio
        └── exports/<job_id>/   # WAV / MP3
```

Permessi directory: owner-only (`0o700` su Unix).

## Deployment

| Ambiente | Frontend | Backend |
|---|---|---|
| **Sviluppo** | Vite dev server (es. `:5173`) con proxy verso `http://localhost:8765` | `uvicorn tts_server.main:app --host 0.0.0.0 --port 8765` |
| **Produzione** | SPA statica same-origin su `:8765` | Stesso processo su `0.0.0.0:8765` |
| **NPM / `tts.alevale.it`** | Via reverse proxy NPM → Windows box `:8765` | `HOST=0.0.0.0`, firewall LAN |

Health check NPM: `GET /health` → `{"status":"ok","worker_ready":...}`.

## Sicurezza

- Route pubbliche: `GET /health`, `POST /auth/login`.
- Register protetto da `X-API-Key`.
- Isolamento dati per `user_id`: cross-user access → `404`.
- Upload: whitelist estensioni/MIME, max `MAX_UPLOAD_BYTES`, path traversal bloccato.
- `/health` non espone secrets, path o env.

## Riferimenti

- Contratto HTTP dettagliato: [`docs/API.md`](API.md)
- OpenAPI: [`openapi.yaml`](../openapi.yaml) (root repo)
- Implementazione schemi: `tts_server/schemas.py` (PR #10)
