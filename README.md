# tts

Webapp open source per clone vocale italiano (upload audio + testo). Target locale: **Windows su CPU**; produzione via **Nginx Proxy Manager** su `tts.alevale.it`.

## Stack (piano attuale)

| Componente | Dettaglio |
|---|---|
| Modello | **Qwen3-TTS-12Hz-0.6B-Base** (`Qwen/Qwen3-TTS-12Hz-0.6B-Base`) |
| API | FastAPI + autenticazione per utente |
| Worker | Processo Qwen3-TTS con **coda inference seriale** (un job alla volta) |
| Export | WAV / MP3, chunking per libri |
| Target OS locale | Windows (**CPU** — percorso supportato) |

**Non** è il percorso primario: XTTS, Coqui TTS, TTS-OV. Documentazione legacy su quei stack è obsoleta.

Il backend implementa l’app FastAPI, il worker e la logica di business. Questo repo documenta **come eseguire** il servizio e le variabili d’ambiente DevOps (`HOST`, `PORT`, `DATA_DIR`, secrets).

---

## Requisiti (Windows)

- Windows 10/11 (64-bit)
- Python **3.10+** (3.11 consigliato)
- Git
- Inference su **CPU** (`TTS_DEVICE=cpu`); Intel Arc / XPU **non** è il percorso locale supportato (vedi sotto)

---

## Setup locale (Windows)

### 1. Clone e virtualenv

```powershell
git clone https://github.com/Polimar/tts.git
cd tts

py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

### 2. Dipendenze

```powershell
pip install -r requirements.txt
```

Test senza modello/GPU: imposta `MOCK_WORKER=1` in `.env`.

### 3. Configurazione ambiente

```powershell
copy .env.example .env
# Modifica .env — non committare .env
```

Variabili critiche per DevOps:

| Variabile | Default | Uso |
|---|---|---|
| `HOST` | `0.0.0.0` | Bind di rete (obbligatorio per NPM sulla LAN) |
| `PORT` | `8765` | Porta API |
| `DATA_DIR` | (fuori repo, vedi sotto) | Root isolata per upload, voci, job, export |

L’app legge queste variabili tramite `tts_server.config` (vedi sotto).

### 4. Avvio API (bind `0.0.0.0:8765`)

**Non** usare `127.0.0.1` o `localhost` come host se NPM deve raggiungere il processo da un altro host.

```powershell
uvicorn tts_server.main:app --host 0.0.0.0 --port 8765
```

Oppure con variabili da `.env` (uvicorn non legge `.env`; esporta o usa un runner che carica dotenv):

```powershell
$env:HOST = "0.0.0.0"
$env:PORT = "8765"
uvicorn tts_server.main:app --host $env:HOST --port $env:PORT
```

Verifica bind:

```powershell
curl http://127.0.0.1:8765/health
# oppure, da un altro PC sulla LAN:
curl http://<IP-WINDOWS>:8765/health
```

### Health check

`GET /health` — pubblico, senza auth. Risposta minima: `{"status":"ok"}` (nessun path, secret, device o dump env).

---

## Directory dati e cache

### `DATA_DIR` (default fuori dal repository)

Se `DATA_DIR` non è impostato:

| OS | Percorso default |
|---|---|
| Windows | `%LOCALAPPDATA%\Polimar\tts` |
| Linux | `~/.local/share/polimar-tts` (o `$XDG_DATA_HOME/polimar-tts`) |

Il backend crea la directory con permessi owner-only (non world-writable). File utente sotto `users/<user_id>/`:

```
<DATA_DIR>/
├── users/
│   └── <user_id>/
│       ├── voices/<voice_id>/   # audio di riferimento
│       └── exports/<job_id>/    # WAV / MP3 generati
└── tts.db                       # metadati (SQLite)
```

Override esplicito via `.env` solo se necessario; non committare il contenuto.

### Cache modelli Hugging Face

Il worker scarica `Qwen/Qwen3-TTS-12Hz-0.6B-Base` (~2,5 GB). Cache tipica:

| Variabile | Default Windows | Note |
|---|---|---|
| `HF_HOME` | `%USERPROFILE%\.cache\huggingface` | Root cache HF |
| `TRANSFORMERS_CACHE` | sotto `HF_HOME` | Modelli transformers |
| `MODEL_CACHE_DIR` | (opzionale) | Override esplicito in `.env.example` |

Primo avvio: download lungo; pianificare spazio disco (~5 GB tra modello e cache).

### Device inference (`TTS_DEVICE`)

Default: **`cpu`**. Il worker locale su Windows deve usare CPU finché non esiste un percorso XPU validato end-to-end.

| `TTS_DEVICE` | Stato |
|---|---|
| `cpu` | **Supportato** — default e percorso locale previsto |
| `xpu` | **NO-GO** su hardware testato — non usare in produzione locale |
| `cuda` | Non target per questo deploy Windows-first |

#### XPU: esito ricerca Gate 2 (fail-closed)

Su **Windows Ultra 9 285H + Intel Arc 140T** (torch 2.13.0+xpu):

| Percorso | Esito |
|---|---|
| `.to("xpu")` su modello caricato su CPU | **Broken** — input ids su CPU, pesi su XPU, generate crash |
| `device_map="xpu"` + load dedicato | Generate **completa** (`memory_allocated > 0`), warmup ~15.7s poi ~6.86s |
| CPU sullo stesso testo | **4.96s** → XPU ancora **più lento** → **NO-GO** |
| `.to("cpu")` dopo tentativo XPU | **Unsafe** — ids residui su XPU; non usare `.to()` tra device |

**Regole worker (implementate):**

1. Default `TTS_DEVICE=cpu`.
2. XPU solo se `TTS_DEVICE=xpu`, warmup generate **completo** su load `device_map="xpu"` **e** latenza **minore** di CPU sullo stesso testo.
3. Fail-closed = **dispose + reload** del modello (`device_map="cpu"`), mai spostare tensori con `.to()` tra CPU/XPU.

Non documentare Intel Arc / XPU come percorso locale supportato finché XPU batte CPU su benchmark warmup.

La coda inference è **seriale**: un solo job alla volta sul device attivo; non avviare più worker concorrenti sullo stesso accelerator.

---

## Nginx Proxy Manager → `tts.alevale.it`

NPM reverse-proxy al box Windows che espone l’API su `0.0.0.0:8765`.

1. Sul PC Windows: API in esecuzione con `HOST=0.0.0.0` e `PORT=8765`.
2. Firewall Windows: consentire inbound TCP **8765** dalla LAN / IP del server NPM (o solo da NPM se su stessa rete).
3. In NPM: **Proxy Hosts → Add Proxy Host**
   - **Domain**: `tts.alevale.it`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: IP LAN del PC Windows (es. `192.168.1.50`)
   - **Forward Port**: `8765`
   - **Websockets**: ON se l’API usa streaming SSE/WebSocket
   - **SSL**: certificato su NPM (Let’s Encrypt); backend resta HTTP su LAN
4. **Health check**: `http://<IP>:8765/health`
5. **Upload limits**: allineare `client_max_body_size` in NPM con `MAX_UPLOAD_BYTES` in `.env` (default 20 MB)

Non esporre `8765` su Internet se NPM è il punto di ingresso: solo NPM deve raggiungere il backend.

---

## Docker Compose

**Non usato** per il percorso primario: singolo processo Python su Windows (CPU).

Se in futuro servono Redis o DB opzionali, aggiungere un `docker-compose.yml` separato; non è richiesto per il worker Qwen3-TTS locale.

---

## Configurazione in codice (`tts_server.config`)

```python
from tts_server.config import settings

print(settings.host, settings.port, settings.data_dir)
```

Il backend FastAPI importa `settings` invece di hardcodare host/porta/path.

---

## Sicurezza

- Copia `.env.example` → `.env`; **non** committare `.env` o secrets reali.
- Rotazione periodica di `JWT_SECRET` / `API_KEY` se usati.
- `DATA_DIR` e output audio sono dati sensibili: backup e permessi OS appropriati.
- Route pubbliche: solo `GET /health` e `POST /auth/login`. Register richiede header `X-API-Key`.

---

## Licenza

Vedi repository e licenza del modello Qwen3-TTS (Apache-2.0 su Hugging Face).
