# TTS Studio — Frontend

UI web italiana per la webapp TTS (clonazione vocale + sintesi).

Contratto API: backend live su PR #10 (`cursor/qwen3-tts-backend-b796`), bind `0.0.0.0:8765`.

## Sviluppo

```bash
cd frontend
npm install
npm run dev
```

Proxy Vite verso `http://localhost:8765` per `/auth`, `/voices`, `/jobs`, `/health`, `/system`.

Auth: **Bearer token** (`Authorization: Bearer <token>`), salvato in sessionStorage.
Registrazione: header `X-API-Key` (valore `API_KEY` dal `.env` del server).

Opzionale in dev: `VITE_REGISTER_API_KEY=<API_KEY>` per precompilare la chiave in registrazione.

## Build

```bash
npm run build
npm run preview
```

## Schermate

| Path | Schermata |
|------|-----------|
| `/login` | Login / Registrazione (username + password) |
| `/voci` | Libreria voci |
| `/nuovo` | Editor testo/libro |
| `/coda` | Coda job |
| `/coda/:jobId` | Dettaglio job + player |
| `/impostazioni` | Account |

## Extension points (Game Dev Web)

- `AudioPlayer`: prop `waveformSlot` + `data-gdw-waveform-container`
- `NewJobPage`: `data-gdw-book-editor`
- `useJobPolling` / `useActiveJobsPolling`
