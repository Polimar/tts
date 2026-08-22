package it.polimar.tts.client.auth

import it.polimar.tts.client.model.AuthResponse
import it.polimar.tts.client.model.LoginRequest
import it.polimar.tts.client.model.RegisterRequest
import it.polimar.tts.client.model.User

/**
 * Contratto auth allineato a `tts_server/auth/routes.py` (PR #10).
 *
 * - Register richiede header `X-API-Key`
 * - Sessione: `Authorization: Bearer <token>` (non cookie)
 */
interface AuthClient {
    suspend fun register(apiKey: String, request: RegisterRequest): AuthResponse

    suspend fun login(request: LoginRequest): AuthResponse

    suspend fun logout()

    /** Restituisce `UserOut` direttamente (non wrappato in AuthResponse). */
    suspend fun me(): User
}
