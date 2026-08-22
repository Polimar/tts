# Contratto Dialogue v1.1

Schema: [`dialogue-v1.1.schema.json`](./dialogue-v1.1.schema.json)  
Esempio: [`dialogue-v1.1.example.json`](./dialogue-v1.1.example.json)

Documento di design per dialoghi multi-personaggio. Non copre i libri (job single-voice su testo lungo).

## Character vs Turn

| Concetto | Ruolo |
|----------|-------|
| **Character** | Configurazione persistente del parlante: voce clonata, nome, colore chip, velocità/pitch di default, avatar opzionale. Non è un asset audio. |
| **Turn** | Una battuta ordinata: testo + riferimento a un character + override opzionali (gap, speed, volume). Ogni turn diventa un chunk TTS separato. |

## Character

- `voiceId` (obbligatorio): deve puntare a una voce clonata dall'utente in stato **ready**.
- Se la voce manca al momento della generazione → turn/job in stato **blocked**. Nessun fallback silenzioso.
- `avatarId` è solo visivo. Default UI: `avatar-neutro`, `avatar-uomo`, `avatar-donna`, `avatar-bambino`, `avatar-anziano`, `avatar-custom`. Avatar campione `avatar-01`–`avatar-04` opzionali. Avatar assente → iniziali su cerchio teal.
- Default impliciti: `speed` 1.0, `pitch` 1.0.

## Dialogue

- `characters[]`: 1–8 elementi, `id` univoci.
- `defaultGapMs`: **350** (costante di prodotto, non slider nelle Impostazioni).
- `turns[]`: 1–40 turni in ordine di riproduzione.
- Ogni `turn.characterId` deve esistere in `characters[]`.

## Stitch e export

1. Un job dialogue = **N job TTS** (un chunk per turn).
2. Concatenazione WAV in ordine, inserendo il gap dopo ogni turn (override `gapMs` o `defaultGapMs`; ultimo turn: gap ignorato o 0).
3. **Export principale**: un file WAV PCM 16-bit 24 kHz mono **oppure** MP3 192 kbps CBR.
4. **Export zip**: clip dry per-turn (senza gap tra i file nello zip).

## Limiti (caps)

| Risorsa | Limite |
|---------|--------|
| Personaggi per dialogue | 8 |
| Turn per dialogue | 40 |
| Caratteri per turn (`text`) | 4000 |
| Override `gapMs` | 0–1500 ms |
| Override `volume` | 0–1 |
