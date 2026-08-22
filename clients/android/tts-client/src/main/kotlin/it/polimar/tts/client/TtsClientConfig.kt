package it.polimar.tts.client

import okhttp3.CookieJar
import java.util.concurrent.TimeUnit

data class TtsClientConfig(
    val baseUrl: String = DEFAULT_BASE_URL,
    val connectTimeoutSeconds: Long = 30,
    val readTimeoutSeconds: Long = 120,
    val writeTimeoutSeconds: Long = 120,
    val cookieJar: CookieJar = InMemoryCookieJar(),
) {
    init {
        require(baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
            "baseUrl deve iniziare con http:// o https://"
        }
    }

    companion object {
        const val DEFAULT_BASE_URL = "http://127.0.0.1:8765"
        const val API_PREFIX = "/api/v1"
    }
}

internal fun TtsClientConfig.normalizedBaseUrl(): String =
    baseUrl.trimEnd('/')

internal fun TtsClientConfig.apiUrl(path: String): String {
    val normalizedPath = if (path.startsWith('/')) path else "/$path"
    return "${normalizedBaseUrl()}${TtsClientConfig.API_PREFIX}$normalizedPath"
}

internal fun TtsClientConfig.toOkHttpTimeouts(): Triple<Long, Long, Long> =
    Triple(connectTimeoutSeconds, readTimeoutSeconds, writeTimeoutSeconds)

internal fun Triple<Long, Long, Long>.applyTo(builder: okhttp3.OkHttpClient.Builder) {
    val (connect, read, write) = this
    builder
        .connectTimeout(connect, TimeUnit.SECONDS)
        .readTimeout(read, TimeUnit.SECONDS)
        .writeTimeout(write, TimeUnit.SECONDS)
}
