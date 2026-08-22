package it.polimar.tts.client.model

import kotlinx.serialization.Serializable

/** Errore API (`components/schemas/Error`): `{ "code", "detail" }` con messaggio in italiano. */
@Serializable
data class ApiError(
    val code: ErrorCode,
    val detail: String,
)
