package it.polimar.tts.client.retrofit

import it.polimar.tts.client.auth.AuthClient
import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest

internal class RetrofitAuthClient(
    private val api: AuthRetrofitApi,
) : AuthClient {
    override suspend fun register(request: RegisterRequest): AuthResponse =
        api.register(request).body()!!

    override suspend fun login(request: LoginRequest): AuthResponse =
        api.login(request)

    override suspend fun logout() {
        api.logout()
    }

    override suspend fun me(): AuthResponse = api.me()
}
