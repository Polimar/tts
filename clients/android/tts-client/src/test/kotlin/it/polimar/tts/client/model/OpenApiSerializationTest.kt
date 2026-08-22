package it.polimar.tts.client.model

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import it.polimar.tts.client.TtsJson

class OpenApiSerializationTest {
    private val json = TtsJson

    @Test
    fun `AuthResponse wrappa user`() {
        val raw = """
            {
              "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "mario.rossi@example.com",
                "created_at": "2026-08-22T10:00:00Z"
              }
            }
        """.trimIndent()

        val response = json.decodeFromString<AuthResponse>(raw)
        assertEquals("mario.rossi@example.com", response.user.email)
        assertEquals("2026-08-22T10:00:00Z", response.user.createdAt)
    }

    @Test
    fun `VoiceListResponse usa items e total`() {
        val raw = """
            {
              "items": [
                {
                  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                  "name": "Voce narratore",
                  "duration_sec": 12.4,
                  "created_at": "2026-08-22T10:05:00Z"
                }
              ],
              "total": 1
            }
        """.trimIndent()

        val response = json.decodeFromString<VoiceListResponse>(raw)
        assertEquals(1, response.total)
        assertEquals(12.4f, response.items.single().durationSec)
    }

    @Test
    fun `Job con campi snake_case e error_code nullable`() {
        val raw = """
            {
              "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
              "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
              "status": "queued",
              "source_type": "text",
              "title": "Prova capitolo 1",
              "progress": 0,
              "queue_position": 2,
              "error_code": null,
              "error_detail": null,
              "created_at": "2026-08-22T10:10:00Z",
              "started_at": null,
              "finished_at": null
            }
        """.trimIndent()

        val job = json.decodeFromString<Job>(raw)
        assertEquals(JobStatus.QUEUED, job.status)
        assertEquals(SourceType.TEXT, job.sourceType)
        assertEquals(2, job.queuePosition)
        assertNull(job.errorCode)
    }

    @Test
    fun `JobDetail include audio_ready`() {
        val raw = """
            {
              "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
              "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
              "status": "done",
              "source_type": "text",
              "title": "Prova capitolo 1",
              "progress": 1,
              "queue_position": null,
              "error_code": null,
              "error_detail": null,
              "audio_ready": true,
              "created_at": "2026-08-22T10:10:00Z",
              "started_at": "2026-08-22T10:10:05Z",
              "finished_at": "2026-08-22T10:12:30Z"
            }
        """.trimIndent()

        val detail = json.decodeFromString<JobDetail>(raw)
        assertEquals(true, detail.audioReady)
        assertEquals(JobStatus.DONE, detail.status)
    }

    @Test
    fun `ApiError queue_full`() {
        val raw = """
            {
              "code": "queue_full",
              "detail": "La coda di sintesi è piena. Riprova più tardi."
            }
        """.trimIndent()

        val error = json.decodeFromString<ApiError>(raw)
        assertEquals(ErrorCode.QUEUE_FULL, error.code)
    }

    @Test
    fun `CreateJobRequest round trip`() {
        val request = CreateJobRequest(
            voiceId = "7c9e6679-7425-40de-944b-e07fc1f90ae7",
            sourceType = SourceType.TEXT,
            text = "C'era una volta...",
            title = "Capitolo 1",
        )

        val encoded = json.encodeToString(request)
        assertEquals(
            """{"voice_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","source_type":"text","text":"C'era una volta...","title":"Capitolo 1"}""",
            encoded,
        )
    }

    @Test
    fun `JobCancelled status cancelled`() {
        val raw = """
            {
              "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
              "status": "cancelled",
              "queue_position": null,
              "finished_at": "2026-08-22T10:11:00Z"
            }
        """.trimIndent()

        val cancelled = json.decodeFromString<JobCancelled>(raw)
        assertEquals(JobStatus.CANCELLED, cancelled.status)
        assertNull(cancelled.queuePosition)
    }

    @Test
    fun `ListJobsParams query map`() {
        val params = ListJobsParams(status = JobStatus.RUNNING, limit = 50, offset = 10)
        assertEquals(
            mapOf("status" to "running", "limit" to "50", "offset" to "10"),
            params.toQueryMap(),
        )
    }
}
