package com.polimar.tts.client.network

import com.polimar.tts.client.dto.ApiError
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Converte risposte di errore JSON `{code, detail}` in [TtsApiException].
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
            throw TtsApiException(
                httpCode = response.code,
                code = apiError.code,
                detail = apiError.detail,
            )
        }

        return response
    }
}

class TtsApiException(
    val httpCode: Int,
    val code: String,
    val detail: String,
) : Exception("HTTP $httpCode [$code]: $detail")
