package it.polimar.tts.client.model

import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val user: User,
)
