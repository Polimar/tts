package it.polimar.tts.client.model

import kotlinx.serialization.Serializable

@Serializable
data class RegisterRequest(
    val username: String,
    val password: String,
)

@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
)
