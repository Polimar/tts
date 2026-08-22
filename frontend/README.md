# Frontend TTS

UI italiana (Vite + React). In produzione servita same-origin da FastAPI su `:8765` (PR #13). In dev: proxy Vite verso `:8765`.

Contratto API: `docs/API.md` + `openapi.yaml` (PR #12).

- Auth: `username` + `password` → Bearer; `X-API-Key` su register (salvo `ALLOW_PUBLIC_REGISTRATION=1`)
- Jobs: `{ voice_id, text }`; status `completed` | `failed`; audio `GET /jobs/{id}/download/wav`
- Errori: `{ "detail": "..." }`

## Game Dev Web (hook su Frontend #6 / #13)

| Entry point | Componente |
|-------------|------------|
| `AudioPlayer.waveformSlot` | `WaveformSlot` |
| `data-gdw-book-editor` | `BookEditor` |
| `useActiveJobsPolling` | Backoff 1.5–3s |

Export: `src/gameDevWeb.ts`

```bash
npm install && npm run dev && npm run build
```
