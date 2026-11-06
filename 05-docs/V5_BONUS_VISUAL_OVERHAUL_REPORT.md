# V5 — Bonus visual overhaul

Matematica V4, audio e Audio Manager, background, cornice, logo, simboli, control frame, video: non modificati. Checkpoint Git: `c1a0978`.

## File
Nuovi: `src/ui/chestFinale.ts`, `src/ui/bonusAtmosphere.ts`, `src/ui/bonusAccounting.ts`, `tests/bonus-overhaul.test.ts`.
Modificati: `src/main.ts` (flow, video, auto-spin, contabilità di presentazione), `src/bonus/bonusOverlay.ts`, `src/chase/director.ts` + `poses.ts` (celebrazione), `src/ui/gameplayUi.ts` + `gameplay.css` (HUD), `src/style.css` (medaglioni), `src/config/markets.ts` (flag), `tests/*` minori.

## Nuovo flow Chest Bonus
Trigger naturale o Buy → (cinematica 3D esistente solo per il trigger naturale) → scelta cassa (una sola, premi del motore) → apertura 3D e medaglione → dopo 3 s le altre due → pausa leggibile → la scena si chiude da sola (nessun pulsante) → **video** → HUD con ×N, 12 giri, base 0 → 12 Free Spins automatici → finale → CONTINUA → gioco. Il Buy chiude la modale prima della scena (invariato). Stati di presentazione sono quelli già esistenti (controller casse, `busy`, layer tastiera): nessuna macchina economica parallela.

## Video
Il file originale (`cinematics/skull-hunt-intro.webm/.mp4`, `CinematicPlayer`) non era più richiamato nel flow dei bonus. Un solo coordinatore `bonusVideo()` lo riproduce **una volta per round**: dopo la scena casse (Chest) o prima dell'intro Free Spins (Scatter). Nel Dual parte solo con il Chest e non si ripete per lo Scatter. Saltato solo con reduced-motion o se non parte (il player non blocca mai); SALTA/Enter/Esc già presenti.

## Grafica casse
Premi come medaglioni rotondi nella scena (non card rettangolari): ×1 oro sobrio, ×2 oro+viola con anello rotante, ×5 dorato leggendario con pulsazione; non selezionati più piccoli e desaturati, con etichetta "NON SCELTA". Targa italiana "SCEGLI UNA CASSA" sul banner dell'artwork (il titolo "Hide & Seek Bonus" è già nell'arte).

## HUD bonus
Targa gotica oro/viola, sfondo scuro traslucido, medaglione ×N integrato a sinistra. Chest: `CHEST FREE SPINS`, ×N, giri rimanenti, **vincita base** (mai il totale moltiplicato). Scatter: `FREE SPINS`, giri rimanenti, vincita cumulata, giri extra del retrigger, Wild ×3. Nascosta a fine feature.

## Schermata finale
Dentro l'arco originale, senza pannello marrone: titolo "CHEST BONUS COMPLETATO" sul banner, VINCITA BASE (conteggio) → medaglione moltiplicatore → il numero si trasforma in VINCITA TOTALE (raggi, coriandoli ≤180), poi CONTINUA sul banner inferiore (non sopra SPIN). Enter/Spazio: prima accelerano la rivelazione, poi (dopo 0,6 s) continuano. Dual: dopo CONTINUA parte l'intro Scatter.

## Base e moltiplicatore (solo presentazione)
Il motore accredita già l'importo moltiplicato spin per spin (invariato). La UI mostra la vincita base e **trattiene dal saldo visualizzato** la differenza (effettivo − base) finché non avviene la rivelazione; poi il saldo sale fino al valore reale. Nel finale il totale è `effectiveBonusWin` del motore (dopo il cap, mai il lordo non pagato) e coincide con il ledger (controllo dev). Il saldo reale e il ledger non vengono mai alterati. Test deterministici ×1/×2/×5, ×5 con 30,00 → 150,00, cap.

## Celebrazione ×5
Skull originale e Cercatore (blaster a riposo) sono mostrati sui gradini del portale; posa procedurale `cheer` (braccia alzate, ginocchia, salti con squash; il Cercatore solleva solo il braccio libero), nessun inseguimento. Coriandoli viola/oro, raggi, glow. ×5 = pacchetto, non MAX WIN: il livello MAX (titolo, più effetti) si attiva solo se il motore ha raggiunto il cap.

## Atmosfera "wheel bonus"
Cornice che respira, riflesso che attraversa le colonne, particelle ai lati (≤36), pulsazione a ogni stop reale, scossa breve solo su vittorie big/mega/max (no stroboscopio); Chest oro+viola, Scatter viola spettrale con scie. Reduced-motion: solo bagliore statico.

## Free spins automatici
Flag di mercato `featureAutoSpins` (demo sì, UK no): avanza solo gli spin già assegnati, con un solo timer, tramite lo stesso `doSpin`/API V4; non parte con modali, video, riepilogo, scheda nascosta; cancellato da ogni cambio di stato.

## Scatter / Dual
Scatter: stesso HUD/atmosfera, video prima dell'intro, riepilogo esistente (non modificato nell'arte). Dual: Chest → finale → intro Scatter → Scatter. Verificato con test del motore, non in browser.

## Bug corretti
Riepilogo/scene non più bloccati da click; contatori coerenti col motore; saldo non anticipa il moltiplicatore; Enter/Spazio inerti nel finale finché non armato.

## Test
`tsc` pulito; `vitest` **144/144** (13 file, matematica V2–V4 invariata). Smoke browser (software GL, ~80 s): Buy, scelta, chiusura automatica, video, HUD ×5/12/0, 12 spin automatici (saldo mostrato = base: 871,40→876,95→881,60; finale 10,20×5 = 51,00; saldo finale 922,40 = motore), CONTINUA, nessun overlay né modale residui, nessun errore console. Build OK, nessun hook di debug.

## Non fatto / da verificare a mano
- **Spin "più potenti"** (accelerazione/decelerazione dedicate nel bonus): non modificati, per non rischiare la continuità dei rulli; restano pulsazioni, glow e impatti.
- Verifiche visive manuali: posizione dei due Skull sui gradini (visti una volta a 1280×720, sovrappongono leggermente il pulsante CONTINUA), titolo sul banner (font ridotto dopo la prova), medaglioni ×1/×2 e unselected, HUD Scatter, atmosfera Scatter, finale ×1/×2/MAX, Dual, mobile landscape, prestazioni reali (nessun FPS misurato).
- Il video è stato riprodotto in headless (~5 s); fluidità reale da guardare.
- Il banner "Hide & Seek Bonus" dell'arte non è stato sostituito.
- Nessun commit dopo il checkpoint.
