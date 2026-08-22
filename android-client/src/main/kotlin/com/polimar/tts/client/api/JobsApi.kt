package com.polimar.tts.client.api

import com.polimar.tts.client.dto.CreateJobRequest
import com.polimar.tts.client.dto.Job
import com.polimar.tts.client.dto.JobCancelled
import com.polimar.tts.client.dto.JobDetail
import com.polimar.tts.client.dto.JobListResponse
import com.polimar.tts.client.types.JobStatus
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Coda job TTS FIFO (max 10 queued, 1 running) (`/api/v1/jobs`).
 */
interface JobsApi {
    @GET("jobs")
    suspend fun listJobs(
        @Query("status") status: JobStatus? = null,
        @Query("limit") limit: Int? = null,
        @Query("offset") offset: Int? = null,
    ): JobListResponse

    @POST("jobs")
    suspend fun createJob(@Body request: CreateJobRequest): Response<Job>

    @GET("jobs/{job_id}")
    suspend fun getJob(@Path("job_id") jobId: String): JobDetail

    @POST("jobs/{job_id}/cancel")
    suspend fun cancelJob(@Path("job_id") jobId: String): JobCancelled
}
