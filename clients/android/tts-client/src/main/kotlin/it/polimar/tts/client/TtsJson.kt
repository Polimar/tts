package it.polimar.tts.client

import kotlinx.serialization.json.Json

/** Configurazione JSON condivisa per serializzazione snake_case dell'API v1. */
val TtsJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = false
    isLenient = false
    explicitNulls = false
}
