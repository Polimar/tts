package it.polimar.tts.client

import it.polimar.tts.client.internal.ApiHttpClient
import it.polimar.tts.client.model.CreateVoiceRequest
import it.polimar.tts.client.model.Voice
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.InputStream

class VoicesClient internal constructor(
    private val http: ApiHttpClient,
) {
    fun list(): List<Voice> {
        val req = http.jsonRequest("GET", "/voices")
        return http.executeJson(req)
    }

    fun create(
        name: String,
        audioFile: File,
        referenceText: String? = null,
        audioContentType: String = "audio/wav",
    ): Voice = create(
        request = CreateVoiceRequest(name = name, referenceText = referenceText),
        audioFile = audioFile,
        audioContentType = audioContentType,
    )

    fun create(
        request: CreateVoiceRequest,
        audioFile: File,
        audioContentType: String = "audio/wav",
    ): Voice {
        require(audioFile.isFile) { "Il file audio non esiste: ${audioFile.path}" }
        return create(
            request = request,
            audioBytes = audioFile.readBytes(),
            audioFilename = audioFile.name,
            audioContentType = audioContentType,
        )
    }

    fun create(
        request: CreateVoiceRequest,
        audioBytes: ByteArray,
        audioFilename: String,
        audioContentType: String = "audio/wav",
    ): Voice {
        val multipartBuilder = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("name", request.name)
            .addFormDataPart(
                name = "audio",
                filename = audioFilename,
                body = audioBytes.toRequestBody(audioContentType.toMediaType()),
            )

        request.referenceText?.let { referenceText ->
            multipartBuilder.addFormDataPart("reference_text", referenceText)
        }

        val multipart = multipartBuilder.build()

        val req = Request.Builder()
            .url(http.url("/voices"))
            .post(multipart)
            .header("Accept", "application/json")
            .build()

        return http.executeJson(req)
    }

    fun create(
        request: CreateVoiceRequest,
        audioStream: InputStream,
        audioFilename: String,
        audioContentType: String = "audio/wav",
    ): Voice = audioStream.use { stream ->
        create(
            request = request,
            audioBytes = stream.readBytes(),
            audioFilename = audioFilename,
            audioContentType = audioContentType,
        )
    }

    fun delete(voiceId: String) {
        val req = http.jsonRequest("DELETE", "/voices/$voiceId")
        http.executeRaw(req).close()
    }
}
