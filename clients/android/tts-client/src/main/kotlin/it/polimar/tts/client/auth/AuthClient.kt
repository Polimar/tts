package it.polimar.tts.client.auth

import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest
import it.polimar.tts.client.model.User

/**
 * Contratto auth live (`tts_server`, PR #10).
 *
 * | Metodo | Path | Success |
 * |--------|------|---------|
 * | register | POST /auth/register + X-API-Key | 201 + Bearer token |
 * | login | POST /auth/login | 200 + Bearer token |
 * | logout | POST /auth/logout | 204 |
 * | me | GET /auth/me | 200 User |
 */
interface AuthClient {
    suspend fun register(request: RegisterRequest, apiKey: String): AuthResponse

    suspend fun login(request: LoginRequest): AuthResponse

    suspend fun logout()

    suspend fun me(): User
}
