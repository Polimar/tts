package com.polimar.tts.client.network

import com.polimar.tts.client.dto.ApiError
import com.polimar.tts.client.types.ErrorCode
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Converte risposte di errore JSON `{code, detail}` in [TtsApiException].
 * HTTP 409 con `queue_full` → [QueueFullException].
 */
class TtsErrorInterceptor(
    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build(),
) : Interceptor {
    private val errorAdapter = moshi.adapter(ApiError::class.java)

    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        if (response.isSuccessful) {
            return response
        }

        val errorBody = response.peekBody(Long.MAX_VALUE).string()
        if (errorBody.isBlank()) {
            return response
        }

        val apiError = runCatching { errorAdapter.fromJson(errorBody) }.getOrNull()
        if (apiError != null) {
            if (response.code == 409 && apiError.code == ErrorCode.QUEUE_FULL) {
                throw QueueFullException(detail = apiError.detail)
            }
            throw TtsApiException(
                httpCode = response.code,
                code = apiError.code,
                detail = apiError.detail,
            )
        }

        return response
    }
}

open class TtsApiException(
    val httpCode: Int,
    val code: ErrorCode,
    val detail: String,
) : Exception("HTTP $httpCode [$code]: $detail")

/** Coda FIFO piena (max 10 queued + 1 running). */
class QueueFullException(
    detail: String,
) : TtsApiException(
    httpCode = 409,
    code = ErrorCode.QUEUE_FULL,
    detail = detail,
)
