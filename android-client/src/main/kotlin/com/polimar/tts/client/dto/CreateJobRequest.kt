package com.polimar.tts.client.dto

import com.polimar.tts.client.types.SourceType
import com.squareup.moshi.Json

data class CreateJobRequest(
    @Json(name = "voice_id")
    val voiceId: String,

    @Json(name = "source_type")
    val sourceType: SourceType,

    @Json(name = "text")
    val text: String? = null,

    @Json(name = "chapter_id")
    val chapterId: String? = null,

    @Json(name = "title")
    val title: String? = null,
)
