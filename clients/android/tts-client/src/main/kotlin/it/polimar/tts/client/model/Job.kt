package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CreateJobRequest(
    @SerialName("voice_id")
    val voiceId: String,
    val text: String,
    val language: String? = null,
)

@Serializable
data class Job(
    val id: String,
    @SerialName("voice_id")
    val voiceId: String,
    val status: JobStatus,
    val language: String,
    val text: String,
    @SerialName("chunk_count")
    val chunkCount: Int,
    val error: String? = null,
    @SerialName("wav_available")
    val wavAvailable: Boolean,
    @SerialName("mp3_available")
    val mp3Available: Boolean,
    @SerialName("device_used")
    val deviceUsed: String? = null,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("started_at")
    val startedAt: String? = null,
    @SerialName("completed_at")
    val completedAt: String? = null,
)
