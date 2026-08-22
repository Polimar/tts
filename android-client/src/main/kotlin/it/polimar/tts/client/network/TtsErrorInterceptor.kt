package it.polimar.tts.client.network

import it.polimar.tts.client.TtsApiException
import it.polimar.tts.client.TtsErrorParser
import okhttp3.Interceptor
import okhttp3.Response

/** Converte risposte di errore FastAPI `{detail}` in [TtsApiException]. */
class TtsErrorInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        if (response.isSuccessful) {
            return response
        }

        val errorBody = response.peekBody(Long.MAX_VALUE).string()
        val apiError = TtsErrorParser.parse(errorBody)
        if (apiError != null) {
            throw TtsApiException(apiError, response.code)
        }

        return response
    }
}
