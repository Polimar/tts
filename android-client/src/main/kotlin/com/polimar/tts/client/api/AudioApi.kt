package com.polimar.tts.client.api

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Headers
import retrofit2.http.Path
import retrofit2.http.Streaming

/**
 * Download/stream audio WAV autenticato con supporto HTTP Range (`/api/v1/jobs/{job_id}/audio`).
 */
interface AudioApi {
    @Streaming
    @GET("jobs/{job_id}/audio")
    @Headers("Accept: audio/wav")
    suspend fun getJobAudio(
        @Path("job_id") jobId: String,
        @Header("Range") range: String? = null,
    ): Response<ResponseBody>
}
