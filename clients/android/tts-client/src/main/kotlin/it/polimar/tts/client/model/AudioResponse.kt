package it.polimar.tts.client.model

import okhttp3.ResponseBody

/**
 * Risultato del download audio di un job.
 *
 * [body] va chiuso dal chiamante (es. `use { }`) quando non serve più lo stream.
 */
data class AudioResponse(
    val body: ResponseBody,
    val contentType: String?,
    val contentLength: Long?,
    val contentRange: String?,
    val acceptRanges: String?,
    val statusCode: Int,
) {
    fun bytes(): ByteArray = body.bytes()

    fun byteStream() = body.byteStream()
}
