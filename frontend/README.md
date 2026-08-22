# Frontend TTS

UI italiana (Vite + React). Proxy dev: `/api/v1` → `:8765`.

## Game Dev Web

Integrato negli extension point Frontend:

| Entry point | Componente |
|-------------|------------|
| `AudioPlayer.waveformSlot` | `WaveformSlot` — forma d'onda seekable |
| `data-gdw-book-editor` | `BookEditor` — modalità Libro in `/nuovo` |
| `useActiveJobsPolling` | Backoff 1.5–3s su job `queued`/`running` |

Export: `src/gameDevWeb.ts`

```bash
npm install && npm run dev && npm run build
```
