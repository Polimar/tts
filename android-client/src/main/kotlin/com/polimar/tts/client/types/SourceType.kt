package com.polimar.tts.client.types

import com.squareup.moshi.Json

enum class SourceType {
    @Json(name = "text")
    TEXT,

    @Json(name = "chapter")
    CHAPTER,
}
