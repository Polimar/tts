package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CreateJobRequest(
    @SerialName("voice_id")
    val voiceId: String,
    @SerialName("source_type")
    val sourceType: SourceType,
    val text: String? = null,
    @SerialName("chapter_id")
    val chapterId: String? = null,
    val title: String? = null,
)

@Serializable
data class Job(
    val id: String,
    @SerialName("voice_id")
    val voiceId: String,
    val status: JobStatus,
    @SerialName("source_type")
    val sourceType: SourceType,
    val title: String? = null,
    val progress: Float,
    @SerialName("queue_position")
    val queuePosition: Int? = null,
    @SerialName("error_code")
    val errorCode: ErrorCode? = null,
    @SerialName("error_detail")
    val errorDetail: String? = null,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("started_at")
    val startedAt: String? = null,
    @SerialName("finished_at")
    val finishedAt: String? = null,
)

/** Dettaglio job (`JobDetail` in openapi.yaml): include [audioReady]. */
@Serializable
data class JobDetail(
    val id: String,
    @SerialName("voice_id")
    val voiceId: String,
    val status: JobStatus,
    @SerialName("source_type")
    val sourceType: SourceType,
    val title: String? = null,
    val progress: Float,
    @SerialName("queue_position")
    val queuePosition: Int? = null,
    @SerialName("error_code")
    val errorCode: ErrorCode? = null,
    @SerialName("error_detail")
    val errorDetail: String? = null,
    @SerialName("audio_ready")
    val audioReady: Boolean,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("started_at")
    val startedAt: String? = null,
    @SerialName("finished_at")
    val finishedAt: String? = null,
)

@Serializable
data class JobListResponse(
    val items: List<Job>,
    val total: Int,
    val limit: Int,
    val offset: Int,
)

@Serializable
data class JobCancelled(
    val id: String,
    val status: JobStatus,
    @SerialName("queue_position")
    val queuePosition: Int? = null,
    @SerialName("finished_at")
    val finishedAt: String,
)
