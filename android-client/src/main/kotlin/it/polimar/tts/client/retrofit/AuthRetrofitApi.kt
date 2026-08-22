package it.polimar.tts.client.retrofit

import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthRetrofitApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    @GET("auth/me")
    suspend fun me(): AuthResponse
}
