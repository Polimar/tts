package it.polimar.tts.client.retrofit

import it.polimar.tts.client.model.CreateJobRequest
import it.polimar.tts.client.model.Job
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface JobsRetrofitApi {
    @GET("jobs")
    suspend fun listJobs(): List<Job>

    @POST("jobs")
    suspend fun createJob(@Body request: CreateJobRequest): Response<Job>

    @GET("jobs/{job_id}")
    suspend fun getJob(@Path("job_id") jobId: String): Job
}
