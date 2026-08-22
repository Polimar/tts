# Brief UI/UX — TTS vocale italiano (Polimar)

**Versione:** 1.0 (v1) + appendice Dialoghi (v1.1)  
**Stack backend:** Qwen3-TTS 0.6B Base, PyTorch XPU (Intel Arc), bind `0.0.0.0:8765`  
**Deploy:** workstation Windows locale → `tts.alevale.it`  
**Lingua UI:** italiano (unica lingua in v1)  
**Audience doc:** Frontend, Sound Designer, 2D Artist, Game Designer

**Audio source of truth:** regole di pipeline, codec e loudness in [`docs/audio/BRIEF.md`](../audio/BRIEF.md) (PR in arrivo). Questo brief descrive **solo superfici UI** — non inventare regole audio oltre quanto riportato sotto.

---

## Contesto prodotto

Webapp per clonazione vocale locale e sintesi TTS in italiano. Ogni utente ha voci private (nessuna condivisione). Il flusso core: autenticarsi → caricare/creare voci → inviare job testo/libro → monitorare coda → ascoltare e scaricare output.

**Ipotesi repo (stato attuale):** nessuna UI o route esistente; la IA sotto è **nuova** e va implementata da zero. Se in futuro emergono route diverse, allineare i nomi schermata mantenendo i contratti funzionali di questo brief.

---

## Architettura informativa (bloccata)

### App shell (post-login)

| Zona | Contenuto |
|------|-----------|
| Nav principale | **Voci** · **Nuovo job** · **Coda** · **Dialoghi** (badge `v1.1` fino a rilascio) · **Impostazioni** |
| Layout nav | Sidebar sinistra su desktop; top bar o drawer su mobile |
| Header | Email utente + **Esci** (logout) |

### Routing suggerito (allineamento futuro)

| Schermata | Path suggerito | Note |
|-----------|----------------|------|
| Login / Registrazione | `/login` | Pubblico |
| Libreria voci | `/voci` | Default post-login se 0 voci |
| Nuovo job | `/nuovo` | Editor testo/libro |
| Coda | `/coda` | Default post-login se ≥1 voce |
| Player / dettaglio job | `/coda/:jobId` | Deep link da riga coda |
| Impostazioni | `/impostazioni` | Account + preferenze export |
| Dialoghi (v1.1) | `/dialoghi` | Nav visibile con badge; contenuto placeholder o disabilitato in v1 |

### Redirect post-login

1. Se **0 voci** → `/voci` (empty state Libreria voci)
2. Altrimenti → `/coda` oppure ultimo job aperto (preferenza: **Coda**)

---

## Autenticazione

**Schermata:** Login / Registrazione (`/login`)

| Elemento | Comportamento |
|----------|---------------|
| Campi | Email, Password |
| Azioni primarie | **Accedi** (login), link **Registrati** (toggle o tab) |
| Remember session | Checkbox «Ricordami» → sessione persistente (cookie/token lato backend) |
| Errori | Inline sotto il campo (es. «Email non valida», «Credenziali errate») + toast per errori di rete |
| Successo | Redirect secondo regole post-login |

**Fuori scope v1:** SSO, OAuth, reset password via email (se non già previsto dal backend — UI può mostrare solo «Cambia password» in Impostazioni se l’API esiste).

---

## 1. Libreria voci

**Path:** `/voci`  
**Scopo:** gestione voci clonate private per utente. Una voce è una **config** riusabile (es. come voce di un personaggio in v1.1), non un asset condiviso.

### Layout

- Vista **griglia** (desktop) / **lista** (mobile)
- CTA primaria: **Nuova voce**
- **Empty state (2D lock):** illustrazione microfono vuoto + CTA **Carica audio**

### Card voce

| Campo | Visualizzazione |
|-------|-----------------|
| Nome visualizzato | Titolo card |
| Durata campione clone | Es. «2:34 min» |
| Data creazione | Formato locale IT |
| Stato | Chip: **Pronta** / **In elaborazione** / **Errore** |

### Azioni card

| Azione | Tipo | Note |
|--------|------|------|
| Ascolta sample | Secondaria | Player inline o modale leggero |
| Rinomina | Secondaria | Inline edit o modale |
| Elimina | Distruttiva | Modale conferma obbligatoria |

### Flusso «Nuova voce»

1. Click **Nuova voce** → upload audio
2. **Formati accettati (UI):** WAV / FLAC (preferiti), MP3 / M4A (ok)
3. **Helper copy (sotto il dropzone):** chiave `hintUploadDuration`
4. **Validazione client-side:** misura durata file → **blocca submit** se &lt; 8 s (`errUploadTooShort`) o &gt; 90 s (`errUploadTooLong`); formato non accettato → `errUploadFormat`
5. **Hint informativo (non controllo):** «Stereo→mono e resample a 24 kHz avvengono lato server» — **nessun toggle** stereo/mono o sample rate in UI
6. Progress upload **determinato** (barra %)
7. Dopo submit → card in stato **In elaborazione** → polling o SSE fino a **Pronta** / **Errore**
8. Errore server post-upload: mappa a chiavi copy lock (`errUploadClip`, `errUploadSilent`, `errUploadMultiSpeaker`); warning qualità → `warnUploadNoisy` (non blocca). Inline card + toast

### Stati voce

```
[upload] → In elaborazione → Pronta
                         ↘ Errore (retry: nuova upload)
```

---

## 2. Editor testo / libro (Nuovo job)

**Path:** `/nuovo`  
**Scopo:** creare un job TTS mono-voce (testo breve o libro intero come **un solo job**).

### Controlli

| Controllo | Obbligatorio | Note |
|-----------|--------------|------|
| Selettore voce | Sì | Solo voci **Pronta**; se nessuna → messaggio + link «Vai a Voci» |
| Toggle modalità | — | **Testo** \| **Libro** |
| Velocità TTS | No | Slider o input; opzionale in v1 |

### Modalità Testo

- Textarea con **conteggio caratteri**
- Primary: **Genera** (disabilitato senza voce)

### Modalità Libro

- Drop file o incolla testo
- Trattato come **un unico job** (non dialogo multi-voce)
- **Progress (UI):** «Frase N / M» (o stima da backend) — **non** per-capitolo salvo titoli capitolo presenti nel sorgente
- Gap frase **180 ms** / paragrafo **400 ms**: regole **engine** (vedi `docs/audio/BRIEF.md`) — **nessuno slider** in UI
- **Download:** solo file completo WAV o MP3 — **nessun** pulsante ZIP chunk

### Azioni

| Pulsante | Priorità | v1 |
|----------|----------|-----|
| **Genera** | Primaria | Sì |
| Salva bozza | Secondaria | **Skip** se costoso; altrimenti opzionale |

### Post-submit

- Redirect a `/coda` con **focus** sul nuovo job (scroll + highlight riga)

---

## 3. Coda job

**Path:** `/coda`  
**Scopo:** monitoraggio job TTS (testo, libro, dialogo v1.1).

### Tabella

| Colonna | Contenuto |
|---------|-----------|
| Stato | In coda · In elaborazione · Completato · Errore · **Bloccato** |
| Tipo | Testo · Libro · Dialogo |
| Voce/i | Nome/i voce o personaggio |
| Creato | Data/ora |
| Durata stimata | Se disponibile da backend |
| Azioni | Apri player, Elimina (conferma), eventuale Retry su errore |

### Stato Bloccato (dialoghi e dipendenze voce)

Usato quando un turno dialogo referenzia una **voce mancante** o non pronta.

- **Mai** fallback silenzioso né **audio placeholder** su voce mancante; senza voce → **impossibile generare**
- UI: **badge ambra** «Bloccato» + personaggio/voce mancante — **nessuna illustrazione** empty-state
- CTA: **Vai alle voci** → `/voci` o **Rimuovi turno** (se API lo consente)

### Empty state (2D lock)

Lista vuota: illustrazione lista vuota + CTA **Nuovo job** → `/nuovo`

### Interazione riga

- Click riga → `/coda/:jobId` (Player / dettaglio)
- Loading lista: **skeleton**
- Job in elaborazione: progress **determinato** se backend espone %; job **Libro**: «Frase N / M» (o stima), titolo capitolo solo se presente nel sorgente

---

## 4. Player / download

**Path:** `/coda/:jobId`

### Controlli playback

| Controllo | Note |
|-----------|------|
| Waveform o barra progresso semplice | Waveform opzionale desktop; mobile: barra semplice |
| Play / Pausa | — |
| Seek | — |
| Velocità preview | Solo playback UI (≠ velocità TTS di generazione) |

### Download

Etichette esplicite (player + tooltip opzionale):

| Pulsante | Label UI | Specifica (informativa, non editabile) |
|----------|----------|------------------------------------------|
| WAV | **Scarica WAV** | PCM 16-bit · 24 kHz · mono |
| MP3 | **Scarica MP3** | 192 kbps CBR |

Formato default pre-selezionato da Impostazioni utente.

| Tipo job | Download disponibili |
|----------|---------------------|
| Testo / Libro | Solo file completo **WAV** o **MP3** — **no** ZIP chunk |
| Dialogo (v1.1) | Stitch completo **WAV** / **MP3** + **Scarica ZIP** clip isolate (dry, senza gap) |

**Loudness:** normalizzazione engine (−16 LUFS / −1.5 dBTP) — **nessuno slider loudness** in v1.

### Job dialogo (v1.1)

- Play **stitch** completo (concat con gap)
- Lista **clip per turno** con play individuale
- **Scarica ZIP** clip isolate (dry, senza gap; dettaglio in `docs/audio/BRIEF.md`)

---

## 5. Impostazioni

**Path:** `/impostazioni`

| Sezione | Campi |
|---------|-------|
| Account | Email (read-only), **Cambia password** |
| Export | Formato default: **WAV** (PCM 16-bit · 24 kHz · mono) o **MP3** (192 kbps CBR) — label come in Player |
| Lingua | IT only (v1, nessun selettore) |

**Nota (Game Designer lock):** il gap dialoghi **350 ms** è costante di prodotto — **non** compare in Impostazioni (né v1 né v1.1). Modificabile solo per-turno nell'editor (0–1500 ms).

---

## 6. Dialoghi — v1.1 (spec ora, ship dopo v1)

**Path:** `/dialoghi`  
**Nav:** voce visibile con badge **v1.1**; in v1 può mostrare placeholder «In arrivo» o editor disabilitato.

### Modello dati (lock Game Designer)

| Entità | Definizione |
|--------|-------------|
| **Dialogo** | Lista ordinata di **turni** |
| **Turno** | `characterId`, `text`, `gapMs` (0–1500 ms; default `defaultGapMs` **350**) |
| **Personaggio** | `voiceId`, `name`, `color`, `speed`, `pitch`, `avatar?` — **non** `displayName` / `avatarId` |
| **Job dialogo** | N job TTS (1 turno = 1 chunk) → concat WAV in ordine; gap stitch = **350 ms** (costante prodotto, editabile solo per-turno) |

### Regole invarianti

- **Nessuna voce nel dialogo senza clone pronto** — turno resta **Bloccato** in coda; **Genera tutto** disabilitato
- **Nessun fallback silenzioso** né audio placeholder su turno senza voce
- Dialoghi senza voci pronte → empty state con CTA **Vai alle voci** (`/voci`), non generazione
- Libri restano job **mono-voce**; i dialoghi sono **multi-voce**
- Cap: **8** personaggi, **40** turni, **4000** caratteri/turno (hard block UI)
- Gap **350 ms**: costante di prodotto (Game Designer); **solo** override per-turno 0–1500 ms nell'editor — mai in Impostazioni

### Empty state (2D lock)

Illustrazione due balloon + CTA **Vai alle voci** → `/voci`. Badge **v1.1** solo in nav, **non** sull'empty state.

### UI — Character manager

- Sidebar o modale
- Aggiungi personaggio **solo da voci esistenti** (stato Pronta)
- Campi: nome, swatch colore, default speed/pitch
- Impossibile creare personaggio senza voce pronta

### UI — Editor a colonna

Ogni riga = turno:

```
[barra colore speaker] | Select personaggio | Textarea | Gap (ms) | ⋮ azioni
```

| Funzione | Comportamento |
|----------|---------------|
| Riordino | Drag & drop |
| Aggiungi turno | In fondo |
| Duplica / Elimina | Per riga |
| Contatori | `N/8` personaggi, `N/40` turni, chars/turno con blocco a 4k |
| Preview turno | Play clip se generata; altrimenti «Genera turno» |
| Play stitch | Anteprima concat con gap |
| **Genera tutto** | Crea job dialogo in coda |

### Stati visivi riga

- Barra colore sinistra = colore personaggio
- Voce mancante: chip **Voce mancante** + riga in errore + **Genera tutto** disabilitato

### Export dialogo

- Stitch completo WAV / MP3 (con gap stitch)
- ZIP clip isolate per turno (**dry**, senza gap)

### Avatar / busti personaggio (v1.1)

Avatar opzionale per personaggio nel character manager e nell'editor turni. Il **colore UI** del personaggio resta lo **swatch** (barra riga, chip); non va dipinto sul busto.

**Asset lock (3D/2D — non rigenerare né ridisegnare):** set consegnato; file su macchina condivisa in `docs/ui/avatars/`. Frontend importa **solo** questi path — nessuna variazione artistica in app.

| Variante | Path (PNG + WebP) |
|----------|-------------------|
| Neutro | `docs/ui/avatars/avatar-neutro.png` · `docs/ui/avatars/avatar-neutro.webp` |
| Uomo | `docs/ui/avatars/avatar-uomo.png` · `docs/ui/avatars/avatar-uomo.webp` |
| Donna | `docs/ui/avatars/avatar-donna.png` · `docs/ui/avatars/avatar-donna.webp` |
| Bambino | `docs/ui/avatars/avatar-bambino.png` · `docs/ui/avatars/avatar-bambino.webp` |
| Anziano | `docs/ui/avatars/avatar-anziano.png` · `docs/ui/avatars/avatar-anziano.webp` |
| Custom | `docs/ui/avatars/avatar-custom.png` · `docs/ui/avatars/avatar-custom.webp` |

| Token | Valore |
|-------|--------|
| Frame sorgente | **512×512 px RGBA**, PNG + WebP (file sopra); **~8% margine** al bordo del quadrato (già tondo-safe) |
| Display liste | **32 / 40 px** (griglia voci, righe compatte) |
| Display editor / dettaglio | **64 / 96 px** (character manager, editor turni, card dettaglio) |
| Maschera | Circolare in **CSS** (`border-radius: 50%`), non baked nell'asset |
| Inquadratura | Testa + spalle, volto ~60% altezza frame, frontale |
| Sfondo asset | Trasparente — niente disco, ombra o glow baked |
| Stile | Illustrazione flat, 2–3 valori tonali, tratto 2 px @512, **no** outline nero, **no** fotoreal/PBR |
| Espressione | Neutra, bocca chiusa |
| Colore accent | Evitare riempimenti ampi di `#0F766E` sul busto |
| Busto mancante / senza asset | **Iniziali** del personaggio su cerchio teal `#0F766E` — **mai** placeholder volto vuoto o silhouette generica |

Selezione avatar: picker griglia nel character manager; default **Neutro** (`avatar-neutro`) alla creazione personaggio.

---

## Gerarchia visiva e stati

**Token colore (lock Frontend + 2D):** bg `#F7F4EF` · ink `#1C1916` · muted `#8A8378` · surface `#FFFDF9` · accent/teal `#0F766E`

### Identità visiva (2D lock)

| Asset | Specifica |
|-------|-----------|
| Sfondo app | Cream `#F7F4EF` |
| Accent | Teal `#0F766E` (sostituisce qualsiasi riferimento arancione precedente) |
| Icone | Linea **2 px**, stile coerente con logo |
| Logo | Palloncino + waveform |
| Favicon | Pulse bianco su tile teal `#0F766E` |

| Principio | Implementazione |
|-----------|-----------------|
| Una azione primaria per schermata | Accedi · Nuova voce · Genera · Genera tutto |
| Azioni distruttive | Sempre dietro conferma modale |
| Loading liste | Skeleton |
| Loading job | Progress determinato |
| Errori | Toast + inline (campo o job) |
| Empty states | Voci: mic → **Carica audio** · Coda: lista vuota → **Nuovo job** · Dialoghi: due balloon → **Vai alle voci** (badge v1.1 solo in nav) |
| Bloccato in coda | **Solo badge ambra** — non è uno empty state illustrato |

### Palette semantica stati

| Stato | Uso |
|-------|-----|
| Successo / Pronta / Completato | Chip verde |
| In corso | Chip/blu o animazione |
| Errore | Chip rosso + messaggio esplicativo |
| **Bloccato** | **Badge ambra** + messaggio (voce mancante); no illustrazione |
| Neutro / In coda | Chip grigio |

---

## Responsive

| Breakpoint | Comportamento |
|------------|---------------|
| Desktop first | Layout a colonne, sidebar fissa, waveform dettagliata |
| Mobile | Nav top/drawer; editor dialoghi a colonna singola; nascondere dettagli waveform |

Target primario: **workstation locale Windows** (Arc GPU).

---

## Dipendenze cross-team

| Team | Cosa consuma da questo brief | Cosa fornisce al Frontend |
|------|-------------------------------|---------------------------|
| **Sound Designer** | Superfici upload/export, progress libro | [`docs/audio/BRIEF.md`](../audio/BRIEF.md): formati, durata clone, loudness, gap engine, export codec |
| **2D Artist** | Empty states lock, identità visiva, badge v1.1, icon set 2 px | Logo (balloon+waveform), favicon, illustrazioni empty, avatar busti |
| **Game Designer** | Contratto dialoghi, gap 350 ms costante, caps, export ZIP | Schema turno/personaggio, stitch rules, gap per-turno 0–1500 ms |
| **Backend** | Auth, job states, file download | OpenAPI o equivalente per stati job/voce |

---

## Fuori scope (questo documento)

- Implementazione frontend (React, CSS, componenti)
- Modifiche al motore TTS o pipeline audio
- Condivisione voci tra utenti
- Multilingua UI oltre IT
- Controlli audio engine in UI (loudness, stereo/mono, sample rate, gap frase/paragrafo libri)
- Bozze job se backend non le supporta economicamente

---

## Checklist accettazione Frontend

- [ ] Shell con nav IT e header email/logout
- [ ] Login/registrazione con errori inline e remember session
- [ ] Libreria voci: upload WAV/FLAC/MP3/M4A, validazione durata 8–90 s client-side, helper copy
- [ ] Editor Nuovo job (Testo/Libro): progress libro «Frase N/M», no ZIP su libri
- [ ] Coda con stato Bloccato, badge ambra, no audio placeholder
- [ ] Player: label export WAV (PCM 16-bit 24 kHz mono) / MP3 (192 CBR); ZIP solo dialoghi
- [ ] Impostazioni: formato export default con label codec
- [ ] Dialoghi v1.1: editor turni, character manager, caps, export ZIP (post v1)
- [ ] Responsive desktop-first + adattamento mobile documentato

---

## Checklist implementazione (Sprint 2)

Checklist ticketabile per Frontend. **Nessun codice React in questo doc.** Tutti i lock precedenti (teal, empty states, Sound, gap 350 ms, avatar path) restano validi.

**Game Designer (JSON):** chiavi **camelCase in inglese**. Schema personaggi/dialoghi in arrivo nel repo; i **libri non sono** in quel JSON. **Non usare** `displayName` / `avatarId` — usare `name` / `avatar`.

### Empty states

| Route | Condizione | UI | CTA |
|-------|------------|-----|-----|
| `/voci` | 0 voci | Illustrazione mic (2D) | **Carica audio** |
| `/coda` | 0 job | Illustrazione lista vuota (2D) | **Nuovo job** → `/nuovo` |
| `/dialoghi` | 0 personaggi / nessuna voce pronta | Due balloon (2D) | **Vai alle voci** → `/voci` |
| Avatar assente | Personaggio senza `avatar` o file mancante | Iniziali su cerchio teal `#0F766E` | — (mai volto vuoto) |

Badge **v1.1** su Dialoghi: **solo in nav**, non sull'empty state.

### Copy keys (lock — IT)

Chiavi camelCase per i18n Frontend. **Non aggiungere stringhe** oltre questo set per upload/voce mancante.

| Chiave | Testo IT |
|--------|----------|
| `hintUploadDuration` | 8–90 secondi, meglio 15–30. Un parlante, senza musica. |
| `errUploadFormat` | Formato non supportato. Usa WAV, FLAC, MP3 o M4A. |
| `errUploadTooShort` | Audio troppo corto. Serve almeno 8 secondi di parlato. |
| `errUploadTooLong` | Audio troppo lungo. Massimo 90 secondi. |
| `errUploadClip` | Audio distorto o troppo forte. Registra di nuovo senza clipping. |
| `errUploadSilent` | Non sento parlato. Controlla microfono e volume. |
| `errUploadMultiSpeaker` | Sembra ci siano più voci. Carica un solo parlante, senza musica. |
| `warnUploadNoisy` | C’è molto rumore di fondo. Puoi usarlo, ma il clone uscirà meno pulito. |
| `errVoiceMissing` | Manca la voce di questo personaggio… |
| `errVoiceMissingJob` | Job bloccato: voce assente. Nessun silenzio al posto della voce. |

**CTA voce mancante:** **Vai alle voci** → `/voci`. **Nessuno slider LUFS** in v1.

### Errori (copy IT — inline; toast dove indicato)

| Contesto | Trigger | UI | Chiave copy |
|----------|---------|-----|-------------|
| Login | Email non valida | Inline campo email | «Email non valida» |
| Login | Password vuota / errata | Inline campo password | «Password non valida» / «Credenziali errate» |
| Login | Errore rete | Toast | «Errore di connessione. Riprova.» |
| Upload voce | Formato non WAV/FLAC/MP3/M4A | Inline dropzone | `errUploadFormat` |
| Upload voce | Durata &lt; 8 s | Inline dropzone | `errUploadTooShort` |
| Upload voce | Durata &gt; 90 s | Inline dropzone | `errUploadTooLong` |
| Upload voce | Clipping / troppo forte | Inline card + toast | `errUploadClip` |
| Upload voce | Silenzio / no parlato | Inline card + toast | `errUploadSilent` |
| Upload voce | Più parlanti | Inline card + toast | `errUploadMultiSpeaker` |
| Upload voce | Rumore di fondo elevato | Inline warning (non blocca) | `warnUploadNoisy` |
| Genera (testo/libro) | Nessuna voce selezionata | Primary **disabilitato** + hint | «Seleziona una voce» + link `/voci` |
| Coda job | Stato `errore` | Riga + dettaglio | Messaggio API (non inventare) |
| Dialogo (editor) | Voce/personaggio mancante | Chip + riga errore | `errVoiceMissing` + CTA **Vai alle voci** → `/voci` |
| Dialogo (coda) | Job `bloccato`, voce assente | Badge ambra | `errVoiceMissingJob` + CTA **Vai alle voci** → `/voci` |
| Dialogo | Cap personaggi | Hard block UI | «Massimo 8 personaggi» |
| Dialogo | Cap turni | Hard block UI | «Massimo 40 turni» |
| Dialogo | Cap caratteri/turno | Hard block input | «Massimo 4000 caratteri per turno» |

**Invariante:** voce mancante → **mai** audio silenzioso o placeholder audio in coda/player.

### Coda — colonne e stati

**Colonne tabella:** stato · tipo · voce/i · creato · durata stimata · azioni

| Stato (`status`) | Label UI | Note |
|------------------|----------|------|
| `inCoda` | In coda | — |
| `inElaborazione` | In elaborazione | Progress determinato se API espone % |
| `completato` | Completato | — |
| `errore` | Errore | Mostra messaggio API |
| `bloccato` | Bloccato | Badge ambra; dialoghi / voce mancante |

| Tipo (`type`) | Label UI |
|---------------|----------|
| `testo` | Testo |
| `libro` | Libro |
| `dialogo` | Dialogo |

**Job libro in elaborazione:** progress UI «**Frase N / M**» (o stima backend); titolo capitolo solo se presente nel sorgente.

**Download per tipo:** testo/libro → solo WAV/MP3 file completo (**no ZIP**); dialogo → stitch WAV/MP3 + ZIP clip dry.

### Binding JSON (campo UI → chiave)

Schema file in arrivo nel repo; binding minimo per Sprint 2:

**Personaggio (`Character`)** — chiavi lock: `voiceId`, `name`, `color`, `speed`, `pitch`, `avatar?` (opzionale). **Non** `displayName` / `avatarId`.

| Campo UI | Chiave JSON | Note |
|----------|-------------|------|
| Voce collegata | `voiceId` | Obbligatorio; voce utente in stato pronta |
| Nome | `name` | — |
| Colore swatch / barra riga | `color` | Hex o token — non sul busto |
| Velocità default | `speed` | — |
| Pitch default | `pitch` | — |
| Avatar (opzionale) | `avatar` | Filename es. `avatar-neutro` → risolve in `docs/ui/avatars/` |

**Dialogo (`Dialogue`)**

| Campo UI | Chiave JSON | Note |
|----------|-------------|------|
| Lista personaggi | `characters` | Array **1–8** |
| Lista turni | `turns` | Array **1–40** |
| Gap stitch default | `defaultGapMs` | **350** — solo in JSON; **non** in Impostazioni |

**Turno (`Turn`)** — chiavi lock: `characterId`, `text`, `gapMs`

| Campo UI | Chiave JSON | Vincoli |
|----------|-------------|---------|
| Speaker | `characterId` | Ref a `characters[].id` |
| Testo | `text` | Max **4000** char (hard block) |
| Gap dopo turno | `gapMs` | **0–1500**; default eredita `defaultGapMs` (350) |

**Libri:** fuori da questo JSON — job `type: libro` via API coda; un job, una voce, testo sorgente file/incolla.

### Ticket suggeriti (Sprint 2)

- [ ] Empty states `/voci`, `/coda`, `/dialoghi` con CTA lock
- [ ] Avatar fallback iniziali teal; asset da `docs/ui/avatars/*.png|webp`
- [ ] Upload: accept + validazione durata client; copy keys lock (`errUpload*`, `warnUploadNoisy`, `hintUploadDuration`)
- [ ] Genera disabilitato senza voce; hint + link Voci
- [ ] Tabella coda: 5 stati, 3 tipi, progress Frase N/M su libri
- [ ] Stato `bloccato`: badge ambra, `errVoiceMissingJob`, CTA Vai alle voci, no audio placeholder
- [ ] Caps dialogo: 8 / 40 / 4000 enforced in UI
- [ ] Form dialogo: bind `characters`, `turns`, `defaultGapMs`, campi turno
- [ ] Player export labels WAV/MP3; ZIP solo `dialogo`
- [ ] Login errori inline + toast rete

---

## Changelog brief

| Data | Versione | Note |
|------|----------|------|
| 2026-08-22 | 1.0 | Prima stesura; repo senza UI esistente |
| 2026-08-22 | 1.1 | Avatar/busti personaggio v1.1 + token colore lock |
| 2026-08-22 | 1.2 | Design room: identità teal, empty states lock, gap 350 ms fuori Impostazioni |
| 2026-08-22 | 1.3 | Sound Designer lock: upload clone, export labels, progress libro, loudness engine-only |
| 2026-08-22 | 1.4 | Avatar filenames lock in `docs/ui/avatars/` (asset 3D, no redraw) |
| 2026-08-22 | 1.5 | 2D lock: margine 8% busto, display 32/40 liste, iniziali su teal se mancante |
| 2026-08-22 | 1.6 | Sprint 2: checklist implementazione Frontend + binding JSON camelCase |
| 2026-08-22 | 1.7 | Copy keys lock IT upload/voce; JSON `name`/`avatar`; CTA Vai alle voci |
