package it.polimar.tts.client

import it.polimar.tts.client.model.ApiError

/** Eccezione per risposte HTTP 4xx/5xx con corpo FastAPI `{detail}`. */
class TtsApiException(
    val apiError: ApiError,
    val httpStatus: Int,
) : Exception(apiError.detail)
