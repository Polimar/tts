package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Codici errore stabili (`components/schemas/ErrorCode` in openapi.yaml). */
@Serializable
enum class ErrorCode {
    @SerialName("not_authenticated")
    NOT_AUTHENTICATED,

    @SerialName("invalid_credentials")
    INVALID_CREDENTIALS,

    @SerialName("forbidden")
    FORBIDDEN,

    @SerialName("voice_not_found")
    VOICE_NOT_FOUND,

    @SerialName("job_not_found")
    JOB_NOT_FOUND,

    @SerialName("chapter_not_found")
    CHAPTER_NOT_FOUND,

    @SerialName("audio_not_ready")
    AUDIO_NOT_READY,

    @SerialName("email_already_exists")
    EMAIL_ALREADY_EXISTS,

    @SerialName("queue_full")
    QUEUE_FULL,

    @SerialName("voice_in_use")
    VOICE_IN_USE,

    @SerialName("job_not_cancellable")
    JOB_NOT_CANCELLABLE,

    @SerialName("validation_error")
    VALIDATION_ERROR,

    @SerialName("invalid_audio_type")
    INVALID_AUDIO_TYPE,

    @SerialName("file_too_large")
    FILE_TOO_LARGE,

    @SerialName("audio_too_short")
    AUDIO_TOO_SHORT,

    @SerialName("audio_too_long")
    AUDIO_TOO_LONG,

    @SerialName("synthesis_failed")
    SYNTHESIS_FAILED,

    @SerialName("interrupted")
    INTERRUPTED,

    @SerialName("internal_error")
    INTERNAL_ERROR,
}
