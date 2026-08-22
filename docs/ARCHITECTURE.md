# Architettura TTS (v1)

Documento di riferimento per backend, frontend web e futuri client (Android/iOS). Il repository al momento contiene solo questo README e le specifiche; l'implementazione seguirà questi contratti.

## Obiettivo prodotto

Webapp open source per clonazione vocale italiana: l'utente carica un audio di riferimento, inserisce testo (o seleziona un capitolo di un libro), e il sistema sintetizza la voce con **Qwen3-TTS 0.6B Base** su **Intel Arc (torch.xpu)**. Deploy previsto in locale e su `tts.alevale.it`.

## Vincoli non negoziabili

| Vincolo | Valore |
|---------|--------|
| Bind server | `0.0.0.0:8765` |
| Stack | FastAPI + Vite/React + SQLite |
| Voci utente | `data/users/<user_id>/voices/` |
| GPU | **Un solo job di sintesi in stato `running`** |
| Auth | Email + password |
| UI (v1) | Solo italiano, solo web |
| Engine | Qwen3-TTS 0.6B Base su `torch.xpu` |
| Startup assert | Il processo deve fallire se XPU non ha allocato memoria per il modello |

## Topologia processi

```
┌─────────────────────────────────────────────────────────────────┐
│  Processo unico: uvicorn (FastAPI) @ 0.0.0.0:8765             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ HTTP API     │  │ Static SPA   │  │ Job executor         │  │
│  │ /api/v1/*    │  │ (prod only)  │  │ (thread asyncio)     │  │
│  └──────┬───────┘  └──────────────┘  └──────────┬───────────┘  │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐                      ┌──────────────────────┐ │
│  │ SQLite       │◄─────────────────────│ Qwen3-TTS su XPU     │ │
│  │ tts.db       │   stato job / coda   │ (1 slot GPU)         │ │
│  └──────────────┘                      └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Perché un solo processo (no worker separato)

- **Semplicità operativa**: un comando avvia API, coda e engine; adatto a installazione locale su una macchina con una GPU Intel Arc.
- **Un solo slot GPU**: non serve un secondo processo; il vincolo «1 job running» è naturale in un executor in-process con lock.
- **Persistenza**: SQLite tiene la coda e lo stato job; al riavvio il processo riprende i job `queued` e, se necessario, marca `running` interrotti come `failed`.

**Trade-off accettato**: durante la sintesi il thread CPU dell'executor è occupato; le richieste HTTP restano servite da altri worker uvicorn/async, ma la GPU non accetta un secondo job. Per v1 questo è sufficiente.

### Sviluppo vs produzione (frontend)

| Modalità | Frontend | Backend |
|----------|----------|---------|
| **Sviluppo** | `vite dev` (porta separata, es. `5173`) con proxy verso `http://localhost:8765` | `uvicorn` su `0.0.0.0:8765` |
| **Produzione** | Build statica (`frontend/dist`) servita da FastAPI (`StaticFiles` + fallback SPA) | Stesso processo su `0.0.0.0:8765` |

In dev il cookie di sessione richiede proxy Vite configurato con `changeOrigin` e `credentials: 'include'` lato client.

## Autenticazione

**Scelta: sessione via cookie httpOnly** (non JWT bearer in header).

| Aspetto | Decisione |
|---------|-----------|
| Cookie | `tts_session`, `HttpOnly`, `SameSite=Lax`, `Secure` in produzione (HTTPS) |
| Storage server | Tabella `sessions` in SQLite; token opaco (UUID o random 32 byte), hash in DB |
| Scadenza | 30 giorni, sliding su ogni richiesta autenticata |
| Password | Argon2id (o bcrypt se dipendenze limitate) |

**Perché cookie e non JWT**

- Il client v1 è una SPA sullo stesso origin in produzione: i cookie httpOnly riducono il rischio XSS rispetto a `localStorage`.
- Nessun refresh token da gestire in v1.
- I futuri client mobile possono usare lo stesso endpoint con cookie jar o, in una fase successiva, un endpoint dedicato che restituisce un token di sessione esplicito (fuori scope v1).

**Isolamento**: ogni query su `voices`, `jobs`, `books` filtra per `user_id` derivato dalla sessione. Nessun ID globale esposto senza controllo ownership.

## Layout storage su disco

```
data/
├── tts.db                          # SQLite
└── users/
    └── <user_id>/
        ├── voices/
        │   └── <voice_id>/
        │       ├── reference.wav     # audio caricato dall'utente
        │       └── meta.json         # opzionale: durata, nome originale file
        └── jobs/
            └── <job_id>/
                └── output.wav        # audio sintetizzato
```

- I path in DB sono relativi a `data/` per portabilità.
- Eliminazione voce: soft-delete in DB + rimozione directory se nessun job attivo la referenzia (policy: rifiutare delete se job `queued`/`running` usano quella voce → `409`).

## Schema SQLite (sketch)

```sql
-- Utenti
CREATE TABLE users (
    id            TEXT PRIMARY KEY,  -- UUID
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessioni (cookie tts_session → session_id)
CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Voci clonate
CREATE TABLE voices (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    reference_path  TEXT NOT NULL,   -- es. users/<uid>/voices/<vid>/reference.wav
    duration_sec    REAL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_voices_user ON voices(user_id);

-- Libri e capitoli (v1: schema pronto, API libri opzionale in v1.1)
CREATE TABLE books (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE chapters (
    id         TEXT PRIMARY KEY,
    book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    text       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_chapters_book ON chapters(book_id);

-- Coda sintesi TTS
CREATE TABLE jobs (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voice_id      TEXT NOT NULL REFERENCES voices(id),
    status        TEXT NOT NULL CHECK (status IN ('queued','running','done','failed','cancelled')),
    source_type   TEXT NOT NULL CHECK (source_type IN ('text','chapter')),
    text          TEXT,                -- se source_type = 'text'
    chapter_id    TEXT REFERENCES chapters(id),
    title         TEXT,
    progress      REAL DEFAULT 0,    -- 0.0 .. 1.0
    error_code    TEXT,
    error_detail  TEXT,
    audio_path    TEXT,                -- users/<uid>/jobs/<jid>/output.wav
    queue_position INTEGER,          -- FIFO; NULL se non in coda
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    started_at    TEXT,
    finished_at   TEXT
);
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX idx_jobs_queue ON jobs(status, queue_position) WHERE status = 'queued';
```

## Coda GPU: una sintesi alla volta

### Policy: FIFO persistita, un solo `running`

1. **Creazione job** (`POST /api/v1/jobs`): inserisce riga con `status = 'queued'` e `queue_position` = max+1.
2. **Executor** (loop all'avvio e dopo ogni job):
   - Se esiste già un job `running`, non avviarne altri.
   - Altrimenti prende il job `queued` con `queue_position` minimo, lo marca `running`, esegue sintesi su XPU, poi `done` o `failed`.
3. **Coda piena**: massimo **10** job `queued` per l'intero sistema (configurabile). Oltre → `409` con `code: queue_full`.
4. **Cancel**: solo job ancora `queued` → `cancelled`; job `running` non interrompibile in v1 (documentato in API).
5. **Riavvio processo**:
   - Job `running` → `failed`, `error_code: interrupted`, `error_detail` in italiano.
   - Job `queued` restano in coda; l'executor li riprende.

Non si usa policy «reject-if-busy»: la coda FIFO evita perdita richieste e resta semplice con SQLite.

```
  [queued pos=1] → [running] → [done|failed]
        ↑
  [queued pos=2..N]  (max N=10)
```

## Engine TTS e assert XPU

All'avvio del modulo engine (prima di accettare job):

```python
import torch

# Caricamento Qwen3-TTS 0.6B Base su device XPU
# ... load model ...

assert torch.xpu.is_available(), "XPU non disponibile"
assert torch.xpu.memory_allocated() > 0, (
    "Il modello non è stato caricato su XPU; "
    "il processo termina per evitare sintesi su CPU non supportata."
)
```

**Fail-closed**: se l'assert fallisce, il processo non parte (exit code ≠ 0). Nessun fallback su CPU in v1.

Warm-up opzionale: una inferenza breve in startup per validare il pipeline completo.

## Audio: formato, path, streaming

| Aspetto | Decisione |
|---------|-----------|
| Formato output | **WAV** PCM 16-bit, mono, 24 kHz (allineato a Qwen3-TTS; aggiornare se il modello impone altro sample rate) |
| Content-Type | `audio/wav` |
| Path | `data/users/<user_id>/jobs/<job_id>/output.wav` |
| Download | `GET /api/v1/jobs/{job_id}/audio` — auth obbligatoria |
| Streaming / seek | Supporto header **`Range`** (`206 Partial Content`) per player HTML5 |
| URL pubblici | **Non** in v1: nessun link non autenticato; no signed URL fino a requisito esplicito |

L'audio di riferimento voce accetta `audio/wav`, `audio/mpeg`, `audio/mp4`, `audio/x-m4a`; max **20 MB**, durata consigliata 5–30 secondi (validazione lato server).

## Internazionalizzazione

- **UI v1**: solo italiano (`it-IT`). Nessun selettore lingua.
- **API errori**: campo `detail` in italiano + `code` stabile in `snake_case` per client programmatici.
- **OpenAPI**: descrizioni in italiano dove utile; enum e field names in inglese/snake_case per stabilità cross-platform.

## Fuori scope (v1)

- App native Android/iOS (possono riusare `/api/v1/*` in futuro).
- Multi-tenant / organizzazioni.
- Più GPU o job paralleli.
- URL firmati o CDN per audio.
- OAuth / SSO.
- Localizzazione UI non italiana.

## Dipendenze previste (riferimento)

- **Backend**: FastAPI, uvicorn, SQLAlchemy o sqlite3, passlib/argon2, python-multipart, torch con supporto XPU, Qwen3-TTS.
- **Frontend**: Vite, React, TypeScript; testi hardcoded o file `it.json` unico.
- **DB**: SQLite file `data/tts.db`, WAL mode consigliato.

## Riferimenti

- Contratto HTTP dettagliato: [`docs/API.md`](API.md)
- OpenAPI machine-readable: [`openapi.yaml`](../openapi.yaml) (root repository)
