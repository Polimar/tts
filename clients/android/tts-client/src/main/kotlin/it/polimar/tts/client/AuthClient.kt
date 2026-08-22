package it.polimar.tts.client

import it.polimar.tts.client.internal.ApiHttpClient
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest
import it.polimar.tts.client.model.User

class AuthClient internal constructor(
    private val http: ApiHttpClient,
) {
    fun register(email: String, password: String): User =
        register(RegisterRequest(email = email, password = password))

    fun register(request: RegisterRequest): User {
        val body = http.jsonBody(request)
        val req = http.jsonRequest("POST", "/auth/register", body)
        return http.executeJson(req)
    }

    fun login(email: String, password: String): User =
        login(LoginRequest(email = email, password = password))

    fun login(request: LoginRequest): User {
        val body = http.jsonBody(request)
        val req = http.jsonRequest("POST", "/auth/login", body)
        return http.executeJson(req)
    }

    fun logout() {
        val req = http.jsonRequest("POST", "/auth/logout")
        http.executeRaw(req).close()
    }

    fun me(): User {
        val req = http.jsonRequest("GET", "/auth/me")
        return http.executeJson(req)
    }
}
