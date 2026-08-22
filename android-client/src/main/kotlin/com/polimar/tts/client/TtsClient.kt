package com.polimar.tts.client

import com.polimar.tts.client.api.AudioApi
import com.polimar.tts.client.api.AuthApi
import com.polimar.tts.client.api.JobsApi
import com.polimar.tts.client.api.VoicesApi
import com.polimar.tts.client.network.PersistentCookieJar
import com.polimar.tts.client.network.TtsErrorInterceptor
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Factory per il client Retrofit/OkHttp del backend TTS FastAPI (`/api/v1`).
 */
class TtsClient private constructor(
    val authApi: AuthApi,
    val voicesApi: VoicesApi,
    val jobsApi: JobsApi,
    val audioApi: AudioApi,
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

        fun build(): TtsClient {
            val moshi = Moshi.Builder()
                .add(KotlinJsonAdapterFactory())
                .build()

            val clientBuilder = OkHttpClient.Builder()
                .cookieJar(cookieJar)
                .addInterceptor(TtsErrorInterceptor(moshi))
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

            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()

            return TtsClient(
                authApi = retrofit.create(AuthApi::class.java),
                voicesApi = retrofit.create(VoicesApi::class.java),
                jobsApi = retrofit.create(JobsApi::class.java),
                audioApi = retrofit.create(AudioApi::class.java),
                cookieJar = cookieJar,
                okHttpClient = okHttpClient,
            )
        }
    }

    companion object {
        /** Default per emulatore Android: host loopback del workstation (`10.0.2.2:8765`). */
        const val DEFAULT_EMULATOR_BASE_URL = "http://10.0.2.2:8765/api/v1/"

        fun builder(): Builder = Builder()

        private fun normalizeBaseUrl(url: String): String {
            val trimmed = url.trim()
            val withTrailingSlash = if (trimmed.endsWith("/")) trimmed else "$trimmed/"
            return if (withTrailingSlash.contains("/api/v1/")) {
                withTrailingSlash
            } else {
                "${withTrailingSlash}api/v1/"
            }
        }
    }
}
