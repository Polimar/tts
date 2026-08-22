package com.polimar.tts.client.api

import com.polimar.tts.client.dto.VoiceResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

/**
 * Gestione voci clonate (`/api/v1/voices`).
 */
interface VoicesApi {
    @GET("voices")
    suspend fun listVoices(): List<VoiceResponse>

    @Multipart
    @POST("voices")
    suspend fun createVoice(
        @Part("name") name: RequestBody,
        @Part audio: MultipartBody.Part,
    ): VoiceResponse

    @DELETE("voices/{id}")
    suspend fun deleteVoice(@Path("id") voiceId: String)
}
