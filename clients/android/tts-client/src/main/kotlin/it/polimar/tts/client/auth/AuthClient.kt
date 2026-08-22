package it.polimar.tts.client.auth

import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest

/**
 * Contratto auth allineato a openapi.yaml (PR #3).
 *
 * Implementazione HTTP (Retrofit/OkHttp, cookie `tts_session`) a carico del Mobile Dev.
 *
 * | Metodo | Path | Success |
 * |--------|------|---------|
 * | register | POST /auth/register | 201 + Set-Cookie |
 * | login | POST /auth/login | 200 + Set-Cookie |
 * | logout | POST /auth/logout | 204 |
 * | me | GET /auth/me | 200 |
 */
interface AuthClient {
    suspend fun register(request: RegisterRequest): AuthResponse

    suspend fun login(request: LoginRequest): AuthResponse

    suspend fun logout()

    suspend fun me(): AuthResponse
}
