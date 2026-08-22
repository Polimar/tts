package com.polimar.tts.client.api

import com.polimar.tts.client.dto.CreateJobRequest
import com.polimar.tts.client.dto.JobResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Coda job TTS FIFO (`/api/v1/jobs`).
 */
interface JobsApi {
    @GET("jobs")
    suspend fun listJobs(): List<JobResponse>

    @POST("jobs")
    suspend fun createJob(@Body request: CreateJobRequest): JobResponse

    @GET("jobs/{id}")
    suspend fun getJob(@Path("id") jobId: String): JobResponse
}
