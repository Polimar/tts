# Contratto HTTP API (v1)

Base URL: `http://<host>:8765/api/v1`

Autenticazione predefinita: **cookie di sessione** `tts_session` (impostato da login/register). I client devono inviare cookie su ogni richiesta (`credentials: 'include'` in fetch).

Formato errori comune (tutti gli status 4xx/5xx salvo dove indicato):

```json
{
  "code": "invalid_credentials",
  "detail": "Email o password non validi."
}
```

| HTTP | Uso tipico |
|------|------------|
| 401 | Sessione assente o scaduta |
| 403 | Autenticato ma risorsa di altro utente |
| 409 | Conflitto (email duplicata, coda piena, voce in uso) |
| 422 | Validazione input |
| 429 | Rate limit (riservato; non usato in v1 salvo abuso) |

---

## AUTH

### `POST /auth/register`

Crea utente e apre sessione (cookie).

**Request**

```json
{
  "email": "mario.rossi@example.com",
  "password": "Sicura123!"
}
```

**Response `201 Created`**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "mario.rossi@example.com",
    "created_at": "2026-08-22T10:00:00Z"
  }
}
```

`Set-Cookie: tts_session=<session_id>; HttpOnly; Path=/; SameSite=Lax`

**Errori**

- `409` — `email_already_exists`: `"Esiste già un account con questa email."`
- `422` — `validation_error`: `"La password deve contenere almeno 8 caratteri."`

---

### `POST /auth/login`

**Request**

```json
{
  "email": "mario.rossi@example.com",
  "password": "Sicura123!"
}
```

**Response `200 OK`**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "mario.rossi@example.com",
    "created_at": "2026-08-22T10:00:00Z"
  }
}
```

**Errori**

- `401` — `invalid_credentials`: `"Email o password non validi."`
- `422` — `validation_error`

---

### `POST /auth/logout`

Invalida la sessione corrente.

**Request**: corpo vuoto.

**Response `204 No Content`**

`Set-Cookie: tts_session=; Max-Age=0`

**Errori**

- `401` se non autenticato (opzionale; può restituire 204 comunque)

---

### `GET /auth/me`

**Response `200 OK`**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "mario.rossi@example.com",
    "created_at": "2026-08-22T10:00:00Z"
  }
}
```

**Errori**

- `401` — `not_authenticated`: `"Sessione non valida o scaduta."`

---

## VOICES

Tutti gli endpoint richiedono autenticazione. L'utente vede e modifica **solo** le proprie voci.

### `GET /voices`

**Response `200 OK`**

```json
{
  "items": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Voce narratore",
      "duration_sec": 12.4,
      "created_at": "2026-08-22T10:05:00Z"
    }
  ],
  "total": 1
}
```

---

### `POST /voices`

Crea voce da audio di riferimento.

**Content-Type**: `multipart/form-data`

| Campo | Tipo | Obbligatorio |
|-------|------|--------------|
| `name` | string | sì |
| `reference_audio` | file | sì |

**Tipi MIME accettati**: `audio/wav`, `audio/mpeg`, `audio/mp4`, `audio/x-m4a`  
**Dimensione massima**: 20 MB (20 971 520 byte)

**Response `201 Created`**

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Voce narratore",
  "duration_sec": 12.4,
  "created_at": "2026-08-22T10:05:00Z"
}
```

**Errori**

- `422` — `invalid_audio_type`: `"Formato audio non supportato."`
- `422` — `file_too_large`: `"Il file supera la dimensione massima di 20 MB."`
- `422` — `audio_too_short` / `audio_too_long`: durata fuori range 3–60 s

---

### `GET /voices/{voice_id}`

**Response `200 OK`**

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Voce narratore",
  "duration_sec": 12.4,
  "created_at": "2026-08-22T10:05:00Z"
}
```

**Errori**

- `404` — `voice_not_found`
- `403` — `forbidden` se `voice_id` appartiene a altro utente

---

### `DELETE /voices/{voice_id}`

**Response `204 No Content`**

**Errori**

- `404` — `voice_not_found`
- `409` — `voice_in_use`: `"Impossibile eliminare: la voce è usata da un job in coda o in esecuzione."`

---

## JOBS (coda TTS)

### Policy coda

- **Un solo** job con `status: "running"` (slot GPU).
- Job aggiuntivi entrano in coda FIFO (`status: "queued"`, `queue_position` ≥ 1).
- Massimo **10** job in coda globale; oltre → `409 queue_full`.
- Stati: `queued` | `running` | `done` | `failed` | `cancelled`.

### `POST /jobs`

**Request** (testo libero)

```json
{
  "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "source_type": "text",
  "text": "C'era una volta, in un regno lontano...",
  "title": "Prova capitolo 1"
}
```

**Request** (capitolo libro — quando implementato)

```json
{
  "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "source_type": "chapter",
  "chapter_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Capitolo 3"
}
```

| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `voice_id` | uuid | sì | Deve appartenere all'utente |
| `source_type` | enum | sì | `text` \| `chapter` |
| `text` | string | se `text` | Max 50 000 caratteri |
| `chapter_id` | uuid | se `chapter` | |
| `title` | string | no | Max 200 caratteri |

**Response `201 Created`**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "queued",
  "source_type": "text",
  "title": "Prova capitolo 1",
  "progress": 0,
  "queue_position": 2,
  "error_code": null,
  "error_detail": null,
  "created_at": "2026-08-22T10:10:00Z",
  "started_at": null,
  "finished_at": null
}
```

**Errori**

- `404` — `voice_not_found`
- `404` — `chapter_not_found`
- `409` — `queue_full`: `"La coda di sintesi è piena. Riprova più tardi."`
- `422` — `validation_error`

---

### `GET /jobs`

Lista job dell'utente corrente, più recenti prima.

**Query**

| Param | Default | Descrizione |
|-------|---------|-------------|
| `status` | (tutti) | Filtra: `queued`, `running`, `done`, `failed`, `cancelled` |
| `limit` | 20 | Max 100 |
| `offset` | 0 | |

**Response `200 OK`**

```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "status": "running",
      "source_type": "text",
      "title": "Prova capitolo 1",
      "progress": 0.35,
      "queue_position": null,
      "error_code": null,
      "error_detail": null,
      "created_at": "2026-08-22T10:10:00Z",
      "started_at": "2026-08-22T10:10:05Z",
      "finished_at": null
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /jobs/{job_id}`

**Response `200 OK`**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "done",
  "source_type": "text",
  "title": "Prova capitolo 1",
  "progress": 1,
  "queue_position": null,
  "error_code": null,
  "error_detail": null,
  "audio_ready": true,
  "created_at": "2026-08-22T10:10:00Z",
  "started_at": "2026-08-22T10:10:05Z",
  "finished_at": "2026-08-22T10:12:30Z"
}
```

Job fallito:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "failed",
  "source_type": "text",
  "title": "Prova capitolo 1",
  "progress": 0.12,
  "queue_position": null,
  "error_code": "synthesis_failed",
  "error_detail": "Errore durante la sintesi vocale.",
  "audio_ready": false,
  "created_at": "2026-08-22T10:10:00Z",
  "started_at": "2026-08-22T10:10:05Z",
  "finished_at": "2026-08-22T10:10:20Z"
}
```

**Errori**

- `404` — `job_not_found`
- `403` — `forbidden`

---

### `POST /jobs/{job_id}/cancel`

Annulla solo se `status === "queued"`.

**Response `200 OK`**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "cancelled",
  "queue_position": null,
  "finished_at": "2026-08-22T10:11:00Z"
}
```

**Errori**

- `404` — `job_not_found`
- `409` — `job_not_cancellable`: `"Solo i job in coda possono essere annullati."`

---

## AUDIO

### `GET /jobs/{job_id}/audio`

Scarica o stream dell'audio sintetizzato. Richiede auth; solo owner del job.

**Precondizione**: `status === "done"` e file presente.

**Response `200 OK`**

```
Content-Type: audio/wav
Content-Length: <bytes>
Accept-Ranges: bytes
```

Corpo: file WAV binario.

**Range** (opzionale ma supportato)

```
GET /jobs/{job_id}/audio
Range: bytes=0-1023
```

**Response `206 Partial Content`**

```
Content-Type: audio/wav
Content-Range: bytes 0-1023/524288
Content-Length: 1024
```

**Errori**

- `404` — `job_not_found` o `audio_not_ready`: `"L'audio non è ancora disponibile."`
- `403` — `forbidden`
- `401` — `not_authenticated`

---

## Codici errore stabili (`code`)

| `code` | HTTP | Descrizione |
|--------|------|-------------|
| `not_authenticated` | 401 | Sessione mancante/scaduta |
| `invalid_credentials` | 401 | Login fallito |
| `forbidden` | 403 | Accesso negato alla risorsa |
| `voice_not_found` | 404 | Voce inesistente |
| `job_not_found` | 404 | Job inesistente |
| `chapter_not_found` | 404 | Capitolo inesistente |
| `audio_not_ready` | 404 | Audio non pronto |
| `email_already_exists` | 409 | Registrazione duplicata |
| `queue_full` | 409 | Coda GPU piena |
| `voice_in_use` | 409 | Voce legata a job attivi |
| `job_not_cancellable` | 409 | Cancel non consentito |
| `validation_error` | 422 | Input non valido |
| `invalid_audio_type` | 422 | MIME non accettato |
| `file_too_large` | 422 | File troppo grande |
| `internal_error` | 500 | Errore server |

---

## Enum di riferimento

**`job.status`**: `queued` | `running` | `done` | `failed` | `cancelled`

**`job.source_type`**: `text` | `chapter`

---

## OpenAPI

Specifica completa in [`openapi.yaml`](../openapi.yaml) alla root del repository.
