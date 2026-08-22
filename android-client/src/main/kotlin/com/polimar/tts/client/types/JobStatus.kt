package com.polimar.tts.client.types

import com.squareup.moshi.Json

/**
 * Stato di un job TTS sul backend (`queued|running|done|failed`).
 */
enum class JobStatus {
    @Json(name = "queued")
    QUEUED,

    @Json(name = "running")
    RUNNING,

    @Json(name = "done")
    DONE,

    @Json(name = "failed")
    FAILED,
}
