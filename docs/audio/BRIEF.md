# Brief Sound Designer — TTS vocale italiano (Polimar)

**Versione:** 1.2 (v1) + appendice Dialoghi (v1.1)  
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

Messaggio utente: chiave `errUploadFormat` (§7).

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

| Controllo | Soglia | Chiave copy (§7) |
|-----------|--------|------------------|
| Hard clipping | > **~1%** campioni a full scale (|sample| ≥ 0.99) | `errUploadClip` |
| Loudness eccessiva | Integrated loudness **> −8 LUFS** | `errUploadClip` |
| Durata min | < **8 s** | `errUploadTooShort` |
| Durata max | > **90 s** | `errUploadTooLong` |
| Multi-speaker / musica | Euristica detector (v1) | `errUploadMultiSpeaker` |
| Silenzio / nessun parlato | Livello parlato sotto soglia | `errUploadSilent` |

### QC — soft warn (job consentito)

Il clone procede; UI mostra **avviso non bloccante** sulla card voce.

| Controllo | Soglia / euristica | Chiave copy (§7) |
|-----------|-------------------|------------------|
| Noise floor alto | RMS in pause > **−40 dBFS** | `warnUploadNoisy` |
| Musica rilevata | Flag euristica (detector TBD oltre soglia RMS pause) | `errUploadMultiSpeaker` (hard reject) o warn dedicato in v1.x |

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

Allineato al contratto [`docs/design/DIALOGUE.md`](../design/DIALOGUE.md) e [`dialogue-v1.1.schema.json`](../design/dialogue-v1.1.schema.json) (PR #11), più [`docs/ui/BRIEF.md`](../ui/BRIEF.md) § Dialoghi.

### Campi rilevanti per lo stitch

| Entità | Campo | Ruolo nello stitch |
|--------|-------|-------------------|
| **Dialogue** | `defaultGapMs` | Costante **350** ms — silenzio dopo ogni turn (prima del successivo) se il turn non ha override. **Non** è uno slider in Impostazioni. |
| **Turn** | `gapMs` (opzionale) | Override **0–1500** ms di silenzio **dopo** l'audio di quel turn, prima del turn successivo. Se omesso → `defaultGapMs`. |
| **Turn** | `characterId` | Risolve il parlante; la voce effettiva è `Character.voiceId`. |
| **Character** | `voiceId` | Voce clonata **ready**; se assente al generate → turn/job **blocked** (§ sotto). |

> **Lock schema:** un solo gap per turn — **dopo** il turn, **prima** del successivo. **Nessuna** coppia `pre`/`post`; non documentare né implementare pause pre/post separate.

### Regole di composizione gap

Silenzio = zeri PCM (24 kHz mono), senza fade.

Per ogni turno all'indice `i` in `turns[]` (ordinati):

1. Concatena l'audio TTS renderizzato del turn.
2. Se `i` è l'**ultimo** turn → **nessun** silenzio finale (trailing gap ignorato; `gapMs` sull'ultimo turn = 0 effettivo).
3. Altrimenti inserisci `gapMs` del turn corrente, oppure `defaultGapMs` (**350**) se `gapMs` è omesso.

```
per ogni turn[i] in turns:
  stitch += render_tts(turn[i])
  se i < len(turns) - 1:
    gap = turn[i].gapMs ?? dialogue.defaultGapMs   // defaultGapMs = 350
    stitch += silence(gap)
```

| Parametro | Valore |
|-----------|--------|
| `defaultGapMs` | **350** (costante prodotto, non in Impostazioni) |
| `gapMs` override | **0–1500** ms, solo sul singolo turn |
| Ultimo turn | Nessun gap trailing |

### Pipeline stitch

1. Un job dialogue = **N render TTS** (un chunk per `turn`).
2. Concat WAV in ordine con gap come sopra.
3. **Loudnorm** finale sul file stitch (−16 LUFS / −1.5 dBTP, §2).

### Export dialogo

| Artefatto | Contenuto gap | Loudness |
|-----------|---------------|----------|
| **Stitch** (WAV/MP3 job) | Gap applicati | Post-stitch loudnorm (−16 / −1.5) |
| **ZIP clip isolate** | **NO gap** — clip **dry** per turno | Per-chunk loudnorm già applicata; **no** gap baked |

### Voce mancante

Se `Character.voiceId` non punta a una voce **ready** al momento del generate:

- **Non** generare silenzio placeholder.
- Turno / job resta **Bloccato** (stato coda UI).
- Nessun fallback silenzioso — copy `errVoiceMissing` / `errVoiceMissingJob` (§7).
- CTA bloccato: **«Vai alle voci»** → `/voci`.

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

## 7. Copy errori e hint (IT) — Frontend

Stringhe user-facing **canoniche** per il Frontend. Chiavi in **camelCase EN**; copy in italiano — usare **esattamente** come sotto (il Frontend le binda 1:1).

### Limiti ingest (invarianti)

| Regola | Valore |
|--------|--------|
| Formati accettati | WAV, FLAC, MP3, M4A |
| Durata | **8–90 s** (hint: **15–30 s**) |
| Speaker | **Un solo parlante**, senza musica |
| Canali | Stereo → downmix mono `L+R / 2` |
| Sample rate modello | Resample **24 kHz** |
| Hard reject | Clipping ~1% **oppure** loudness integrata **> −8 LUFS** |
| Voce mancante | Job/turno **Bloccato** — **nessun** fallback silenzioso |
| Gap default dialoghi | `defaultGapMs = 350` — **non** esposto in Impostazioni |

### Tabella chiavi

| Chiave | Copy (IT) |
|--------|-----------|
| `errUploadFormat` | Formato non supportato. Usa WAV, FLAC, MP3 o M4A. |
| `errUploadTooShort` | Audio troppo corto. Serve almeno 8 secondi di parlato. |
| `errUploadTooLong` | Audio troppo lungo. Massimo 90 secondi. |
| `errUploadMultiSpeaker` | Sembra ci siano più voci. Carica un solo parlante, senza musica. |
| `errUploadClip` | Audio distorto o troppo forte. Registra di nuovo senza clipping. |
| `errUploadSilent` | Non sento parlato. Controlla microfono e volume. |
| `warnUploadNoisy` | C'è molto rumore di fondo. Puoi usarlo, ma il clone uscirà meno pulito. |
| `errVoiceMissing` | Manca la voce di questo personaggio. Vai alle Voci per clonarla. |
| `errVoiceMissingJob` | Job bloccato: voce assente. Nessun silenzio al posto della voce. |
| `errExportFailed` | Esportazione non riuscita. Riprova o scarica in WAV. |
| `errStitchFailed` | Non ho potuto unire i turni. Controlla i gap e riprova. |
| `hintUploadDuration` | 8–90 secondi, meglio 15–30. Un parlante, senza musica. |

### CTA stato Bloccato

| Elemento | Valore |
|----------|--------|
| Label | **Vai alle voci** |
| Route | `/voci` |

Usare insieme a `errVoiceMissing` (turno/dialogo editor) o `errVoiceMissingJob` (riga coda / dettaglio job).

### Mapping evento → chiave (riferimento Backend)

| Evento | Chiave |
|--------|--------|
| Estensione/container non supportato | `errUploadFormat` |
| Durata < 8 s | `errUploadTooShort` |
| Durata > 90 s | `errUploadTooLong` |
| Clipping o loudness > −8 LUFS | `errUploadClip` |
| Multi-speaker / musica rilevata (hard) | `errUploadMultiSpeaker` |
| Nessun parlato rilevato | `errUploadSilent` |
| Rumore di fondo alto (soft warn) | `warnUploadNoisy` |
| Turno dialogo senza voce pronta | `errVoiceMissing` |
| Job in coda bloccato per voce assente | `errVoiceMissingJob` |
| Export WAV/MP3 fallito | `errExportFailed` |
| Stitch turni fallito | `errStitchFailed` |
| Placeholder / helper upload | `hintUploadDuration` |

---

## 8. Dipendenze cross-team

| Team | Consuma da questo brief | Fornisce |
|------|-------------------------|----------|
| **Frontend** | Formati upload, messaggi QC (§7), naming download, contratto player | Superficie upload, player, download, bind chiavi §7 |
| **Game Designer** | `defaultGapMs` 350, `gapMs` 0–1500 per turn, no fallback silenzioso | [`docs/design/dialogue-v1.1.schema.json`](../design/dialogue-v1.1.schema.json) |
| **Backend** | Tutta la pipeline ingest/TTS/export | API job stati, file storage, progress % |
| **2D / UI** | Messaggi errore/warn testuali | Copy IT in componenti |

---

## 9. Fuori scope (questo documento)

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
- [ ] Copy IT §7 bindata 1:1 (chiavi camelCase EN)

### v1.1 aggiuntive

- [ ] `defaultGapMs` 350; `gapMs` opzionale 0–1500 dopo ogni turn (non sull'ultimo); nessun pre/post
- [ ] ZIP clip dry senza gap; stitch con gap + loudnorm finale
- [ ] Volume turno lineare post-loudnorm + true peak −1.5 dBTP
- [ ] Voce mancante → bloccato, no silenzio generato

---

## Changelog brief

| Data | Versione | Note |
|------|----------|------|
| 2026-08-22 | 1.0 | Prima stesura Sound Designer; allineamento `docs/ui/BRIEF.md` PR #1 |
| 2026-08-22 | 1.1 | §7 copy errori/hint IT per Frontend (chiavi camelCase) |
| 2026-08-22 | 1.2 | §3 stitch allineato a `docs/design/` PR #11 — `gapMs` singolo, no pre/post |
