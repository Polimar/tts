package com.polimar.tts.client.dto

import com.squareup.moshi.Json

data class Voice(
    @Json(name = "id")
    val id: String,

    @Json(name = "name")
    val name: String,

    @Json(name = "duration_sec")
    val durationSec: Double? = null,

    @Json(name = "created_at")
    val createdAt: String,
)
