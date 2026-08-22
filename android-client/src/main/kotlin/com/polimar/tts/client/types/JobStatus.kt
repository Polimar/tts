package com.polimar.tts.client.types

import com.squareup.moshi.Json

/** Stato job TTS (`queued|running|done|failed|cancelled`). */
enum class JobStatus {
    @Json(name = "queued")
    QUEUED,

    @Json(name = "running")
    RUNNING,

    @Json(name = "done")
    DONE,

    @Json(name = "failed")
    FAILED,

    @Json(name = "cancelled")
    CANCELLED,
}
