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
              "token": "abc123",
              "expires_at": "2026-08-22T12:00:00Z",
              "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "username": "alice",
                "created_at": "2026-08-22T10:00:00Z"
              }
            }
        """.trimIndent()

        val response = json.decodeFromString<AuthResponse>(raw)
        assertEquals("abc123", response.token)
        assertEquals("alice", response.user.username)
    }

    @Test
    fun `Voice con ref_text e language`() {
        val raw = """
            {
              "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
              "name": "Mia voce",
              "ref_text": "Ciao mondo",
              "language": "Italian",
              "created_at": "2026-08-22T10:05:00Z"
            }
        """.trimIndent()

        val voice = json.decodeFromString<Voice>(raw)
        assertEquals("Ciao mondo", voice.refText)
        assertEquals("Italian", voice.language)
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
    }

    @Test
    fun `ApiError detail string`() {
        val raw = """{"detail": "Invalid credentials"}"""
        val error = json.decodeFromString<ApiError>(raw)
        assertEquals("Invalid credentials", error.detail)
    }

    @Test
    fun `CreateJobRequest round trip`() {
        val request = CreateJobRequest(
            voiceId = "7c9e6679-7425-40de-944b-e07fc1f90ae7",
            text = "C'era una volta...",
            language = "Italian",
        )

        val encoded = json.encodeToString(request)
        assertEquals(
            """{"voice_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","text":"C'era una volta...","language":"Italian"}""",
            encoded,
        )
    }

    @Test
    fun `User me response`() {
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
}
