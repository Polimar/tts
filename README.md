# tts

Webapp open source per clone vocale italiano (upload audio + testo). Target locale: **Windows** con Intel Arc (XPU, quando disponibile); produzione via **Nginx Proxy Manager** su `tts.alevale.it`.

## Stack (piano attuale)

| Componente | Dettaglio |
|---|---|
| Modello | **Qwen3-TTS-12Hz-0.6B-Base** (`Qwen/Qwen3-TTS-12Hz-0.6B-Base`) |
| API | FastAPI + autenticazione per utente |
| Worker | Processo Qwen3-TTS con **coda GPU seriale** (un job alla volta) |
| Export | WAV / MP3, chunking per libri |
| Target OS locale | Windows (CPU o XPU; validazione GPU separata) |

**Non** è il percorso primario: XTTS, Coqui TTS, TTS-OV. Documentazione legacy su quei stack è obsoleta.

Il backend implementa l’app FastAPI, il worker e la logica di business. Questo repo documenta **come eseguire** il servizio e le variabili d’ambiente DevOps (`HOST`, `PORT`, `DATA_DIR`, secrets).

---

## Requisiti (Windows)

- Windows 10/11 (64-bit)
- Python **3.10+** (3.11 consigliato)
- Git
- (Opzionale, futuro) Intel Arc + driver + `torch` con supporto XPU — **non garantito** in questa fase; default **CPU**

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

Quando il backend aggiunge `requirements.txt` / `pyproject.toml`:

```powershell
pip install -r requirements.txt
```

Per sviluppo con reload (esempio, adatta al modulo reale):

```powershell
pip install uvicorn[standard]
```

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
| `DATA_DIR` | `./data` | Root isolata per upload, voci, job, export |

L’app legge queste variabili tramite `tts_server.config` (vedi sotto).

### 4. Avvio API (bind `0.0.0.0:8765`)

**Non** usare `127.0.0.1` o `localhost` come host se NPM deve raggiungere il processo da un altro host.

```powershell
# Opzione A — uvicorn esplicito (consigliato finché il backend non espone un entrypoint)
$env:HOST = "0.0.0.0"
$env:PORT = "8765"
uvicorn tts_server.main:app --host $env:HOST --port $env:PORT

# Opzione B — quando il backend aggiunge main con Settings
python -m tts_server
```

Verifica bind:

```powershell
curl http://127.0.0.1:8765/health
# oppure, da un altro PC sulla LAN:
curl http://<IP-WINDOWS>:8765/health
```

### Health check

Endpoint previsto: `GET /health` (o `GET /api/health` — allineare con il backend).

Risposta attesa: HTTP 200 con stato del servizio (es. `{"status":"ok"}`). NPM può usare questo URL per il health check del proxy.

Se l’endpoint non esiste ancora, il proxy può puntare alla root o a un path API documentato dal backend.

---

## Directory dati e cache

### `DATA_DIR` (default `./data`)

Root per dati utente-isolati (il backend crea sottocartelle per utente):

```
data/
├── uploads/     # audio di riferimento in ingresso
├── voices/    # profili vocali per utente
├── jobs/      # metadati / stato job TTS
└── outputs/   # WAV / MP3 generati
```

`DATA_DIR` è configurabile via `.env`; non committare il contenuto.

### Cache modelli Hugging Face

Il worker scarica `Qwen/Qwen3-TTS-12Hz-0.6B-Base` (~2,5 GB). Cache tipica:

| Variabile | Default Windows | Note |
|---|---|---|
| `HF_HOME` | `%USERPROFILE%\.cache\huggingface` | Root cache HF |
| `TRANSFORMERS_CACHE` | sotto `HF_HOME` | Modelli transformers |
| `MODEL_CACHE_DIR` | (opzionale) | Override esplicito in `.env.example` |

Primo avvio: download lungo; pianificare spazio disco (~5 GB tra modello e cache).

### Device / GPU

| `TTS_DEVICE` | Significato |
|---|---|
| `cpu` | Default sicuro su Windows |
| `xpu` | Intel Arc / XPU — **sperimentale**, richiede stack torch+XPU validato separatamente |
| `cuda` | Non target per questo deploy Windows-first |

La coda GPU è **seriale**: un solo job inference alla volta; non avviare più worker sullo stesso GPU.

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
4. **Health check** (se disponibile): `http://<IP>:8765/health`
5. **Upload limits**: allineare `client_max_body_size` in NPM con `MAX_UPLOAD_BYTES` in `.env` (es. 50 MB)

Non esporre `8765` su Internet se NPM è il punto di ingresso: solo NPM deve raggiungere il backend.

---

## Docker Compose

**Non usato** per il percorso primario: singolo processo Python su Windows con GPU/XPU.

Se in futuro servono Redis o DB opzionali, aggiungere un `docker-compose.yml` separato; non è richiesto per il worker Qwen3-TTS locale.

---

## Configurazione in codice (`tts_server.config`)

Modulo DevOps minimo che centralizza `HOST`, `PORT`, `DATA_DIR` da ambiente:

```python
from tts_server.config import settings

print(settings.host, settings.port, settings.data_dir)
```

Il backend FastAPI dovrebbe importare `settings` invece di hardcodare host/porta/path.

---

## Sicurezza

- Copia `.env.example` → `.env`; **non** committare `.env` o secrets reali.
- Rotazione periodica di `JWT_SECRET` / `API_KEY` se usati.
- `DATA_DIR` e output audio sono dati sensibili: backup e permessi OS appropriati.

---

## Licenza

Vedi repository e licenza del modello Qwen3-TTS (Apache-2.0 su Hugging Face).
