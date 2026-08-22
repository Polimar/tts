package com.polimar.tts.client.dto

import com.polimar.tts.client.types.JobStatus
import com.squareup.moshi.Json

data class JobResponse(
    @Json(name = "id")
    val id: String,

    @Json(name = "status")
    val status: JobStatus,

    @Json(name = "voice_id")
    val voiceId: String,

    @Json(name = "text")
    val text: String? = null,

    @Json(name = "job_type")
    val jobType: String? = null,

    @Json(name = "created_at")
    val createdAt: String? = null,

    @Json(name = "updated_at")
    val updatedAt: String? = null,

    @Json(name = "progress")
    val progress: Double? = null,

    @Json(name = "error_detail")
    val errorDetail: String? = null,
)
