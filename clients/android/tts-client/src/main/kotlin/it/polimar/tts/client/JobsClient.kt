package it.polimar.tts.client

import it.polimar.tts.client.internal.ApiHttpClient
import it.polimar.tts.client.model.AudioResponse
import it.polimar.tts.client.model.CreateJobRequest
import it.polimar.tts.client.model.Job
import okhttp3.Request

class JobsClient internal constructor(
    private val http: ApiHttpClient,
) {
    fun list(): List<Job> {
        val req = http.jsonRequest("GET", "/jobs")
        return http.executeJson(req)
    }

    fun create(text: String, voiceId: String): Job =
        create(CreateJobRequest(text = text, voiceId = voiceId))

    fun create(request: CreateJobRequest): Job {
        val body = http.jsonBody(request)
        val req = http.jsonRequest("POST", "/jobs", body)
        return http.executeJson(req)
    }

    fun get(jobId: String): Job {
        val req = http.jsonRequest("GET", "/jobs/$jobId")
        return http.executeJson(req)
    }

    /**
     * Scarica l'audio WAV del job. Supporta richieste parziali via header `Range`.
     *
     * @param range intervallo byte inclusivo (es. `0L..1023L` → `bytes=0-1023`).
     *              Se `null`, scarica l'intero file.
     */
    fun getAudio(jobId: String, range: LongRange? = null): AudioResponse =
        getAudio(jobId, range?.toRangeHeader())

    /**
     * @param rangeHeader valore grezzo dell'header Range, es. `bytes=0-1023`.
     */
    fun getAudio(jobId: String, rangeHeader: String?): AudioResponse {
        val builder = Request.Builder()
            .url(http.url("/jobs/$jobId/audio"))
            .get()
            .header("Accept", "audio/wav")

        if (!rangeHeader.isNullOrBlank()) {
            builder.header("Range", rangeHeader)
        }

        val response = http.okhttp.newCall(builder.build()).execute()
        val status = response.code
        if (status !in ACCEPTED_AUDIO_STATUS) {
            val raw = response.body?.string().orEmpty()
            response.close()
            throw parseAudioError(status, raw)
        }

        val body = response.body
            ?: throw TtsApiException(
                code = "empty_body",
                message = "Risposta audio vuota",
                httpStatus = status,
            )

        return AudioResponse(
            body = body,
            contentType = response.header("Content-Type"),
            contentLength = body.contentLength().takeIf { it >= 0 },
            contentRange = response.header("Content-Range"),
            acceptRanges = response.header("Accept-Ranges"),
            statusCode = status,
        )
    }

    private fun LongRange.toRangeHeader(): String =
        "bytes=$first-$last"

    private fun parseAudioError(httpStatus: Int, raw: String): TtsApiException {
        if (raw.isNotBlank()) {
            runCatching {
                ApiHttpClient.defaultJson.decodeFromString<it.polimar.tts.client.model.ApiError>(raw)
            }.onSuccess { return TtsApiException(it, httpStatus) }
        }
        return TtsApiException(
            code = "http_$httpStatus",
            message = raw.ifBlank { "Errore HTTP $httpStatus durante il download audio" },
            httpStatus = httpStatus,
        )
    }

    companion object {
        private val ACCEPTED_AUDIO_STATUS = setOf(200, 206)
    }
}
