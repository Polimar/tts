package it.polimar.tts.client.retrofit

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Headers
import retrofit2.http.Path
import retrofit2.http.Streaming

interface AudioRetrofitApi {
    @Streaming
    @GET("jobs/{job_id}/audio")
    @Headers("Accept: audio/wav")
    suspend fun getJobAudio(
        @Path("job_id") jobId: String,
        @Header("Range") range: String? = null,
    ): Response<ResponseBody>
}
