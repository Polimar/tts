package it.polimar.tts.client.network

import java.util.concurrent.atomic.AtomicReference

/** Memorizza il token Bearer restituito da login/register. */
class BearerTokenStore {
    private val token = AtomicReference<String?>(null)

    fun setToken(value: String?) {
        token.set(value)
    }

    fun getToken(): String? = token.get()

    fun clear() {
        token.set(null)
    }
}
