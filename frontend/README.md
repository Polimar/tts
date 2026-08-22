# TTS Studio — Frontend

UI web italiana per la webapp TTS (clonazione vocale + sintesi).

Contratto API: `docs/API.md`, `openapi.yaml` (branch `cursor/docs-architecture-api-145f` / PR #3).

## Sviluppo

```bash
cd frontend
npm install
npm run dev
```

Il dev server Vite (`:5173`) fa proxy di `/api` verso il backend FastAPI su `http://localhost:8765`.
Auth: cookie httpOnly `tts_session`, `credentials: 'include'`.

## Build

```bash
npm run build
npm run preview
```

## Schermate

| Path | Schermata |
|------|-----------|
| `/login` | Login / Registrazione |
| `/voci` | Libreria voci |
| `/nuovo` | Editor testo/libro |
| `/coda` | Coda job |
| `/coda/:jobId` | Dettaglio job + player |
| `/impostazioni` | Account |

## Extension points (Game Dev Web)

- `data-gdw-waveform-container` su `AudioPlayer` — slot per waveform canvas
- `data-gdw-book-editor` su `NewJobPage` — editor libro avanzato
- `useJobPolling` / `useActiveJobsPolling` — sostituibili con SSE/WebSocket
