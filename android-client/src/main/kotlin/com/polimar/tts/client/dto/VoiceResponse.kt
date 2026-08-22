package com.polimar.tts.client.dto

import com.polimar.tts.client.types.VoiceStatus
import com.squareup.moshi.Json

data class VoiceResponse(
    @Json(name = "id")
    val id: String,

    @Json(name = "name")
    val name: String,

    @Json(name = "status")
    val status: VoiceStatus? = null,

    @Json(name = "duration_seconds")
    val durationSeconds: Double? = null,

    @Json(name = "created_at")
    val createdAt: String? = null,

    @Json(name = "updated_at")
    val updatedAt: String? = null,
)
