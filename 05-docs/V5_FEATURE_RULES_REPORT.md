# V5 — nuove regole bonus (math 4.1.0) e restyling Buy / HUD

**ATTENZIONE: la matematica è stata modificata su richiesta esplicita.** Va ritestata con Monte Carlo ed enumerazione esatta dal responsabile della matematica: le tabelle esatte V4 (`theoretical-precap.json`, `cap-bound.json`, ecc.) e il pin `uncapped` nei test sono **superati/non più rappresentativi**.

## Regole implementate (`src/math/v4/config.ts` `FEATURE_RULES`, `src/engine/game.ts`)
- **Chest feature (×1/×2/×5)**: 3+ SCATTER → +6 giri; 3+ CHEST_BONUS → +12 giri (nessuna scelta, stesso moltiplicatore); insieme +18; tetto 48 giri assegnati.
- **Scatter feature**: 3+ SCATTER → retrigger invariato (5/8/10, tetto 30); 3+ CHEST_BONUS → scelta cassa e +12 giri **accodati** dopo i giri rimasti, con il moltiplicatore della cassa (×1/×2/×5); max 3 scelte per feature.
- Le due regole sono valutate **prima** di chiudere la feature: tre Scatter all'ultimo giro non la chiudono più (bug segnalato: bonus perso). Se la scelta cassa è in attesa all'ultimo giro, la feature resta aperta.
- Strip: una CHEST_BONUS per rullo anche nelle strip feature (sostituisce un TOMB; mai a ±2 da uno Scatter). Base invariata.
- Non modificato: paytable, strip base, RNG, Max Win, accredito del moltiplicatore (una volta per spin).
- Scatter iniziale invariato (3→12, 4→15, 5→20) e retrigger 5/8/10: la richiesta "10 giri / +10" avrebbe alterato l'RTP calibrato; **da decidere**.

## Misure (motore reale, scelta cassa a rotazione; da rifare)
- Gioco normale: 40.000.000 round → RTP **96,22 %** (IC95 96,00–96,44), 0 cap, max 2.222×. File `05-docs/data/v4/simulation-40000000-seed20261202.json`.
- Buy Bonus: a 128,6× l'RTP era **100,08 %** (±0,12) con le nuove regole → prezzo ricalibrato a **134,0×** (6M round: 95,94 % a 134,1×; ≈96,0 % a 134,0×). Prezzo è nella config; costo intero in centesimi per ogni puntata.
- Exact pre-cap delle vecchie regole sulle nuove strip: 95,76 % (le estensioni non sono nel modello chiuso).

## UI
- Scelta cassa dentro una feature Scatter: stesso flusso casse, poi i giri si aggiungono e il feature continua (toast `+12 FREE SPINS ×m`); nessuna cinematica d'inseguimento.
- HUD ridisegnato: titolo su riga propria (nessun overflow), emblemi skull-coin, medaglione ×N, tre cornici; compare anche nello Scatter quando il moltiplicatore corrente è >1.
- Modale Buy Bonus: logo, cassa BONUS con fluttuazione, medaglioni ×1/×2/×5, **selettore puntata ±** (prezzo e saldo si aggiornano), grande CTA «GIOCA IL BONUS · prezzo», avviso saldo insufficiente.
- Saldo/«vincita base» nel bonus: la parte moltiplicata è trattenuta fino alla rivelazione anche per i segmenti ×m dello Scatter.

## Test
`tsc` OK; `vitest` 156/156 (nuovo `tests/feature-rules.test.ts`: +6/+12, regressione ultimo giro, tetto, moltiplicatore una volta, scelta in Scatter, segmenti ×1 poi ×m, max 3 scelte, snapshot). Smoke browser: modale (stepper 1→2 aggiorna prezzo e puntata), acquisto, scelta, video, HUD ×2.

## Da verificare / aperto
Monte Carlo e enumerazione esatta delle nuove regole; decisione su 10 giri iniziali/+10; riallineamento RTP base (96,22 % vs 96,00 %); Dual con scelta in Scatter non provato in browser; layout HUD/modale solo a 1280×720.
