package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val token: String,
    @SerialName("expires_at")
    val expiresAt: String,
    val user: User,
)
