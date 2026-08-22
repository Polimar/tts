package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Voice(
    val id: String,
    val name: String,
    @SerialName("ref_text")
    val refText: String,
    val language: String,
    @SerialName("created_at")
    val createdAt: String,
)
