# Contratto HTTP API (live backend)

> **SUPERSEDED:** Il draft v1 in PR #3 (`/api/v1`, cookie `tts_session`, campo `email`) è obsoleto. Il contratto canonico è il backend live in PR #10 (`tts_server` su `0.0.0.0:8765`). Usare solo questo documento e `openapi.yaml`.

**Base URL:** `http://<host>:8765` — **nessun** prefisso `/api` o `/api/v1`.

**UI:** in produzione same-origin su `:8765` (SPA + API stesso host/porta). In sviluppo il frontend Vite usa un proxy verso `:8765`.

---

## Autenticazione

| Meccanismo | Dettaglio |
|---|---|
| Trasporto | Header `Authorization: Bearer <token>` |
| Token | Restituito da `POST /auth/register` e `POST /auth/login` in `AuthResponse.token` |
| Scadenza | `AuthResponse.expires_at` (ISO 8601 UTC) |
| Register | Richiede header `X-API-Key: <API_KEY>` (valore da env server `API_KEY`) |
| Cookie | **Nessun** cookie `tts_session` in v2 |

Identità utente: campo **`username`** (non `email`).

### Header comuni

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Per register:

```http
X-API-Key: <API_KEY>
Content-Type: application/json
```

Per upload voce (multipart):

```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Formato errori (FastAPI default)

```json
{
  "detail": "Invalid credentials"
}
```

Oppure per errori di validazione Pydantic:

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 8 characters",
      "input": "short"
    }
  ]
}
```

| HTTP | Uso tipico |
|---|---|
| 400 | Input non valido, id malformato |
| 401 | Non autenticato, token scaduto, `X-API-Key` mancante/errato su register |
| 404 | Risorsa non trovata (o voce/job di altro utente → 404, non 403) |
| 409 | Username duplicato, job non completato per download |
| 413 | Upload audio troppo grande |
| 429 | Rate limit login (`LOGIN_RATE_LIMIT_PER_MINUTE`) |

---

## Tipi JSON (allineati a `tts_server/schemas.py`)

### `UserOut`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "mario",
  "created_at": "2026-08-22T10:00:00+00:00"
}
```

### `AuthResponse`

```json
{
  "token": "urlsafe-base64-token",
  "expires_at": "2026-08-29T10:00:00+00:00",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "mario",
    "created_at": "2026-08-22T10:00:00+00:00"
  }
}
```

### `VoiceOut`

```json
{
  "id": "voice-id",
  "name": "Mia voce",
  "ref_text": "Testo letto nel campione audio",
  "language": "Italian",
  "created_at": "2026-08-22T10:05:00+00:00"
}
```

### `JobOut`

```json
{
  "id": "job-id",
  "voice_id": "voice-id",
  "status": "queued",
  "language": "Italian",
  "text": "Testo da sintetizzare.",
  "chunk_count": 0,
  "error": null,
  "wav_available": false,
  "mp3_available": false,
  "device_used": null,
  "created_at": "2026-08-22T10:10:00+00:00",
  "started_at": null,
  "completed_at": null
}
```

`status`: **`queued` | `running` | `completed` | `failed`** (non `done`).

`wav_available` / `mp3_available`: booleani derivati dalla presenza del file export (non status testuali).

### `HealthOut`

```json
{
  "status": "ok",
  "worker_ready": true
}
```

### `DeviceInfoOut` (route `/system/device`, autenticata)

```json
{
  "device": "cpu",
  "model_id": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
  "xpu_gate_passed": false,
  "xpu_gate_reason": "TTS_DEVICE=cpu (default)",
  "xpu_memory_bytes": 0,
  "cpu_warmup_seconds": 12.5,
  "xpu_warmup_seconds": null
}
```

---

## Endpoint

### `GET /health`

Pubblico. Nessuna auth.

**Response `200`:** `HealthOut`

---

### `POST /auth/register`

Crea utente e restituisce token Bearer.

**Headers:** `X-API-Key: <API_KEY>` obbligatorio.

**Body (`RegisterRequest`):**

```json
{
  "username": "mario",
  "password": "password123"
}
```

| Campo | Vincoli |
|---|---|
| `username` | string, min 3, max 64 |
| `password` | string, min 8, max 128 |

**Response `201`:** `AuthResponse`

**Errori:** `401` (API key), `409` (`Username already exists`), `422` (validazione)

---

### `POST /auth/login`

**Body (`LoginRequest`):**

```json
{
  "username": "mario",
  "password": "password123"
}
```

**Response `200`:** `AuthResponse`

**Errori:** `401` (`Invalid credentials`), `429` (rate limit per IP)

---

### `POST /auth/logout`

**Auth:** Bearer obbligatorio.

**Response `204`:** body vuoto. Invalida il token corrente.

---

### `GET /auth/me`

**Auth:** Bearer obbligatorio.

**Response `200`:** `UserOut`

---

### `POST /voices`

Crea voce da campione audio (multipart).

**Auth:** Bearer obbligatorio.

**Body:** `multipart/form-data`

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `name` | string (form) | sì | Nome visualizzato |
| `ref_text` | string (form) | sì | Testo corrispondente all'audio |
| `language` | string (form) | no | Default `Italian` |
| `audio` | file | sì | **Non** `reference_audio` |

Formati audio ammessi: `.wav`, `.mp3`, `.flac`, `.ogg`, `.m4a`. Max size: `MAX_UPLOAD_BYTES` (default 20 MB).

**Response `201`:** `VoiceOut`

---

### `GET /voices`

**Auth:** Bearer obbligatorio.

**Response `200`:** array di `VoiceOut`

---

### `GET /voices/{voice_id}`

**Auth:** Bearer obbligatorio.

**Response `200`:** `VoiceOut`

**Errori:** `400` (id non valido), `404`

---

### `DELETE /voices/{voice_id}`

**Auth:** Bearer obbligatorio.

**Response `204`:** body vuoto.

---

### `POST /jobs`

Accoda sintesi TTS.

**Auth:** Bearer obbligatorio.

**Body (`JobCreateRequest`):**

```json
{
  "voice_id": "voice-id",
  "text": "Testo da sintetizzare.",
  "language": "Italian"
}
```

| Campo | Obbligatorio | Default |
|---|---|---|
| `voice_id` | sì | — |
| `text` | sì | min length 1 |
| `language` | no | `Italian` |

**Response `201`:** `JobOut` con `status: "queued"`

**Errori:** `400` (testo vuoto o oltre `MAX_TEXT_CHARS`), `404` (voce non trovata)

---

### `GET /jobs`

**Auth:** Bearer obbligatorio.

**Response `200`:** array di `JobOut`

---

### `GET /jobs/{job_id}`

**Auth:** Bearer obbligatorio. Polling per aggiornare `status` fino a `completed` o `failed`.

**Response `200`:** `JobOut`

---

### `GET /jobs/{job_id}/download/wav`

**Auth:** Bearer obbligatorio.

**Response `200`:** file `audio/wav` (stream binario)

**Errori:** `409` se `status != completed`, `404` se WAV non disponibile

---

### `GET /jobs/{job_id}/download/mp3`

**Auth:** Bearer obbligatorio.

**Response `200`:** file `audio/mpeg` (stream binario)

**Errori:** `409` se `status != completed`, `404` se MP3 non disponibile

---

### `GET /system/device`

Info worker/device (debug/ops). **Auth:** Bearer obbligatorio.

**Response `200`:** `DeviceInfoOut`

**Errori:** `503` se worker non inizializzato

---

## Flusso frontend (cheat sheet)

1. **Register** (solo setup/admin): `POST /auth/register` + `X-API-Key` → salva `token`.
2. **Login**: `POST /auth/login` con `{username, password}` → salva `token`.
3. Tutte le chiamate protette: `Authorization: Bearer ${token}`.
4. **Crea voce**: `POST /voices` multipart (`name`, `ref_text`, `language`, `audio`).
5. **Sintesi**: `POST /jobs` con `{voice_id, text, language?}`.
6. **Poll**: `GET /jobs/{id}` fino a `status === "completed"` o `"failed"`.
7. **Download**: se `wav_available` → `GET /jobs/{id}/download/wav`; se `mp3_available` → `GET /jobs/{id}/download/mp3`.

**Isolamento utenti:** accesso a voce/job di altro utente restituisce `404` (non `403`).
