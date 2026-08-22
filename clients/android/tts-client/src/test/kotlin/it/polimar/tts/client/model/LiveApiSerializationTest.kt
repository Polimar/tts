package it.polimar.tts.client.model

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import it.polimar.tts.client.TtsJson

class LiveApiSerializationTest {
    private val json = TtsJson

    @Test
    fun `AuthResponse con token Bearer`() {
        val raw = """
            {
              "token": "eyJhbGciOiJIUzI1NiJ9.test",
              "expires_at": "2026-08-23T10:00:00+00:00",
              "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "username": "alice",
                "created_at": "2026-08-22T10:00:00Z"
              }
            }
        """.trimIndent()

        val response = json.decodeFromString<AuthResponse>(raw)
        assertEquals("alice", response.user.username)
        assertEquals("eyJhbGciOiJIUzI1NiJ9.test", response.token)
    }

    @Test
    fun `User da GET auth me`() {
        val raw = """
            {
              "id": "550e8400-e29b-41d4-a716-446655440000",
              "username": "alice",
              "created_at": "2026-08-22T10:00:00Z"
            }
        """.trimIndent()

        val user = json.decodeFromString<User>(raw)
        assertEquals("alice", user.username)
    }

    @Test
    fun `VoiceList array diretto`() {
        val raw = """
            [
              {
                "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                "name": "Mia voce",
                "ref_text": "Ciao mondo",
                "language": "Italian",
                "created_at": "2026-08-22T10:05:00Z"
              }
            ]
        """.trimIndent()

        val voices = json.decodeFromString<VoiceList>(raw)
        assertEquals(1, voices.size)
        assertEquals("Ciao mondo", voices[0].refText)
    }

    @Test
    fun `Job status completed`() {
        val raw = """
            {
              "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
              "voice_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
              "status": "completed",
              "language": "Italian",
              "text": "Prima frase.",
              "chunk_count": 2,
              "error": null,
              "wav_available": true,
              "mp3_available": false,
              "device_used": "cpu",
              "created_at": "2026-08-22T10:10:00Z",
              "started_at": "2026-08-22T10:10:05Z",
              "completed_at": "2026-08-22T10:12:30Z"
            }
        """.trimIndent()

        val job = json.decodeFromString<Job>(raw)
        assertEquals(JobStatus.COMPLETED, job.status)
        assertEquals(true, job.wavAvailable)
        assertEquals(2, job.chunkCount)
        assertNull(job.error)
    }

    @Test
    fun `CreateJobRequest con language opzionale`() {
        val request = CreateJobRequest(
            voiceId = "7c9e6679-7425-40de-944b-e07fc1f90ae7",
            text = "Ciao mondo",
        )

        val encoded = json.encodeToString(request)
        assertEquals(
            """{"voice_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","text":"Ciao mondo"}""",
            encoded,
        )
        assertEquals("Italian", request.language)
    }

    @Test
    fun `ApiError detail string`() {
        val raw = """{"detail":"Invalid credentials"}"""
        val error = json.decodeFromString<ApiError>(raw)
        assertEquals("Invalid credentials", error.detail)
    }

    @Test
    fun `HealthResponse`() {
        val raw = """{"status":"ok","worker_ready":true}"""
        val health = json.decodeFromString<HealthResponse>(raw)
        assertEquals(true, health.workerReady)
    }
}
