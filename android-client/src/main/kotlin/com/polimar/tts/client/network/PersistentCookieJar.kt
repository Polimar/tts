package com.polimar.tts.client.network

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

/**
 * [CookieJar] che mantiene i cookie di sessione httpOnly tra richieste sullo stesso host.
 * Il cookie di sessione impostato da login/register viene riusato automaticamente.
 */
class PersistentCookieJar : CookieJar {
    private val store = ConcurrentHashMap<String, MutableList<Cookie>>()

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val hostKey = hostKey(url)
        val cookies = store[hostKey] ?: return emptyList()
        return cookies.filter { it.expiresAt > System.currentTimeMillis() }
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isEmpty()) {
            return
        }
        val hostKey = hostKey(url)
        val existing = store.getOrPut(hostKey) { mutableListOf() }
        cookies.forEach { newCookie ->
            existing.removeAll { it.name == newCookie.name && it.domain == newCookie.domain }
            existing.add(newCookie)
        }
    }

    /** Rimuove tutti i cookie memorizzati (es. dopo logout locale). */
    fun clear() {
        store.clear()
    }

    private fun hostKey(url: HttpUrl): String = url.host
}
