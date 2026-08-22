# Brief UI/UX — TTS vocale italiano (Polimar)

**Versione:** 1.0 (v1) + appendice Dialoghi (v1.1)  
**Stack backend:** Qwen3-TTS 0.6B Base, PyTorch XPU (Intel Arc), bind `0.0.0.0:8765`  
**Deploy:** workstation Windows locale → `tts.alevale.it`  
**Lingua UI:** italiano (unica lingua in v1)  
**Audience doc:** Frontend, Sound Designer, 2D Artist, Game Designer

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
- Empty state: copy documentato + **slot illustrazione** (2D Artist)

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
2. UI mostra: formati accettati, durata massima, indicazioni loudness (**valori da Sound Designer** — placeholder UI finché non definiti)
3. Progress upload **determinato** (barra %)
4. Dopo submit → card in stato **In elaborazione** → polling o SSE fino a **Pronta** / **Errore**
5. Errore: messaggio inline sulla card + toast

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
- Progress chunking (UI only): «Chunk 3/12» + titolo capitolo se presente nel sorgente
- Regole chunk: **Sound Designer**; UI non implementa logica, solo superficie stato

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

- **Mai** fallback silenzioso
- UI mostra: personaggio/voce mancante
- CTA: **Apri voce** (deep link a `/voci`) o **Rimuovi turno** (se API lo consente)

### Interazione riga

- Click riga → `/coda/:jobId` (Player / dettaglio)
- Loading lista: **skeleton**
- Job in elaborazione: progress **determinato** se backend espone %

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

| Formato | Azione |
|---------|--------|
| WAV | **Scarica WAV** |
| MP3 | **Scarica MP3** |

Formato default pre-selezionato da Impostazioni utente.

### Job dialogo (v1.1)

- Play **stitch** completo (concat con gap)
- Lista **clip per turno** con play individuale
- **Scarica ZIP** clip isolate (contratto Game Designer)

---

## 5. Impostazioni

**Path:** `/impostazioni`

| Sezione | Campi |
|---------|-------|
| Account | Email (read-only), **Cambia password** |
| Export | Formato default: WAV / MP3 |
| Dialoghi | Gap default visualizzato **350 ms** (read-only finché Sound non fissa) |
| Lingua | IT only (v1, nessun selettore) |

---

## 6. Dialoghi — v1.1 (spec ora, ship dopo v1)

**Path:** `/dialoghi`  
**Nav:** voce visibile con badge **v1.1**; in v1 può mostrare placeholder «In arrivo» o editor disabilitato.

### Modello dati (lock Game Designer)

| Entità | Definizione |
|--------|-------------|
| **Dialogo** | Lista ordinata di **turni** |
| **Turno** | `characterId`, `text`, override opzionali: pre/post pause, speed, volume |
| **Personaggio** | Config (non asset): voce già clonata + nome display + colore UI + speed/pitch default |
| **Job dialogo** | N job TTS (1 turno = 1 chunk) → concat WAV in ordine, gap default **350 ms** (override per turno 0–1500 ms) |

### Regole invarianti

- **Nessuna voce nel dialogo senza clone pronto** — turno → stato **Bloccato** in coda
- **Nessun fallback silenzioso**
- Libri restano job **mono-voce**; i dialoghi sono **multi-voce**
- Cap: **8** personaggi, **40** turni, **4000** caratteri/turno (hard block UI)

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

- Un file WAV/MP3 (stitch)
- ZIP clip isolate per turno

---

## Gerarchia visiva e stati

| Principio | Implementazione |
|-----------|-----------------|
| Una azione primaria per schermata | Accedi · Nuova voce · Genera · Genera tutto |
| Azioni distruttive | Sempre dietro conferma modale |
| Loading liste | Skeleton |
| Loading job | Progress determinato |
| Errori | Toast + inline (campo o job) |
| Empty states | Copy + slot illustrazione (2D Artist: logo, favicon, icon set, empty states) |

### Palette semantica stati (senza hex — 2D definisce token)

| Stato | Uso |
|-------|-----|
| Successo / Pronta / Completato | Chip verde |
| In corso | Chip/blu o animazione |
| Errore / Bloccato | Chip rosso + messaggio esplicativo |
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
| **Sound Designer** | Upload constraints, chunking UI, gap 350 ms | Formati audio, max durata, loudness, regole chunk libro, API progress |
| **2D Artist** | Empty states, badge v1.1, icon set | Asset illustrazioni, logo, favicon |
| **Game Designer** | Contratto dialoghi, caps, export ZIP | Schema turno/personaggio, stitch rules |
| **Backend** | Auth, job states, file download | OpenAPI o equivalente per stati job/voce |

---

## Fuori scope (questo documento)

- Implementazione frontend (React, CSS, componenti)
- Modifiche al motore TTS o pipeline audio
- Condivisione voci tra utenti
- Multilingua UI oltre IT
- Bozze job se backend non le supporta economicamente

---

## Checklist accettazione Frontend

- [ ] Shell con nav IT e header email/logout
- [ ] Login/registrazione con errori inline e remember session
- [ ] Libreria voci con stati Pronta/In elaborazione/Errore e upload progress
- [ ] Editor Nuovo job (Testo/Libro) con selettore voce obbligatorio
- [ ] Coda con stato Bloccato e CTA voce mancante
- [ ] Player con download WAV/MP3 e preview speed
- [ ] Impostazioni account + formato export default
- [ ] Dialoghi v1.1: editor turni, character manager, caps, export ZIP (post v1)
- [ ] Responsive desktop-first + adattamento mobile documentato

---

## Changelog brief

| Data | Versione | Note |
|------|----------|------|
| 2026-08-22 | 1.0 | Prima stesura; repo senza UI esistente |
