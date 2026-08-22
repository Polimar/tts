# TTS Studio — Frontend

UI italiana (Vite + React). Contratto API: `docs/API.md` (PR #12).

## Sviluppo

```bash
cd frontend && npm install && npm run dev
```

Proxy Vite verso `http://localhost:8765`: `/auth`, `/voices`, `/jobs`, `/health`, `/system`.

Auth: **Bearer token** in `localStorage`. Registrazione: header `X-API-Key` se `VITE_REGISTER_API_KEY` (o `VITE_REGISTRATION_API_KEY`) è impostata; altrimenti richiede `ALLOW_PUBLIC_REGISTRATION=1` sul backend.

## Produzione (same-origin)

```bash
npm run build
MOCK_WORKER=1 ALLOW_PUBLIC_REGISTRATION=1 uvicorn tts_server.main:app --host 0.0.0.0 --port 8765
```

## Extension points (Game Dev Web)

- `WaveformSlot` / `data-gdw-waveform-container`
- `BookEditor` / `data-gdw-book-editor`
- `useJobPolling` / `useActiveJobsPolling`
