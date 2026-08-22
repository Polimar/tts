# tts

Webapp open source: clone vocale italiano (upload audio + testo). Locale su Intel Arc GPU, poi tts.alevale.it

## Backend API (Qwen3-TTS)

FastAPI service on `0.0.0.0:8765` using **Qwen3-TTS 12Hz 0.6B Base** for voice cloning.

### Quick start

```bash
cp .env.example .env
pip install -r requirements.txt
python run.py
```

For Intel Arc (XPU), install PyTorch with XPU support and set model weights locally if needed (`TTS_MODEL_LOCAL_DIR`).

Mock mode (no GPU/model): `TTS_MOCK_WORKER=1 python run.py`

### Docker

```bash
docker compose up --build
```

Data persists in the `tts-data` volume.

### Auth

Bearer token from `POST /auth/register` or `POST /auth/login`. Pass `Authorization: Bearer <token>` on all private routes.

### Main routes

| Route | Description |
|-------|-------------|
| `GET /health` | Liveness + worker device |
| `GET /system/device` | XPU gate / warmup stats |
| `POST /auth/register` | Create account + token |
| `POST /auth/login` | Login + token |
| `POST /auth/logout` | Revoke token |
| `GET /auth/me` | Current user |
| `POST /voices` | Upload reference audio + `ref_text` |
| `GET /voices` | List own voices |
| `GET /voices/{id}` | Get voice |
| `DELETE /voices/{id}` | Delete voice |
| `POST /jobs` | Enqueue synthesis (`voice_id`, `text`, `language`) |
| `GET /jobs` | List own jobs |
| `GET /jobs/{id}` | Poll status |
| `GET /jobs/{id}/download/wav` | Download WAV |
| `GET /jobs/{id}/download/mp3` | Download MP3 |

Job states: `queued` → `running` → `completed` | `failed`
