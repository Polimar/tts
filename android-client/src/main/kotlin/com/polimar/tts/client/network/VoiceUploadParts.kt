package com.polimar.tts.client.network

import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

/** Helper per multipart `POST /voices` (campo `reference_audio`). */
object VoiceUploadParts {
    fun name(value: String): RequestBody =
        value.toRequestBody("text/plain".toMediaTypeOrNull())

    fun referenceAudio(file: File, mediaType: String = "audio/wav"): MultipartBody.Part =
        MultipartBody.Part.createFormData(
            "reference_audio",
            file.name,
            file.asRequestBody(mediaType.toMediaTypeOrNull()),
        )

    fun referenceAudio(
        fileName: String,
        body: RequestBody,
    ): MultipartBody.Part = MultipartBody.Part.createFormData("reference_audio", fileName, body)
}
