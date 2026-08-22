package it.polimar.tts.client

import it.polimar.tts.client.auth.AuthClient
import it.polimar.tts.client.network.BearerAuthInterceptor
import it.polimar.tts.client.network.BearerTokenStore
import it.polimar.tts.client.network.TtsErrorInterceptor
import it.polimar.tts.client.retrofit.AudioRetrofitApi
import it.polimar.tts.client.retrofit.AuthRetrofitApi
import it.polimar.tts.client.retrofit.JobsRetrofitApi
import it.polimar.tts.client.retrofit.RetrofitAuthClient
import it.polimar.tts.client.retrofit.VoicesRetrofitApi
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Factory Retrofit/OkHttp per il backend live (`tts_server`, PR #10).
 * Tipi da `:tts-client` senza mapping aggiuntivo.
 */
class TtsRetrofitClient private constructor(
    val authClient: AuthClient,
    val voicesApi: VoicesRetrofitApi,
    val jobsApi: JobsRetrofitApi,
    val audioApi: AudioRetrofitApi,
    val tokenStore: BearerTokenStore,
    val okHttpClient: OkHttpClient,
) {
    class Builder {
        private var baseUrl: String = DEFAULT_EMULATOR_BASE_URL
        private var tokenStore: BearerTokenStore = BearerTokenStore()
        private var debugLogging: Boolean = false
        private var connectTimeoutSeconds: Long = 30
        private var readTimeoutSeconds: Long = 120
        private var writeTimeoutSeconds: Long = 120

        fun baseUrl(url: String): Builder {
            baseUrl = normalizeBaseUrl(url)
            return this
        }

        fun tokenStore(store: BearerTokenStore): Builder {
            tokenStore = store
            return this
        }

        fun debugLogging(enabled: Boolean): Builder {
            debugLogging = enabled
            return this
        }

        fun connectTimeoutSeconds(seconds: Long): Builder {
            connectTimeoutSeconds = seconds
            return this
        }

        fun readTimeoutSeconds(seconds: Long): Builder {
            readTimeoutSeconds = seconds
            return this
        }

        fun writeTimeoutSeconds(seconds: Long): Builder {
            writeTimeoutSeconds = seconds
            return this
        }

        fun build(): TtsRetrofitClient {
            val clientBuilder = OkHttpClient.Builder()
                .addInterceptor(BearerAuthInterceptor(tokenStore))
                .addInterceptor(TtsErrorInterceptor())
                .connectTimeout(connectTimeoutSeconds, TimeUnit.SECONDS)
                .readTimeout(readTimeoutSeconds, TimeUnit.SECONDS)
                .writeTimeout(writeTimeoutSeconds, TimeUnit.SECONDS)

            if (debugLogging) {
                clientBuilder.addInterceptor(
                    HttpLoggingInterceptor().apply {
                        level = HttpLoggingInterceptor.Level.BODY
                    },
                )
            }

            val okHttpClient = clientBuilder.build()

            val contentType = "application/json".toMediaType()
            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(TtsJson.asConverterFactory(contentType))
                .build()

            val authRetrofitApi = retrofit.create(AuthRetrofitApi::class.java)

            return TtsRetrofitClient(
                authClient = RetrofitAuthClient(authRetrofitApi, tokenStore),
                voicesApi = retrofit.create(VoicesRetrofitApi::class.java),
                jobsApi = retrofit.create(JobsRetrofitApi::class.java),
                audioApi = retrofit.create(AudioRetrofitApi::class.java),
                tokenStore = tokenStore,
                okHttpClient = okHttpClient,
            )
        }
    }

    companion object {
        /** Emulatore Android → workstation `10.0.2.2:8765` (nessun prefisso `/api/v1`). */
        const val DEFAULT_EMULATOR_BASE_URL = "http://10.0.2.2:8765/"

        fun builder(): Builder = Builder()

        private fun normalizeBaseUrl(url: String): String {
            val normalized = TtsApiConstants.baseUrl(url.trim())
            return if (normalized.endsWith("/")) normalized else "$normalized/"
        }
    }
}
