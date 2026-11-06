# V5 — simboli, audio, pulsante audio

Matematica V4 non toccata (RTP, strip, paytable, payout, bonus, prezzo Buy, Max Win). Checkpoint Git: `6996915`.

## 1–2. Mappatura 13 simboli → ID matematici V4
Foglio `assets-2d/symbols/symbols-sheet.png` (1448×1086, 4 colonne × 4 righe, ultima riga con un simbolo).

| Posizione | Immagine | ID V4 | PNG | Nome mostrato |
|---|---|---|---|---|
| R1C1 | Lapide | `TOMB` | `exported/tombstone.png` | Tombstone |
| R1C2 | WILD | `WILD` | `wild.png` | Wild |
| R1C3 | Lanterna | `LANTERN` | `lantern.png` | Skull Lantern |
| R1C4 | Cassa BONUS | `CHEST_BONUS` | `chest-bonus.png` | Chest Bonus |
| R2C1 | Pozione | `POTION` | `potion.png` | Potion |
| R2C2 | Fantasma | `GHOST` | `ghost.png` | Skull Ghost |
| R2C3 | Chiave | `KEY` | `key.png` | Skull Key |
| R2C4 | Libro rosso | `MAGIC_BOOK` | `magic-book.png` | Magic Book |
| R3C1 | Mausoleo SCATTER | `SCATTER` | `scatter.png` | Scatter |
| R3C2 | Moneta | `SKULL` | `coin.png` | Skull Coin |
| R3C3 | Gargoyle | `GARGOYLE` | `gargoyle.png` | Gargoyle |
| R3C4 | Sacro Graal | `BLASTER` | `grail.png` | Sacred Grail |
| R4C1 | Clessidra | `CHEST` | `hourglass.png` | Skull Hourglass |

Gli ID `BLASTER` (3° ordinario per premio, 31/118/440) e `CHEST` (5°, 11/37/150) non hanno un nome equivalente nel nuovo foglio: hanno preso Graal e Clessidra, mantenendo ID, strip e premi. Il Graal è associato al premio più alto dei due, per la gerarchia grafica desiderata. Magic Book resta il più pagante (64/254/1035). Dieci ordinari + tre speciali (Wild, Scatter, Chest Bonus). Mappa in `src/config/presentation.ts`.

## 3. Estrazione
`scripts/extract-assets.py` aggiornato a 13 simboli (4×4, componenti connesse per cella, scarto dei puntini isolati <1 % del componente maggiore, bbox reale, padding uniforme, centratura, 512×512, alpha ripulito). Controllo eseguito su tutti i 13 PNG: alpha presente, 1 sola componente, bordo del canvas trasparente (nessun residuo di celle vicine). Controllo visivo su fondo magenta: nessun alone né taglio.

## 4–5. Chest Bonus e sostituzioni
`exported/chest-bonus.png` e `assets-2d/symbols/chest-bonus.png` sono la cassa BONUS della nuova tavola. Eliminati `chest.png`, `ghost-tomb.png`, `book.png` (vecchie immagini) e il flag `SYMBOL_HIERARCHY_REMAP`. Sostituiti visivamente: Magic Book, Chest Bonus, Skull Coin, Gargoyle, Lantern, Ghost, Key, Potion, Scatter, Wild, Tombstone (nuovo ritaglio), `BLASTER`→Graal, `CHEST`→Clessidra. Paytable/help ora mostrano l'icona e il nome corretti (in inglese, unica lingua del progetto); aggiunta la riga Wild. Il baule 3D del Buy Bonus e il modello 3D delle casse nel Chest Bonus restano il GLB originale approvato (non sono simboli dei rulli).

## 6. Audio trovato
`assets-2d/audio/skull_hunt_audio_pack/`: 35 suoni (OGG + WAV), `manifest.json` coincide con il catalogo (verificato da test). Ambiente 2, UI 5, rulli 5, vincite 5, bonus 9, voce 5, cinematica 4. OGG usato; WAV come fallback se il browser non decodifica OGG.

## 7. Audio → evento (`src/audio/cues.ts`)
- Ambiente graveyard: dopo il primo gesto; crossfade a `amb_bonus_chest_loop` all'apertura delle casse e ritorno alla chiusura.
- `reel_start` all'avvio dello spin; `reel_tick` ogni ~230 ms mentre i rulli girano; `reel_stop` all'arresto reale di ogni rullo.
- `anticipation_scatter` / `anticipation_chest` sugli eventi reali di suspense (start; fade-out su resolve/miss).
- Vincite: ritorno ≤ puntata → solo `cash_coin`; netto → `win_small`, grande/mega → `win_big`, più `cash_drop`; `win_max` sul Max Win; `cash_coin` anche nel riepilogo.
- `scatter_trigger` / `chest_trigger` / `dual_trigger` nella cinematica del bonus; `chest_open` a ogni cassa aperta; `chest_reveal_x1/x2/x5` sul premio scelto; `free_spin_retrigger`; `bonus_complete` al riepilogo.
- Voce Baby Skull (una alla volta, cooldown 2,5 s, mai per spin): scared (anticipation, fuga), searching (Cercatore cerca), angry (stato lose), happy (grande vincita/bonus), win (BEST PICK).
- Cinematica: `hologram_beam` all'inizio della materializzazione, `skull_land` al touchdown, `skull_run` in loop durante la rincorsa, `skull_fall` alla caduta; skip/abort li interrompe.
- UI: click, conferma, annulla, cambio puntata, errore (acquisto rifiutato) tramite un solo listener delegato.
- Ducking dell'ambiente su hologram/Max Win, ripristino graduale.

## 8. Controlli audio
`src/audio/audioManager.ts`: un solo `AudioContext`, bus master/music/sfx/voice, mute, volumi, ON/OFF per bus, fade, crossfade, ducking, unlock al primo gesto, sospensione a scheda nascosta, cache e preload (critici subito, il resto a richiesta), rate limiting, esclusività delle voci, listener rimossi in `dispose()`, file mancante non blocca. Preferenze in `localStorage`. Menu esistente: sezione AUDIO con 4 interruttori e 4 slider (Master, Ambiente, Effetti, Voce Skull), sincronizzata con il pulsante.

## 9. Pulsante audio nella control bar
L'icona di rotazione era solo grafica nel PNG (nessun hitbox né funzione): nessuna funzionalità persa. `scripts/blank-audio-button.py` genera `control-panel-audio.png`: copia la superficie del pulsante gemello (fulmine) con il fulmine ricostruito dai pixel vicini; anello dorato, riflessi e ombre originali intatti. Sopra, hitbox circolare con icona speaker SVG (colori e ombra come l'icona del fulmine); OFF con speaker barrato, attenuato. Stessa trasformazione della barra (scala 0,9), stesso centro verticale e stessa dimensione del pulsante Flash. Verifica in browser con clic reale: centro Y identico al Quick Spin, dimensioni uguali, toggle e preferenza salvata, menu e pulsante sincronizzati, Quick Spin intatto.

## 10–11. Test eseguiti
`tsc --noEmit` pulito. `vitest`: **134/134** (12 file): matematica V2–V4 invariata, continuità rulli, tastiera, ologramma, bonus, UI V4, nuovi: audio manager (12), cablaggio audio (4: tutti i 35 id e tutti i cue usati, un solo contesto/unlock, nessun accesso a engine/math), simboli V5 (13, 10+3, nomi, file vecchi assenti, Magic Book più pagante). Controllo alpha dei PNG eseguito a parte (script). Smoke in browser: simboli sui rulli, pulsante audio, menu, nessun errore console. Nessuno screenshot archiviato.

## 12. Build
`npm run build` OK; 35 OGG in `dist`; nessun hook di debug né path assoluto.

## 13. Problemi residui
- Il suono non è stato ascoltato né misurato (ambiente senza audio): mix, livelli e sincronia sono impostati a codice, da tarare a orecchio. Volumi base: ambiente 35 %, effetti/voce 80 %, master 80 %.
- Dev server: ogni suono è caricato all'avvio (glob eager); la build di produzione li serve come file separati.
- I WAV di fallback sono inclusi nella build (peso maggiore).
- `skull_run` è un loop con fade-out; non sincronizzato passo per passo con i piedi.
- La lingua del progetto è solo inglese: nessuna traduzione aggiunta.
- Il Cercatore e il posizionamento 3D restano da verificare su dispositivi reali. Nessun commit dopo il checkpoint.
