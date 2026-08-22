package it.polimar.tts.client

import it.polimar.tts.client.internal.ApiHttpClient
import okhttp3.OkHttpClient

/**
 * Facade HTTP per l'API TTS (`/api/v1`).
 *
 * Autenticazione basata su cookie di sessione httpOnly (OkHttp [okhttp3.CookieJar]).
 */
class TtsApi private constructor(
    private val http: ApiHttpClient,
) {
    val auth: AuthClient = AuthClient(http)
    val voices: VoicesClient = VoicesClient(http)
    val jobs: JobsClient = JobsClient(http)

    fun cookieJar(): okhttp3.CookieJar = http.okhttp.cookieJar

    fun close() {
        http.okhttp.dispatcher.executorService.shutdown()
        http.okhttp.connectionPool.evictAll()
    }

    companion object {
        fun create(config: TtsClientConfig = TtsClientConfig()): TtsApi =
            create(config, client = null)

        fun create(config: TtsClientConfig, client: OkHttpClient?): TtsApi {
            val http = ApiHttpClient(config = config, client = client)
            return TtsApi(http)
        }

        fun create(baseUrl: String): TtsApi =
            create(TtsClientConfig(baseUrl = baseUrl))
    }
}
