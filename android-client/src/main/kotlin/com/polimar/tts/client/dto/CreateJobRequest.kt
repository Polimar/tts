package com.polimar.tts.client.dto

import com.squareup.moshi.Json

data class CreateJobRequest(
    @Json(name = "voice_id")
    val voiceId: String,

    @Json(name = "text")
    val text: String,

    @Json(name = "job_type")
    val jobType: String? = "text",

    @Json(name = "speed")
    val speed: Double? = null,
)
