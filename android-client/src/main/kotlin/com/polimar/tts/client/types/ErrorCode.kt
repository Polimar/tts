package com.polimar.tts.client.types

import com.squareup.moshi.Json

/** Codici errore stabili restituiti dal backend in `{code, detail}`. */
enum class ErrorCode {
    @Json(name = "not_authenticated")
    NOT_AUTHENTICATED,

    @Json(name = "invalid_credentials")
    INVALID_CREDENTIALS,

    @Json(name = "forbidden")
    FORBIDDEN,

    @Json(name = "voice_not_found")
    VOICE_NOT_FOUND,

    @Json(name = "job_not_found")
    JOB_NOT_FOUND,

    @Json(name = "chapter_not_found")
    CHAPTER_NOT_FOUND,

    @Json(name = "audio_not_ready")
    AUDIO_NOT_READY,

    @Json(name = "email_already_exists")
    EMAIL_ALREADY_EXISTS,

    @Json(name = "queue_full")
    QUEUE_FULL,

    @Json(name = "voice_in_use")
    VOICE_IN_USE,

    @Json(name = "job_not_cancellable")
    JOB_NOT_CANCELLABLE,

    @Json(name = "validation_error")
    VALIDATION_ERROR,

    @Json(name = "invalid_audio_type")
    INVALID_AUDIO_TYPE,

    @Json(name = "file_too_large")
    FILE_TOO_LARGE,

    @Json(name = "audio_too_short")
    AUDIO_TOO_SHORT,

    @Json(name = "audio_too_long")
    AUDIO_TOO_LONG,

    @Json(name = "synthesis_failed")
    SYNTHESIS_FAILED,

    @Json(name = "interrupted")
    INTERRUPTED,

    @Json(name = "internal_error")
    INTERNAL_ERROR,
}
