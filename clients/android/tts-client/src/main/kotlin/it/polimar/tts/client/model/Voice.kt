package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class VoiceStatus {
    @SerialName("processing")
    PROCESSING,

    @SerialName("ready")
    READY,

    @SerialName("failed")
    FAILED,
}

@Serializable
data class Voice(
    val id: String,
    val name: String,
    val status: VoiceStatus,
    @SerialName("reference_text")
    val referenceText: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null,
)

@Serializable
data class CreateVoiceRequest(
    val name: String,
    @SerialName("reference_text")
    val referenceText: String? = null,
)
