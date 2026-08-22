package it.polimar.tts.client

import it.polimar.tts.client.model.ApiError
import it.polimar.tts.client.model.ErrorCode

/**
 * Eccezione per risposte HTTP 4xx/5xx con corpo `{code, detail}`.
 *
 * Mobile Dev può mappare [apiError] da Retrofit/OkHttp usando [TtsJson].
 */
class TtsApiException(
    val apiError: ApiError,
    val httpStatus: Int,
) : Exception(apiError.detail) {
    val code: ErrorCode get() = apiError.code
}
