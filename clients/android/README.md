# Client Kotlin per API TTS (Android-compatible)

Modulo libreria **senza UI**: DTO, enum, modelli errore e contratto `AuthClient` allineati a [`openapi.yaml`](https://github.com/Polimar/tts/blob/main/openapi.yaml) (PR #3 Architect).

**Mobile Dev** implementa Retrofit/OkHttp (cookie `tts_session`, multipart, Range audio).  
**Questo modulo** fornisce tipi Kotlin 1:1 con OpenAPI — nessun mapping sorpresa.

## Source of truth

| File | PR |
|------|-----|
| `openapi.yaml` | [#3](https://github.com/Polimar/tts/pull/3) |
| `docs/API.md` | [#3](https://github.com/Polimar/tts/pull/3) |
| `docs/ARCHITECTURE.md` | [#3](https://github.com/Polimar/tts/pull/3) |

## Hard lock (API v1)

- Cookie sessione: **`tts_session`** (httpOnly, non Bearer)
- Prefisso: **`/api/v1`**, JSON **snake_case**
- Errori: `{ "code", "detail" }` (italiano, `code` stabile → enum `ErrorCode`)
- Coda FIFO: max **10** `queued`, **1** `running` → `POST /jobs` → **409** `queue_full`
- Audio: `GET /jobs/{job_id}/audio` autenticato, WAV, supporto **Range** (200/206)
- Voci server-side: `data/users/<id>/voices`
- `job.status`: `queued` \| `running` \| `done` \| `failed` \| `cancelled`

## Compilazione

```bash
cd clients/android
./gradlew :tts-client:build
```

Requisiti: JDK 21+ (o 17+ con toolchain Gradle).

## Dipendenze esportate

- `kotlinx-serialization-json`
- `kotlinx-coroutines-core` (per `AuthClient` suspend)

Nessuna dipendenza OkHttp/Retrofit — a carico del Mobile Dev.

## Uso tipi

```kotlin
import it.polimar.tts.client.TtsJson
import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.CreateJobRequest
import it.polimar.tts.client.model.SourceType

val auth = TtsJson.decodeFromString<AuthResponse>(responseBody)

val jobRequest = CreateJobRequest(
    voiceId = voiceId,
    sourceType = SourceType.TEXT,
    text = "C'era una volta...",
    title = "Capitolo 1",
)
val jsonBody = TtsJson.encodeToString(jobRequest)
```

## AuthClient (interfaccia)

```kotlin
import it.polimar.tts.client.TtsApiConstants
import it.polimar.tts.client.auth.AuthClient

// Cookie da inviare su ogni richiesta autenticata:
TtsApiConstants.SESSION_COOKIE_NAME // "tts_session"

// Path relativi a baseUrl = http://<host>:8765/api/v1
TtsApiConstants.Paths.AUTH_LOGIN    // /auth/login
```

| Metodo | HTTP | Success |
|--------|------|---------|
| `register` | POST `/auth/register` | **201** + `Set-Cookie: tts_session=...` |
| `login` | POST `/auth/login` | **200** + cookie |
| `logout` | POST `/auth/logout` | **204** |
| `me` | GET `/auth/me` | **200** `AuthResponse` |

## Modelli principali

| Kotlin | OpenAPI schema |
|--------|----------------|
| `AuthResponse` | `AuthResponse` |
| `User` | `User` |
| `Voice` / `VoiceListResponse` | `Voice` / `VoiceListResponse` |
| `Job` / `JobDetail` / `JobListResponse` | `Job` / `JobDetail` / `JobListResponse` |
| `JobCancelled` | `JobCancelled` |
| `CreateJobRequest` | `CreateJobRequest` |
| `ApiError` + `ErrorCode` | `Error` + `ErrorCode` |
| `JobStatus` | `JobStatus` |
| `SourceType` | `SourceType` |

## Upload voce (multipart — implementazione Mobile Dev)

Campi form (vedi `TtsApiConstants.VoiceMultipart`):

| Campo | Obbligatorio |
|-------|--------------|
| `name` | sì |
| `reference_audio` | sì (WAV/MP3/MP4/M4A, max 20 MB) |

## Audio Range

```kotlin
TtsApiConstants.Audio.rangeBytes(0L..1023L) // "bytes=0-1023"
// Header: Range: bytes=0-1023
// Risposta attesa: 206 + Content-Range
```

## Errori

```kotlin
import it.polimar.tts.client.TtsErrorParser
import it.polimar.tts.client.TtsApiException

val apiError = TtsErrorParser.parse(errorBody)
// apiError?.code == ErrorCode.QUEUE_FULL
```

## Integrazione Gradle (app Android)

```kotlin
// settings.gradle.kts
include(":tts-client")
project(":tts-client").projectDir = file("../clients/android/tts-client")

// app/build.gradle.kts
dependencies {
    implementation(project(":tts-client"))
}
```

Per HTTP cleartext verso `http://` in debug: Network Security Config / `usesCleartextTraffic`.

## Package

```
it.polimar.tts.client
  TtsApiConstants, TtsJson, TtsErrorParser, TtsApiException
it.polimar.tts.client.auth
  AuthClient
it.polimar.tts.client.model
  * (tutti i DTO)
```
