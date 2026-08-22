# Brief arte 2D — TTS italiano

## Identità

- **Palette:** teal `#0F766E`, cream `#F7F4EF`, ink `#1C1917`, muted `#78716C`, blocked amber `#B45309` (coda bloccata, non rosso allarme).
- **Stile:** flat editorial 2D, no neon, no 3D, no mascotte. Line icons 2px, rounded caps, 24px optical.
- **Logo:** `public/brand/logo.png` — speech bubble + waveform 7 barre, teal su cream (marchio primario).
- **Favicon:** `public/brand/favicon.png` — pulse waveform bianco su tile teal arrotondato, senza testo.

## Icone (line)

**Nav:** microfono Voci, plus/waveform Nuovo job, book Libro, list Coda, gear Impostazioni, bubbles Dialoghi (badge v1.1).

**Actions:** upload, play, pause, download, zip, lock (voci private), user, blocked (octagon+pause, amber).

> Riferimento visivo: `docs/art/reference/icon-set.png` — solo reference sheet, non usare come sprite UI. Il frontend implementa SVG reali da questo elenco.

## Empty states — solo questi tre (richiesta UI Designer)

### 1) Voci

- **Titolo:** Nessuna voce ancora
- **Body:** Clona una voce dal tuo audio. Senza voce non puoi generare.
- **CTA:** Carica audio
- **Art:** `public/brand/empty-voci.png`

### 2) Coda

- **Titolo:** Nessun job in coda
- **Body:** I job di testo e libro compariranno qui. Lo stato bloccato compare se manca la voce.
- **CTA:** Nuovo job
- **Art:** `public/brand/empty-coda.png`

### 3) Dialoghi

- **Titolo:** Nessun dialogo
- **Body:** I dialoghi multi-voce arrivano in v1.1. Puoi già preparare le voci.
- **CTA:** Vai alle voci
- **Art:** `public/brand/empty-dialoghi.png`
- **Nota:** badge v1.1 sulla nav, non sulla CTA.

**Login:** nessuna illustrazione empty state.
