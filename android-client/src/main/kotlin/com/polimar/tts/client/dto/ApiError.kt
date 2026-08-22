package com.polimar.tts.client.dto

import com.squareup.moshi.Json

/**
 * Errore API standard: `{ "code": "...", "detail": "..." }` (messaggi in italiano).
 */
data class ApiError(
    @Json(name = "code")
    val code: String,

    @Json(name = "detail")
    val detail: String,
)
