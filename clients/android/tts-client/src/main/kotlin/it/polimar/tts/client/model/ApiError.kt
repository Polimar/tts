package it.polimar.tts.client.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiError(
    val code: String,
    val detail: String,
)
