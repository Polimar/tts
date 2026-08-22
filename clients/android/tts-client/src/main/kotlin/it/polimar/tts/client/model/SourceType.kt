package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class SourceType {
    @SerialName("text")
    TEXT,

    @SerialName("chapter")
    CHAPTER,
}
