# TTS Studio — Frontend

UI web italiana per la webapp TTS (clonazione vocale + sintesi).

## Sviluppo

```bash
cd frontend
npm install
npm run dev
```

Il dev server Vite (`:5173`) fa proxy di `/api` verso il backend FastAPI su `http://localhost:8765`.

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

## API

Tutte le chiamate usano `credentials: 'include'` verso `/api/v1/*`.

Vedi la descrizione della PR per il contratto request/response assunto.

## Extension points (Game Dev Web)

- `data-gdw-waveform-container` su `AudioPlayer` — slot per waveform canvas
- `data-gdw-book-editor` su `NewJobPage` — editor libro avanzato
- `useJobPolling` / `useActiveJobsPolling` — sostituibili con SSE/WebSocket
