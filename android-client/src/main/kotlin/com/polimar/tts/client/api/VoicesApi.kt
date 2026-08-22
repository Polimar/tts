package com.polimar.tts.client.api

import com.polimar.tts.client.dto.Voice
import com.polimar.tts.client.dto.VoiceListResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

/**
 * Gestione voci clonate dell'utente (`/api/v1/voices`).
 */
interface VoicesApi {
    @GET("voices")
    suspend fun listVoices(): VoiceListResponse

    @Multipart
    @POST("voices")
    suspend fun createVoice(
        @Part("name") name: RequestBody,
        @Part referenceAudio: MultipartBody.Part,
    ): Response<Voice>

    @GET("voices/{voice_id}")
    suspend fun getVoice(@Path("voice_id") voiceId: String): Voice

    @DELETE("voices/{voice_id}")
    suspend fun deleteVoice(@Path("voice_id") voiceId: String): Response<Unit>
}
