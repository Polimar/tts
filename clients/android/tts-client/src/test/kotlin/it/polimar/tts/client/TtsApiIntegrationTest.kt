package it.polimar.tts.client

import it.polimar.tts.client.model.JobStatus
import it.polimar.tts.client.model.User
import it.polimar.tts.client.model.VoiceStatus
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okio.Buffer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class TtsApiIntegrationTest {
    private lateinit var server: MockWebServer
    private lateinit var api: TtsApi

    @BeforeEach
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = TtsApi.create(baseUrl = server.url("/").toString().trimEnd('/'))
    }

    @AfterEach
    fun tearDown() {
        api.close()
        server.shutdown()
    }

    @Test
    fun `login invia credenziali e conserva cookie di sessione`() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .addHeader("Set-Cookie", "session=abc123; Path=/; HttpOnly")
                .setBody("""{"id":"u1","email":"mario@example.com"}"""),
        )

        val user = api.auth.login("mario@example.com", "segreto")

        assertEquals("mario@example.com", user.email)
        val recorded = server.takeRequest()
        assertEquals("POST", recorded.method)
        assertEquals("/api/v1/auth/login", recorded.path)
        assertEquals("""{"email":"mario@example.com","password":"segreto"}""", recorded.body.readUtf8())

        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"id":"u1","email":"mario@example.com"}"""),
        )
        val me = api.auth.me()
        assertEquals(User("u1", "mario@example.com"), me)
        val meRequest = server.takeRequest()
        assertNotNull(meRequest.getHeader("Cookie"))
        assertEquals("session=abc123", meRequest.getHeader("Cookie"))
    }

    @Test
    fun `getAudio supporta Range e restituisce 206`() {
        val payload = byteArrayOf(0x52, 0x49, 0x46, 0x46)
        server.enqueue(
            MockResponse()
                .setResponseCode(206)
                .addHeader("Content-Type", "audio/wav")
                .addHeader("Content-Range", "bytes 0-3/100")
                .addHeader("Accept-Ranges", "bytes")
                .setBody(Buffer().write(payload)),
        )

        val response = api.jobs.getAudio("job-1", 0L..3L)
        try {
            assertEquals(206, response.statusCode)
            assertEquals("bytes 0-3/100", response.contentRange)
            assertArrayEquals(payload, response.bytes())
        } finally {
            response.body.close()
        }

        val recorded = server.takeRequest()
        assertEquals("bytes=0-3", recorded.getHeader("Range"))
        assertEquals("/api/v1/jobs/job-1/audio", recorded.path)
    }

    @Test
    fun `errori API espongono code e detail italiani`() {
        server.enqueue(
            MockResponse()
                .setResponseCode(401)
                .addHeader("Content-Type", "application/json")
                .setBody("""{"code":"auth_invalid","detail":"Credenziali non valide"}"""),
        )

        val error = runCatching { api.auth.me() }.exceptionOrNull() as TtsApiException
        assertEquals("auth_invalid", error.code)
        assertEquals("Credenziali non valide", error.message)
        assertEquals(401, error.httpStatus)
    }

    @Test
    fun `voices list deserializza snake_case`() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    [
                      {
                        "id": "v1",
                        "name": "Voce demo",
                        "status": "ready",
                        "reference_text": "Ciao mondo",
                        "created_at": "2026-01-01T00:00:00Z"
                      }
                    ]
                    """.trimIndent(),
                ),
        )

        val voices = api.voices.list()
        assertEquals(1, voices.size)
        assertEquals("v1", voices[0].id)
        assertEquals(VoiceStatus.READY, voices[0].status)
        assertEquals("Ciao mondo", voices[0].referenceText)
    }

    @Test
    fun `jobs get deserializza status enum`() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "id": "j1",
                      "status": "running",
                      "text": "Prova",
                      "voice_id": "v1"
                    }
                    """.trimIndent(),
                ),
        )

        val job = api.jobs.get("j1")
        assertEquals(JobStatus.RUNNING, job.status)
        assertEquals("v1", job.voiceId)
    }
}
