package it.polimar.tts.client

import it.polimar.tts.client.model.ApiError

class TtsApiException(
    val code: String,
    override val message: String,
    val httpStatus: Int,
) : Exception(message) {
    constructor(error: ApiError, httpStatus: Int) : this(
        code = error.code,
        message = error.detail,
        httpStatus = httpStatus,
    )
}
