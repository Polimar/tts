package it.polimar.tts.client.retrofit

import it.polimar.tts.client.model.Voice
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

interface VoicesRetrofitApi {
    @GET("voices")
    suspend fun listVoices(): List<Voice>

    @Multipart
    @POST("voices")
    suspend fun createVoice(
        @Part("name") name: RequestBody,
        @Part("ref_text") refText: RequestBody,
        @Part("language") language: RequestBody,
        @Part audio: MultipartBody.Part,
    ): Response<Voice>

    @GET("voices/{voice_id}")
    suspend fun getVoice(@Path("voice_id") voiceId: String): Voice

    @DELETE("voices/{voice_id}")
    suspend fun deleteVoice(@Path("voice_id") voiceId: String): Response<Unit>
}
