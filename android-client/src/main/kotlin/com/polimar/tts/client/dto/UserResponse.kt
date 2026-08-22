package com.polimar.tts.client.dto

import com.squareup.moshi.Json

data class UserResponse(
    @Json(name = "id")
    val id: String,

    @Json(name = "email")
    val email: String,

    @Json(name = "created_at")
    val createdAt: String? = null,
)
