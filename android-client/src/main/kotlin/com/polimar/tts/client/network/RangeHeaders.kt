package com.polimar.tts.client.network

/**
 * Helper per header HTTP Range su stream audio WAV.
 */
object RangeHeaders {
    /**
     * Range byte aperto: `bytes=start-` (fino a fine file).
     */
    fun fromStart(start: Long): String = "bytes=$start-"

    /**
     * Range byte chiuso: `bytes=start-end` (entrambi inclusivi).
     */
    fun bytes(start: Long, end: Long): String = "bytes=$start-$end"
}
