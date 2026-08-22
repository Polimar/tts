package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Voice(
    val id: String,
    val name: String,
    @SerialName("duration_sec")
    val durationSec: Float? = null,
    @SerialName("created_at")
    val createdAt: String,
)

@Serializable
data class VoiceListResponse(
    val items: List<Voice>,
    val total: Int,
)
