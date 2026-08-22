package com.polimar.tts.client.dto

import com.squareup.moshi.Json

data class AuthResponse(
    @Json(name = "user")
    val user: User,
)
