package it.polimar.tts.client.retrofit

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.Path
import retrofit2.http.Streaming

interface AudioRetrofitApi {
    @Streaming
    @GET("jobs/{job_id}/download/wav")
    @Headers("Accept: audio/wav")
    suspend fun downloadWav(@Path("job_id") jobId: String): Response<ResponseBody>

    @Streaming
    @GET("jobs/{job_id}/download/mp3")
    @Headers("Accept: audio/mpeg")
    suspend fun downloadMp3(@Path("job_id") jobId: String): Response<ResponseBody>
}
