package it.polimar.tts.client

/**
 * Costanti allineate al backend live (`tts_server`, PR #10).
 * Nessun prefisso `/api/v1` — le route sono alla root del server.
 */
object TtsApiConstants {
    const val DEFAULT_BASE_URL = "http://127.0.0.1:8765"

    const val HEADER_AUTHORIZATION = "Authorization"
    const val HEADER_X_API_KEY = "X-API-Key"

    fun bearerToken(token: String): String = "Bearer $token"

    fun baseUrl(host: String = DEFAULT_BASE_URL): String = host.trimEnd('/')

    object Paths {
        const val HEALTH = "/health"
        const val SYSTEM_DEVICE = "/system/device"

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
}
