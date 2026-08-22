package it.polimar.tts.client

import it.polimar.tts.client.model.ApiError

/**
 * Eccezione per risposte HTTP 4xx/5xx.
 *
 * Il backend live (PR #10) espone `{"detail": "..."}` — non `{code, detail}`.
 */
class TtsApiException(
    val apiError: ApiError,
    val httpStatus: Int,
) : Exception(apiError.detail) {
    val detail: String get() = apiError.detail
}
