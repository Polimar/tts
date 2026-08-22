package it.polimar.tts.client

import it.polimar.tts.client.model.ApiError
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

object TtsErrorParser {
    fun parse(body: String): ApiError? =
        runCatching {
            val root = TtsJson.parseToJsonElement(body)
            val detail = extractDetail(root)
            if (detail != null) ApiError(detail) else null
        }.getOrNull()

    private fun extractDetail(element: JsonElement): String? {
        if (element !is JsonObject) return null
        val detailEl = element["detail"] ?: return null
        return when (detailEl) {
            is JsonPrimitive -> detailEl.content
            is JsonArray -> detailEl.firstOrNull()?.let { first ->
                if (first is JsonObject) {
                    first["msg"]?.jsonPrimitive?.content
                } else {
                    first.jsonPrimitive.content
                }
            }
            else -> null
        }
    }
}
