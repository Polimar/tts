package it.polimar.tts.client

/**
 * Costanti allineate al backend live (PR #10 `tts_server`).
 */
object TtsApiConstants {
    const val HEADER_AUTHORIZATION = "Authorization"
    const val HEADER_API_KEY = "X-API-Key"
    const val BEARER_PREFIX = "Bearer "

    const val DEFAULT_HOST = "http://127.0.0.1:8765"
    const val DEFAULT_EMULATOR_HOST = "http://10.0.2.2:8765"

    fun baseUrl(host: String = DEFAULT_HOST): String = host.trimEnd('/')

    object Paths {
        const val AUTH_REGISTER = "/auth/register"
        const val AUTH_LOGIN = "/auth/login"
        const val AUTH_LOGOUT = "/auth/logout"
        const val AUTH_ME = "/auth/me"

        const val VOICES = "/voices"
        fun voice(voiceId: String) = "/voices/$voiceId"

        const val JOBS = "/jobs"
        fun job(jobId: String) = "/jobs/$jobId"
        fun jobDownloadWav(jobId: String) = "/jobs/$jobId/download/wav"
        fun jobDownloadMp3(jobId: String) = "/jobs/$jobId/download/mp3"
    }

    object VoiceMultipart {
        const val FIELD_NAME = "name"
        const val FIELD_REF_TEXT = "ref_text"
        const val FIELD_LANGUAGE = "language"
        const val FIELD_AUDIO = "audio"
    }

    object Audio {
        const val MIME_WAV = "audio/wav"
        const val MIME_MP3 = "audio/mpeg"
    }
}
