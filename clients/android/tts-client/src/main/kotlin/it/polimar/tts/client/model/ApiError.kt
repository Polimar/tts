package it.polimar.tts.client.model

import kotlinx.serialization.Serializable

/**
 * Errore FastAPI live (`HTTPException`): corpo `{"detail": "<messaggio>"}`.
 *
 * Gli errori di validazione (422) possono avere `detail` come array — gestire lato client HTTP.
 */
@Serializable
data class ApiError(
    val detail: String,
)
