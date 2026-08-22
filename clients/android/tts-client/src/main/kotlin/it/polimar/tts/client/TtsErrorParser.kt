package it.polimar.tts.client

import it.polimar.tts.client.model.ApiError
import kotlinx.serialization.decodeFromString

object TtsErrorParser {
    fun parse(body: String): ApiError? =
        runCatching { TtsJson.decodeFromString<ApiError>(body) }.getOrNull()
}
