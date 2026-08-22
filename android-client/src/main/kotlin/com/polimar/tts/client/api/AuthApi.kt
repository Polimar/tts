package com.polimar.tts.client.api

import com.polimar.tts.client.dto.LoginRequest
import com.polimar.tts.client.dto.RegisterRequest
import com.polimar.tts.client.dto.UserResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Autenticazione sessione via cookie httpOnly (endpoint `/api/v1/auth`).
 */
interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): UserResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): UserResponse

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    @GET("auth/me")
    suspend fun getMe(): UserResponse
}
