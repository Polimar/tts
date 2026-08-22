package com.polimar.tts.client.dto

import com.polimar.tts.client.types.ErrorCode
import com.polimar.tts.client.types.JobStatus
import com.polimar.tts.client.types.SourceType
import com.squareup.moshi.Json

data class JobDetail(
    @Json(name = "id")
    val id: String,

    @Json(name = "voice_id")
    val voiceId: String,

    @Json(name = "status")
    val status: JobStatus,

    @Json(name = "source_type")
    val sourceType: SourceType,

    @Json(name = "title")
    val title: String? = null,

    @Json(name = "progress")
    val progress: Float,

    @Json(name = "queue_position")
    val queuePosition: Int? = null,

    @Json(name = "error_code")
    val errorCode: ErrorCode? = null,

    @Json(name = "error_detail")
    val errorDetail: String? = null,

    @Json(name = "created_at")
    val createdAt: String,

    @Json(name = "started_at")
    val startedAt: String? = null,

    @Json(name = "finished_at")
    val finishedAt: String? = null,

    @Json(name = "audio_ready")
    val audioReady: Boolean,
)
