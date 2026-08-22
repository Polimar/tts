package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class JobStatus {
    @SerialName("queued")
    QUEUED,

    @SerialName("running")
    RUNNING,

    @SerialName("completed")
    COMPLETED,

    @SerialName("failed")
    FAILED,
}
