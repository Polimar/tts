package com.polimar.tts.client.types

import com.squareup.moshi.Json

/**
 * Stato di elaborazione di una voce clonata.
 */
enum class VoiceStatus {
    @Json(name = "ready")
    READY,

    @Json(name = "processing")
    PROCESSING,

    @Json(name = "error")
    ERROR,
}
