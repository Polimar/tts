package it.polimar.tts.client.model

import kotlinx.serialization.Serializable

/** Errore FastAPI standard: `{ "detail": "..." }`. */
@Serializable
data class ApiError(
    val detail: String,
)
