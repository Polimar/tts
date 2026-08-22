# Client HTTP Kotlin per TTS (Android-compatible)

Modulo libreria **senza UI**: tipi Kotlin + client HTTP per l'API FastAPI del progetto [tts](https://github.com/Polimar/tts).

- Base path: `/api/v1`
- JSON `snake_case` (kotlinx.serialization + `@SerialName`)
- Auth: email/password con **cookie di sessione httpOnly** (OkHttp `CookieJar`)
- Audio job: supporto header `Range` e risposta `206 Partial Content`

> **Nota contratto:** al momento del commit non esiste ancora OpenAPI nel repo (`main` ha solo il README). I tipi seguono il contratto API concordato per il backend su `0.0.0.0:8765`. Quando sarà disponibile `docs/openapi.yaml`, allineare i modelli.

## Requisiti

- JDK 21+ (o 17+ con toolchain Gradle configurata)
- Gradle 8.10+ (wrapper incluso)

Il modulo è **JVM Kotlin** (non richiede Android SDK per compilare) ed è pensato per essere incluso in app Android via Gradle (`implementation(project(...))` o pubblicazione Maven locale).

## Compilazione

```bash
cd clients/android
./gradlew :tts-client:build
```

Solo test:

```bash
./gradlew :tts-client:test
```

## Punto il client al server

Il server FastAPI è in ascolto su `http://<host>:8765` (bind `0.0.0.0:8765`).

| Ambiente | URL tipico |
|----------|------------|
| Emulatore Android | `http://10.0.2.2:8765` |
| Dispositivo fisico (stessa LAN) | `http://192.168.x.x:8765` |
| Sviluppo locale (JVM/desktop) | `http://127.0.0.1:8765` |

```kotlin
import it.polimar.tts.client.TtsApi
import it.polimar.tts.client.TtsClientConfig

val api = TtsApi.create(
    TtsClientConfig(baseUrl = "http://10.0.2.2:8765"),
)
```

## Uso rapido

### Autenticazione

```kotlin
val user = api.auth.register("mario@example.com", "password-sicura")
// oppure
api.auth.login("mario@example.com", "password-sicura")

val me = api.auth.me()
api.auth.logout()
```

I cookie di sessione vengono gestiti automaticamente da `InMemoryCookieJar` (default). Per persistenza tra riavvii, passa un `CookieJar` custom in `TtsClientConfig`.

### Voci

```kotlin
val voices = api.voices.list()

val created = api.voices.create(
    name = "Narratore",
    audioFile = File("/path/reference.wav"),
    referenceText = "Testo di riferimento per la clonazione",
)

api.voices.delete(created.id)
```

Upload: `multipart/form-data` con campi `name`, `reference_text` (opzionale), `audio` (file WAV).

### Job TTS

```kotlin
val job = api.jobs.create(
    text = "Ciao, questo è un test.",
    voiceId = created.id,
)

val status = api.jobs.get(job.id)

// Download completo
val audio = api.jobs.getAudio(job.id)
val wavBytes = audio.bytes()
audio.body.close()

// Download parziale (streaming / resume)
val chunk = api.jobs.getAudio(job.id, range = 0L..65535L)
chunk.byteStream().use { input ->
    // leggi lo stream
}
chunk.body.close()
```

### Errori

Le risposte di errore JSON `{ "code", "detail" }` diventano `TtsApiException`:

```kotlin
try {
    api.auth.login("x", "y")
} catch (e: TtsApiException) {
    println("${e.code}: ${e.message}") // detail in italiano dal server
}
```

## Struttura API coperta

| Risorsa | Metodi |
|---------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Voices | `GET /voices`, `POST /voices`, `DELETE /voices/{id}` |
| Jobs | `GET /jobs`, `POST /jobs`, `GET /jobs/{id}`, `GET /jobs/{id}/audio` |

### Enum job status

`queued` · `running` · `done` · `failed`

## Integrazione in un modulo Android

In `settings.gradle.kts` dell'app:

```kotlin
include(":tts-client")
project(":tts-client").projectDir = file("../clients/android/tts-client")
```

In `app/build.gradle.kts`:

```kotlin
dependencies {
    implementation(project(":tts-client"))
}
```

Per HTTP cleartext verso `http://` in debug, configurare `android:usesCleartextTraffic` o Network Security Config.

## Package principali

- `it.polimar.tts.client.TtsApi` — facade
- `it.polimar.tts.client.AuthClient`
- `it.polimar.tts.client.VoicesClient`
- `it.polimar.tts.client.JobsClient`
- `it.polimar.tts.client.model.*` — DTO serializzabili
