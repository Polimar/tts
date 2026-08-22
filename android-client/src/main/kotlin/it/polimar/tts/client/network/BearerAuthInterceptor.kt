package it.polimar.tts.client.network

import it.polimar.tts.client.TtsApiConstants
import okhttp3.Interceptor
import okhttp3.Response

/** Aggiunge `Authorization: Bearer <token>` quando il token è impostato. */
class BearerAuthInterceptor(
    private val tokenStore: BearerTokenStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.getToken()
        val request = if (token != null) {
            chain.request().newBuilder()
                .header(
                    TtsApiConstants.HEADER_AUTHORIZATION,
                    TtsApiConstants.BEARER_PREFIX + token,
                )
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
