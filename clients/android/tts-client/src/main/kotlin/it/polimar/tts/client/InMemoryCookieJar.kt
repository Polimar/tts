package it.polimar.tts.client

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

/**
 * [CookieJar] in-memory thread-safe per sessioni httpOnly.
 * Per persistenza tra riavvii dell'app Android, serializza [cookies] su disco.
 */
class InMemoryCookieJar : CookieJar {
    private val cookies = ConcurrentHashMap<String, MutableList<Cookie>>()

    override fun saveFromResponse(url: HttpUrl, responseCookies: List<Cookie>) {
        if (responseCookies.isEmpty()) return
        val hostKey = url.host
        val existing = cookies.getOrPut(hostKey) { mutableListOf() }
        responseCookies.forEach { newCookie ->
            existing.removeAll { it.name == newCookie.name && it.matches(url) }
            existing.add(newCookie)
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val hostKey = url.host
        val stored = cookies[hostKey] ?: return emptyList()
        val valid = stored.filter { it.matches(url) && !it.expiresAt.isExpired() }
        cookies[hostKey] = valid.toMutableList()
        return valid
    }

    fun clear() {
        cookies.clear()
    }

    fun snapshot(): Map<String, List<Cookie>> =
        cookies.mapValues { (_, value) -> value.toList() }

    private fun Long.isExpired(): Boolean = this != 0L && this < System.currentTimeMillis()
}
