package com.polimar.tts.client.dto

import com.polimar.tts.client.types.JobStatus
import com.squareup.moshi.Json

data class JobCancelled(
    @Json(name = "id")
    val id: String,

    @Json(name = "status")
    val status: JobStatus,

    @Json(name = "queue_position")
    val queuePosition: Int? = null,

    @Json(name = "finished_at")
    val finishedAt: String,
)
