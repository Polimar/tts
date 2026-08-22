package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Job(
    val id: String,
    val status: JobStatus,
    val text: String,
    @SerialName("voice_id")
    val voiceId: String,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null,
    val error: String? = null,
)

@Serializable
data class CreateJobRequest(
    val text: String,
    @SerialName("voice_id")
    val voiceId: String,
)
