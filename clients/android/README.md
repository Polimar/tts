# Client Kotlin per API TTS (Android-compatible)

Modulo libreria **solo tipi**: DTO, enum, errori e contratto `AuthClient` allineati al **backend live** ([PR #10](https://github.com/Polimar/tts/pull/10) — `tts_server` su `:8765`).

**Mobile Dev** implementa Retrofit/OkHttp. **Questo modulo** fornisce tipi Kotlin 1:1 — nessun mapping sorpresa.

> ⚠️ **Non usare PR #3** (`openapi.yaml` draft): auth, path e campi sono diversi.

## Source of truth

| Risorsa | PR |
|---------|-----|
| `tts_server/schemas.py` | [#10](https://github.com/Polimar/tts/pull/10) |
| `tests/test_api.py` | [#10](https://github.com/Polimar/tts/pull/10) |

## Contratto live (hard lock)

| Aspetto | Valore |
|---------|--------|
| Base URL | `http://<host>:8765` — **nessun** `/api/v1` |
| Auth login | `POST /auth/login` — `{username, password}` |
| Auth register | `POST /auth/register` + header **`X-API-Key`** |
| Sessione | **`Authorization: Bearer <token>`** (non cookie `tts_session`) |
| `GET /auth/me` | restituisce **`User`** diretto (non `AuthResponse`) |
| Voci multipart | `name`, `ref_text`, `language`, `audio` |
| Job create | `{voice_id, text, language?}` (default `"Italian"`) |
| Job status | `queued` \| `running` \| **`completed`** \| `failed` (no `cancelled`) |
| Download audio | `GET /jobs/{id}/download/wav` o `/download/mp3` |
| Errori | `{"detail": "<string>"}` (FastAPI — **no** `code`) |

## Compilazione

```bash
cd clients/android
./gradlew :tts-client:build
```

## Uso tipi

```kotlin
import it.polimar.tts.client.TtsApiConstants
import it.polimar.tts.client.TtsJson
import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.CreateJobRequest

val baseUrl = TtsApiConstants.baseUrl("http://10.0.2.2:8765")
val authHeader = TtsApiConstants.bearerToken(token)

val job = TtsJson.decodeFromString<Job>(responseBody)
```

## AuthClient (interfaccia)

```kotlin
interface AuthClient {
    suspend fun register(apiKey: String, request: RegisterRequest): AuthResponse  // 201
    suspend fun login(request: LoginRequest): AuthResponse                        // 200
    suspend fun logout()                                                          // 204
    suspend fun me(): User                                                          // 200
}
```

## Modelli principali

| Kotlin | Backend Python |
|--------|----------------|
| `User` | `UserOut` |
| `AuthResponse` | `AuthResponse` (`token`, `expires_at`, `user`) |
| `Voice` / `VoiceList` | `VoiceOut` / `list[VoiceOut]` |
| `Job` / `JobList` | `JobOut` / `list[JobOut]` |
| `CreateJobRequest` | `JobCreateRequest` |
| `JobStatus` | `Literal["queued","running","completed","failed"]` |
| `ApiError` | `HTTPException` → `{"detail": "..."}` |
| `HealthResponse` | `HealthOut` |
| `DeviceInfo` | `DeviceInfoOut` |

## Multipart voce

```kotlin
TtsApiConstants.VoiceMultipart.FIELD_NAME       // "name"
TtsApiConstants.VoiceMultipart.FIELD_REF_TEXT   // "ref_text"
TtsApiConstants.VoiceMultipart.FIELD_LANGUAGE   // "language"
TtsApiConstants.VoiceMultipart.FIELD_AUDIO      // "audio"
```

## Download audio

```kotlin
TtsApiConstants.Paths.jobDownloadWav(jobId)  // /jobs/{id}/download/wav
TtsApiConstants.Paths.jobDownloadMp3(jobId)  // /jobs/{id}/download/mp3
```

## Integrazione Gradle

```kotlin
include(":tts-client")
project(":tts-client").projectDir = file("../clients/android/tts-client")
```
