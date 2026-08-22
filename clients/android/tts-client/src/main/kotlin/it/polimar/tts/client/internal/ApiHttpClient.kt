package it.polimar.tts.client.internal

import it.polimar.tts.client.TtsApiException
import it.polimar.tts.client.TtsClientConfig
import it.polimar.tts.client.apiUrl
import it.polimar.tts.client.applyTo
import it.polimar.tts.client.model.ApiError
import it.polimar.tts.client.toOkHttpTimeouts
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

internal class ApiHttpClient(
    private val config: TtsClientConfig,
    private val json: Json = defaultJson,
    client: OkHttpClient? = null,
) {
    val okhttp: OkHttpClient = client ?: OkHttpClient.Builder()
        .cookieJar(config.cookieJar)
        .apply { config.toOkHttpTimeouts().applyTo(this) }
        .build()

    fun url(path: String): String = config.apiUrl(path)

    fun jsonRequest(
        method: String,
        path: String,
        body: RequestBody? = null,
    ): Request =
        Request.Builder()
            .url(url(path))
            .method(method, body)
            .header("Accept", "application/json")
            .apply {
                if (body != null) {
                    header("Content-Type", "application/json")
                }
            }
            .build()

    inline fun <reified T> jsonBody(value: T): RequestBody =
        json.encodeToString(value).toRequestBody(JSON_MEDIA_TYPE)

    inline fun <reified T> executeJson(request: Request): T {
        okhttp.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw parseError(response.code, raw)
            }
            if (T::class == Unit::class) {
                @Suppress("UNCHECKED_CAST")
                return Unit as T
            }
            if (raw.isBlank()) {
                throw TtsApiException(
                    code = "empty_body",
                    message = "Risposta vuota dal server",
                    httpStatus = response.code,
                )
            }
            return json.decodeFromString(raw)
        }
    }

    fun executeRaw(request: Request): Response {
        val response = okhttp.newCall(request).execute()
        if (!response.isSuccessful) {
            val raw = response.body?.string().orEmpty()
            response.close()
            throw parseError(response.code, raw)
        }
        return response
    }

    private fun parseError(httpStatus: Int, raw: String): TtsApiException {
        if (raw.isNotBlank()) {
            runCatching { json.decodeFromString<ApiError>(raw) }
                .onSuccess { return TtsApiException(it, httpStatus) }
        }
        return TtsApiException(
            code = "http_$httpStatus",
            message = raw.ifBlank { "Errore HTTP $httpStatus" },
            httpStatus = httpStatus,
        )
    }

    companion object {
        val JSON_MEDIA_TYPE = "application/json".toMediaType()

        val defaultJson = Json {
            ignoreUnknownKeys = true
            encodeDefaults = false
            isLenient = false
        }
    }
}
