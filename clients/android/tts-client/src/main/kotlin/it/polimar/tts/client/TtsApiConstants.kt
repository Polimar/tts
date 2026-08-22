package it.polimar.tts.client

/**
 * Costanti condivise allineate a `openapi.yaml` (PR #3 / Architect).
 */
object TtsApiConstants {
    const val SESSION_COOKIE_NAME = "tts_session"

    const val API_PREFIX = "/api/v1"

    const val DEFAULT_HOST = "http://127.0.0.1:8765"

    fun baseUrl(host: String = DEFAULT_HOST): String =
        host.trimEnd('/') + API_PREFIX

    object Paths {
        const val AUTH_REGISTER = "/auth/register"
        const val AUTH_LOGIN = "/auth/login"
        const val AUTH_LOGOUT = "/auth/logout"
        const val AUTH_ME = "/auth/me"

        const val VOICES = "/voices"
        fun voice(voiceId: String) = "/voices/$voiceId"

        const val JOBS = "/jobs"
        fun job(jobId: String) = "/jobs/$jobId"
        fun jobCancel(jobId: String) = "/jobs/$jobId/cancel"
        fun jobAudio(jobId: String) = "/jobs/$jobId/audio"
    }

    object VoiceMultipart {
        const val FIELD_NAME = "name"
        const val FIELD_REFERENCE_AUDIO = "reference_audio"
    }

    object Audio {
        const val MIME_WAV = "audio/wav"
        const val HEADER_RANGE = "Range"
        const val HEADER_ACCEPT_RANGES = "Accept-Ranges"
        const val HEADER_CONTENT_RANGE = "Content-Range"

        fun rangeBytes(start: Long, end: Long): String = "bytes=$start-$end"

        fun rangeBytes(range: LongRange): String = rangeBytes(range.first, range.last)
    }

    /** Massimo job in coda FIFO (oltre → HTTP 409 `queue_full`). */
    const val MAX_QUEUED_JOBS = 10

    /** Slot GPU: al massimo un job `running`. */
    const val MAX_RUNNING_JOBS = 1
}
