# Brief Sound Designer — TTS vocale italiano (Polimar)

**Versione:** 1.0 (v1) + appendice Dialoghi (v1.1)  
**Stack motore:** Qwen3-TTS 0.6B Base, PyTorch XPU (Intel Arc) — **non** XTTS, **non** OpenVINO  
**Bind servizio:** `0.0.0.0:8765`  
**Deploy:** workstation Windows locale → `tts.alevale.it`  
**Audience doc:** Backend audio, Sound Designer, Frontend, Game Designer  
**Allineamento UI:** [`docs/ui/BRIEF.md`](../ui/BRIEF.md) (PR #1) — questo documento fornisce i valori tecnici referenziati come «da Sound Designer».

---

## Contesto pipeline

La webapp clona voci da campioni uploadati e sintetizza testo/libri/dialoghi in italiano. Ogni fase audio (ingest clone, render TTS, loudness, stitch, export) è **deterministica** e produce file riproducibili: il player UI riproduce **gli stessi file** scaricabili (nessun mix parallelo).

```
[Upload clone] → QC ingest → resample 24 kHz mono → embedding voce
[TTS chunk]    → render → loudnorm per-chunk → (volume override turno) → stitch/gap → loudnorm finale → export WAV/MP3
```

---

## 1. Upload clone voce

**Scopo:** creare l'embedding speaker da un campione parlato pulito. Validazione **sincrona** al submit; job voce **bloccato** su QC hard reject.

### Formati accettati (v1)

| Formato | Estensioni / container | Note |
|---------|------------------------|------|
| **FLAC** | `.flac` | **Preferito** — lossless, nessuna ricodifica se già mono 24 kHz |
| WAV | `.wav` | PCM comune |
| MP3 | `.mp3` | Decode → pipeline interna |
| M4A / AAC | `.m4a`, `.aac` | Decode → pipeline interna |

### Formati rifiutati (v1)

| Categoria | Esempi | Motivo |
|-----------|--------|--------|
| Container video | `.mp4`, `.mkv`, `.webm`, `.mov` | Fuori scope; estrazione audio non in v1 |
| MIDI | `.mid`, `.midi` | Non audio PCM |
| OGG / Opus | `.ogg`, `.opus` | **Posticipato** a v1.x — decode Opus non in scope v1 |

Messaggio utente (IT): *«Formato non supportato. Usa WAV, FLAC, MP3 o M4A.»*

### Pre-processing ingest (obbligatorio)

| Parametro | Regola |
|-----------|--------|
| **Canali** | Se stereo (o >1 canale): downmix **mono** `L+R / 2` (media aritmetica per campione) |
| **Sample rate ingresso** | Accetta **16–48 kHz**; sempre **resample a 24 kHz** prima del modello |
| **Bit depth** | Normalizza a float32 interno; export clone di riferimento non richiesto in v1 |

### Durata campione

| Soglia | Valore | Effetto |
|--------|--------|---------|
| Minimo | **8 s** | QC **reject** |
| Massimo | **90 s** | QC **reject** |
| Raccomandato | **15–30 s** | Soft warn se fuori range ma dentro 8–90 s |

**Contenuto raccomandato:** un solo speaker, parlato continuo, **senza music bed**, ambiente silenzioso, niente effetti o riverbero pesante.

### QC — hard reject (job bloccato)

Il job voce passa a stato **Errore** / **Bloccato** con messaggio user-facing. Nessun embedding generato.

| Controllo | Soglia | Messaggio utente (IT) |
|-----------|--------|------------------------|
| Hard clipping | > **~1%** campioni a full scale (|sample| ≥ 0.99) | *«Audio distorto (clipping). Registra di nuovo con livelli più bassi.»* |
| Loudness eccessiva | Integrated loudness **> −8 LUFS** | *«Audio troppo forte. Obiettivo parlato: circa −16 LUFS.»* |
| Durata | < 8 s o > 90 s | *«Durata non valida (min 8 s, max 90 s).»* |

### QC — soft warn (job consentito)

Il clone procede; UI mostra **avviso non bloccante** sulla card voce.

| Controllo | Soglia / euristica | Messaggio utente (IT) |
|-----------|-------------------|------------------------|
| Noise floor alto | RMS in pause > **−40 dBFS** | *«Rumore di fondo elevato — la qualità del clone potrebbe calare.»* |
| Musica rilevata | Flag euristica (detector TBD oltre soglia RMS pause) | *«Possibile musica di sottofondo — usa parlato pulito.»* |

> **Nota implementativa:** per v1 non serve un classifier ML musica/parlato. Il flag «musica» può derivare da euristica spettrale semplice **oltre** la soglia RMS pause; documentare l'euristica scelta in log, non in UI.

### Stato UI (riferimento)

Vedi [`docs/ui/BRIEF.md`](../ui/BRIEF.md) § Libreria voci: formati accettati, durata massima e indicazioni loudness sono ora definiti qui.

---

## 2. Loudness

Target unificato per parlato web/app e export. Usare **loudnorm** (EBU R128) con true peak limit — **non** un limiter brickwall che pompa il breath noise.

### Target globale

| Parametro | Valore |
|-----------|--------|
| Integrated loudness | **−16 LUFS** |
| True peak | **−1.5 dBTP** |

### Pipeline loudness

```
render TTS chunk
  → loudnorm (−16 LUFS, −1.5 dBTP)
  → [opzionale] volume override turno (dialoghi)
  → stitch / concat gap
  → loudnorm finale su file intero (−16 LUFS, −1.5 dBTP)
  → export
```

| Fase | Quando | Perché |
|------|--------|--------|
| **Per-chunk** | Dopo ogni render TTS (turno dialogo, chunk libro, job testo breve) | Chunk con livelli diversi non devono sommare in stitch |
| **Post-stitch** | Sul file concatenato completo | I gap di silenzio non devono abbassare il loudness percepito del mix |
| **Post-concat libro** | Dopo concat frasi/paragrafi | Stessa logica dei dialoghi |

**Vincolo:** evitare limiter aggressivo post-loudnorm che alza il rumore di respiro/breath tra frasi. Il true peak a −1.5 dBTP è sufficiente per headroom web.

### Volume override per turno (Game Designer, v1.1)

| Campo | Default | Regola |
|-------|---------|--------|
| `volume` | **1.0** | Gain lineare applicato **dopo** loudnorm del chunk |
| Post-gain | — | True-peak limit **−1.5 dBTP** sul chunk modificato (prima dello stitch) |

Formula: `sample_out = clamp( sample_in * volume , true_peak_limit )`

---

## 3. Gap / stitch — Dialoghi (v1.1)

Allineato a [`docs/ui/BRIEF.md`](../ui/BRIEF.md) § Dialoghi e lock Game Designer.

### Costante prodotto

| Parametro | Valore |
|-----------|--------|
| Gap default tra turni | **350 ms** di silenzio digitale (**zero-crossing non richiesto** — silenzio PCM a 0) |
| Override per-turno | **0–1500 ms** su `pre` e/o `post` |
| Slider globale in Impostazioni | **Assente** (lock prodotto) |

### Regole di composizione gap

Per la giunzione tra turno **A** e turno **B**:

1. Se turno **A** ha `postGapMs` definito → usa **A.post** (ms di silenzio dopo A).
2. Altrimenti se turno **B** ha `preGapMs` definito → usa **B.pre**.
3. Se **entrambi** `A.post` e `B.pre` esistono → applica **entrambi** in sequenza (`A` audio → `A.post` silenzio → `B.pre` silenzio → `B` audio). **Non** aggiungere anche i 350 ms default su quella giunzione.
4. Se **nessuno** dei due override → inserisci **350 ms** di silenzio.

```
giunzione(A→B) =
  A.postGapMs ?? 0
  + B.preGapMs ?? 0
  + (se A.postGapMs e B.preGapMs assenti: 350 ms)
```

### Export dialogo

| Artefatto | Contenuto gap | Loudness |
|-----------|---------------|----------|
| **Stitch** (WAV/MP3 job) | Gap applicati | Post-stitch loudnorm (−16 / −1.5) |
| **ZIP clip isolate** | **NO gap** — clip **dry** per turno | Per-chunk loudnorm già applicata; **no** gap baked |

### Voce mancante

Se un turno referenzia voce non pronta o assente:

- **Non** generare silenzio placeholder.
- Turno / job resta **Bloccato** (stato coda UI).
- Nessun fallback silenzioso — allineato al contratto Game Designer.

---

## 4. Export

L'utente sceglie **una volta** il formato (WAV o MP3) per job; vale per file stitch **e** per le clip nello ZIP dialogo.

### WAV (nativo v1)

| Parametro | Valore |
|-----------|--------|
| Codec | PCM |
| Bit depth | **16-bit** |
| Sample rate | **24 kHz** |
| Canali | **Mono** |

> **v1 only:** nessun upsample 48 kHz. Opzione DAW 48 kHz è **posticipata**.

### MP3

| Parametro | Valore |
|-----------|--------|
| Modalità | **CBR** |
| Bitrate | **192 kbps** |
| Canali | **Mono** |
| Sample rate | **24 kHz** |

**Scelta encoder (lock):** usare `ffmpeg` con `-ar 24000 -ac 1 -b:a 192k` (libmp3lame). Sample rate **24 kHz** per coerenza col WAV nativo; non upsample a 44.1 kHz in v1.

### Naming file

| Tipo | Pattern | Esempio |
|------|---------|---------|
| Output job | `{jobId}_{voiceOrDialogo}.{wav\|mp3}` | `a1b2c3_maria.wav` |
| ZIP clip dialogo | `{jobId}_clips.zip` | `a1b2c3_clips.zip` |

- `voiceOrDialogo`: slug nome voce (libro/testo) o titolo dialogo; sanitizzare a `[a-zA-Z0-9_-]`.
- Clip dentro ZIP: `{jobId}_{turnIndex}_{characterSlug}.{ext}` (es. `a1b2c3_03_luca.wav`).

### Libri vs dialoghi export

| Tipo job | WAV/MP3 finale | ZIP clip |
|----------|----------------|----------|
| Testo / Libro (mono-voce) | Sì | **No** in v1 |
| Dialogo (v1.1) | Sì (stitch) | Sì (dry, no gap) |

---

## 5. Libri — job testo singolo (non dialogo)

Un job libro = **una voce**, testo lungo chunkato server-side. UI mostra solo progresso (`Chunk 3/12`); logica qui.

### Chunking testo

| Regola | Dettaglio |
|--------|-----------|
| Delimitatori frase (IT) | `.` `!` `?` `…` (e varianti Unicode ellipsis) |
| Pack frasi | Accumula frasi fino a **~1800 caratteri** |
| Hard cap chunk | **4000 caratteri** — stesso limite turno dialogo |
| Regola pack | Se aggiungere la frase successiva supererebbe 4000 → chiudi chunk corrente, nuova frase nel chunk successivo |
| Mid-sentence | **Mai** spezzare a metà frase |

### Frase singola > 4000 caratteri (eccezione)

Ordine di split, in cascata:

1. Virgola `,` o punto e virgola `;`
2. Spazio
3. **Ultima risorsa:** mid-word con trattino — loggare in log server **solo** (non mostrare all'utente)

### Silenzio intra-libro (concat)

| Giunzione | Silenzio |
|-----------|----------|
| Tra frasi (stesso paragrafo) | **180 ms** |
| Tra paragrafi (riga vuota nel sorgente) | **400 ms** |

Silenzio = zeri PCM, come i gap dialogo.

### Loudness libro

Identica a §2: loudnorm per-chunk dopo render, loudnorm finale sul file concatenato.

---

## 6. Player

Contratto playback Frontend ↔ file su disco.

| Azione UI | File riprodotto | Note |
|-----------|-----------------|------|
| Play job completato (testo/libro/dialogo stitch) | **Stesso file** dell'export download (post-normalized) | Nessun secondo mix o preview degradato |
| Preview turno dialogo | Clip **dry** del turno (loudnorm per-chunk, **senza** gap) | Coerente con contenuto ZIP |
| Play stitch dialogo | File stitch post-loudnorm (gap inclusi) | Coerente con download WAV/MP3 |

La velocità preview UI (playback rate) **non** altera i file generati — solo ascolto locale.

---

## 7. Dipendenze cross-team

| Team | Consuma da questo brief | Fornisce |
|------|-------------------------|----------|
| **Frontend** | Formati upload, messaggi QC, naming download, contratto player | Superficie upload, player, download |
| **Game Designer** | Gap 350 ms, override 0–1500 ms, volume turno, no fallback silenzioso | Schema turno/personaggio in UI brief |
| **Backend** | Tutta la pipeline ingest/TTS/export | API job stati, file storage, progress % |
| **2D / UI** | Messaggi errore/warn testuali | Copy IT in componenti |

---

## 8. Fuori scope (questo documento)

- Implementazione codice Python / ffmpeg / PyTorch
- Modifiche al peso Qwen3-TTS o training
- OGG/Opus ingest, upsample 48 kHz export, ZIP chunk libro
- Detector ML musica/parlato oltre euristica RMS pause
- Condivisione voci tra utenti

---

## Checklist accettazione audio (v1)

- [ ] Ingest accetta FLAC/WAV/MP3/M4A; rifiuta video/MIDI/OGG con messaggio IT
- [ ] Downmix mono, resample 24 kHz, durata 8–90 s enforced
- [ ] QC hard reject: clipping ~1%, > −8 LUFS, durata
- [ ] QC soft warn: RMS pause > −40 dBFS, flag musica
- [ ] Loudnorm −16 LUFS / −1.5 dBTP per-chunk + post-stitch/concat
- [ ] Libro: chunk frasi ~1800 / cap 4000, silenzio 180/400 ms, no ZIP
- [ ] Export WAV 16-bit 24 kHz mono; MP3 CBR 192k mono 24 kHz
- [ ] Naming `{jobId}_{voiceOrDialogo}.ext` e `{jobId}_clips.zip`
- [ ] Player usa stessi file dell'export; preview turno = clip dry

### v1.1 aggiuntive

- [ ] Gap 350 ms default; override pre/post 0–1500 ms senza doppio gap
- [ ] ZIP clip dry senza gap; stitch con gap + loudnorm finale
- [ ] Volume turno lineare post-loudnorm + true peak −1.5 dBTP
- [ ] Voce mancante → bloccato, no silenzio generato

---

## Changelog brief

| Data | Versione | Note |
|------|----------|------|
| 2026-08-22 | 1.0 | Prima stesura Sound Designer; allineamento `docs/ui/BRIEF.md` PR #1 |
