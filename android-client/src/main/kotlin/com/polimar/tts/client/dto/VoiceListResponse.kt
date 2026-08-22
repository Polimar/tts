package com.polimar.tts.client.dto

import com.squareup.moshi.Json

data class VoiceListResponse(
    @Json(name = "items")
    val items: List<Voice>,

    @Json(name = "total")
    val total: Int,
)
