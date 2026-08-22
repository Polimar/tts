package com.polimar.tts.client.dto

import com.squareup.moshi.Json

data class JobListResponse(
    @Json(name = "items")
    val items: List<Job>,

    @Json(name = "total")
    val total: Int,

    @Json(name = "limit")
    val limit: Int,

    @Json(name = "offset")
    val offset: Int,
)
