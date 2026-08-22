package it.polimar.tts.client.retrofit

import it.polimar.tts.client.auth.AuthClient
import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest
import it.polimar.tts.client.model.User
import it.polimar.tts.client.network.BearerTokenStore

internal class RetrofitAuthClient(
    private val api: AuthRetrofitApi,
    private val tokenStore: BearerTokenStore,
) : AuthClient {
    override suspend fun register(request: RegisterRequest, apiKey: String): AuthResponse {
        val response = api.register(apiKey, request)
        val body = response.body()!!
        tokenStore.setToken(body.token)
        return body
    }

    override suspend fun login(request: LoginRequest): AuthResponse {
        val response = api.login(request)
        tokenStore.setToken(response.token)
        return response
    }

    override suspend fun logout() {
        api.logout()
        tokenStore.clear()
    }

    override suspend fun me(): User = api.me()
}
