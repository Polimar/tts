package com.polimar.tts.client.network

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

/**
 * [CookieJar] per la sessione httpOnly `tts_session` impostata da login/register.
 */
class PersistentCookieJar : CookieJar {
    private val store = ConcurrentHashMap<String, MutableList<Cookie>>()

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val cookies = store[hostKey(url)] ?: return emptyList()
        return cookies
            .filter { it.name == SESSION_COOKIE_NAME }
            .filter { it.expiresAt > System.currentTimeMillis() }
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val sessionCookies = cookies.filter { it.name == SESSION_COOKIE_NAME }
        if (sessionCookies.isEmpty()) {
            return
        }

        val existing = store.getOrPut(hostKey(url)) { mutableListOf() }
        sessionCookies.forEach { newCookie ->
            existing.removeAll { it.name == SESSION_COOKIE_NAME && it.domain == newCookie.domain }
            if (newCookie.value.isNotEmpty()) {
                existing.add(newCookie)
            }
        }
    }

    fun hasSession(): Boolean = store.values.any { cookies ->
        cookies.any { it.name == SESSION_COOKIE_NAME && it.value.isNotEmpty() }
    }

    /** Rimuove il cookie `tts_session` memorizzato (es. logout locale). */
    fun clear() {
        store.clear()
    }

    private fun hostKey(url: HttpUrl): String = url.host

    companion object {
        const val SESSION_COOKIE_NAME = "tts_session"
    }
}
