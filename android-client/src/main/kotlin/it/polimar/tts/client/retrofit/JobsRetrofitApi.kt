package it.polimar.tts.client.retrofit

import it.polimar.tts.client.model.CreateJobRequest
import it.polimar.tts.client.model.Job
import it.polimar.tts.client.model.JobCancelled
import it.polimar.tts.client.model.JobDetail
import it.polimar.tts.client.model.JobListResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.QueryMap

interface JobsRetrofitApi {
    @GET("jobs")
    suspend fun listJobs(@QueryMap params: Map<String, String>): JobListResponse

    @POST("jobs")
    suspend fun createJob(@Body request: CreateJobRequest): Response<Job>

    @GET("jobs/{job_id}")
    suspend fun getJob(@Path("job_id") jobId: String): JobDetail

    @POST("jobs/{job_id}/cancel")
    suspend fun cancelJob(@Path("job_id") jobId: String): JobCancelled
}
