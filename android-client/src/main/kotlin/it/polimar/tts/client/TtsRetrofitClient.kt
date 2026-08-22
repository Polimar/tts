package it.polimar.tts.client

import it.polimar.tts.client.auth.AuthClient
import it.polimar.tts.client.network.PersistentCookieJar
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
 * Factory Retrofit/OkHttp per `/api/v1`. Tipi da `:tts-client` senza mapping aggiuntivo.
 */
class TtsRetrofitClient private constructor(
    val authClient: AuthClient,
    val voicesApi: VoicesRetrofitApi,
    val jobsApi: JobsRetrofitApi,
    val audioApi: AudioRetrofitApi,
    val cookieJar: PersistentCookieJar,
    val okHttpClient: OkHttpClient,
) {
    class Builder {
        private var baseUrl: String = DEFAULT_EMULATOR_BASE_URL
        private var cookieJar: PersistentCookieJar = PersistentCookieJar()
        private var debugLogging: Boolean = false
        private var connectTimeoutSeconds: Long = 30
        private var readTimeoutSeconds: Long = 120
        private var writeTimeoutSeconds: Long = 120

        fun baseUrl(url: String): Builder {
            baseUrl = normalizeBaseUrl(url)
            return this
        }

        fun cookieJar(jar: PersistentCookieJar): Builder {
            cookieJar = jar
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
                .cookieJar(cookieJar)
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
                authClient = RetrofitAuthClient(authRetrofitApi),
                voicesApi = retrofit.create(VoicesRetrofitApi::class.java),
                jobsApi = retrofit.create(JobsRetrofitApi::class.java),
                audioApi = retrofit.create(AudioRetrofitApi::class.java),
                cookieJar = cookieJar,
                okHttpClient = okHttpClient,
            )
        }
    }

    companion object {
        /** Emulatore Android → workstation host `10.0.2.2:8765`. */
        const val DEFAULT_EMULATOR_BASE_URL = "http://10.0.2.2:8765/api/v1/"

        fun builder(): Builder = Builder()

        private fun normalizeBaseUrl(url: String): String {
            val trimmed = url.trim().trimEnd('/')
            val withApi = if (trimmed.endsWith(TtsApiConstants.API_PREFIX)) {
                trimmed
            } else {
                TtsApiConstants.baseUrl(trimmed)
            }
            return "$withApi/"
        }
    }
}
