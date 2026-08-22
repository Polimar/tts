package it.polimar.tts.client.model

/** Parametri query per `GET /jobs` (openapi.yaml). */
data class ListJobsParams(
    val status: JobStatus? = null,
    val limit: Int = 20,
    val offset: Int = 0,
) {
    init {
        require(limit in 1..100) { "limit deve essere tra 1 e 100" }
        require(offset >= 0) { "offset deve essere >= 0" }
    }

    fun toQueryMap(): Map<String, String> = buildMap {
        status?.let { put("status", it.toApiValue()) }
        put("limit", limit.toString())
        put("offset", offset.toString())
    }
}
