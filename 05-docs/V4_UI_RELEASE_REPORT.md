# Skull Hunt — V4 UI release report

Data: 2026-11-06. Matematica V4 (`src/math/v4`, `src/engine/game.ts`) **non modificata**. Checkpoint Git: `f57a279`.

## 1. Bug corretti
| Bug | Causa reale | Correzione |
|---|---|---|
| Enter nel Chest Bonus riapre Buy Bonus, modale bloccata | Chiusa la modale di acquisto, il browser rimetteva il focus sul pulsante Buy (opener). Il pulsante non era mai disabilitato, quindi Enter generava un click nativo e `showModal()` si riapriva sopra il Chest Bonus. In più, 5 listener `keydown` sparsi (Space globale, cinematica, FS intro, MAX WIN, riepilogo) senza coordinamento. | Gestore tastiera unico a livelli (`src/ui/keyboard.ts`). Buy disabilitato fuori da stato "pronto" (`canOpen`), blur del pulsante, focus riportato su SPIN solo se è possibile un nuovo round. Click/ok del Buy rifiutati se lo stato non lo consente. |
| Riepilogo non mostrato nel doppio bonus | Il riepilogo partiva solo con `freeSpins===0`; con Scatter in coda era saltato. | Trigger su completamento effettivo (`lastCompletedFeature` cambiato). Poi intro Scatter e nuovo HUD. |
| Testi stantii (RTP v3, "TOTAL BET", `×` senza contesto) | Etichette V3. | Aggiornati a V4 (premio `12 FREE SPINS ×N`, RTP "≈96,00% prima del cap, non certificato"). |

## 2. File modificati (V4 UI)
Nuovi: `src/ui/keyboard.ts`, `src/chase/hologram.ts`, `tests/keyboard.test.ts`, `tests/hologram.test.ts`, `tests/ui-v4.test.ts`.
Modificati: `src/main.ts`, `src/ui/buyBonusWidget.ts`, `src/ui/gameplayUi.ts`, `src/ui/gameplay.css`, `src/ui/cinematicPlayer.ts`, `src/chase/director.ts`, `src/chase/bonusCinematic.ts`, `src/config/chase.ts`, `src/config/presentation.ts` (rimosso flag remap Magic Book, ormai superato), `src/bonus/bonusOverlay.ts`, `src/view/view.ts`, `src/style.css`, `index.html`, `tests/node-shim.d.ts`.

## 3. Ologramma del Cercatore
`HologramMaterialization` (materiali clonati con `onBeforeCompile`, quindi compatibili con lo skeleton; originali ripristinati per identità e cloni eliminati) + `HoloBeamFx` (fascio, anello a terra, ≤44 particelle: 3 draw call, nessun render loop aggiuntivo, nessuna texture). Sequenza: fascio ciano (≈0,45 s) → materializzazione con reticolo, scanline e fascia di scansione, texture originali che compaiono dal basso (≈0,7 s) → discesa che rallenta, squash, rimbalzo, anello (≈0,45 s + 0,28 s) → si volta verso lo Skull → inseguimento esistente invariato. Punto di atterraggio derivato dal layout: `x = larghezza − SKULL_ANCHOR.x` (specchio del basamento dello Skull), piedi alla stessa linea `SKULL_ANCHOR.y`. Il vecchio ingresso da destra è eliminato. Solo il Cercatore; le casse non sono toccate. Salta/abort ripristinano i materiali (`end()`).
Verifica visiva: **una** scansione fotogramma per fotogramma in browser (6 frame, software GL) ha mostrato compilazione shader, fascio, ologramma, atterraggio con anello e piedi sul basamento destro. **Non** dichiaro il posizionamento pixel-perfect su tutte le risoluzioni.

## 4. Chest Bonus ×1/×2/×5
Schermata originale (titolo "Hide & Seek Bonus" già nell'artwork) con targa italiana "SCEGLI UNA CASSA" sul banner inglese; cartigli `12 FREE SPINS` + `×N` (solo da permutazione del motore); le altre casse si rivelano dopo 3 s; BEST PICK solo per ×5 (nessun evento economico, nessun MAX WIN). Barra finale: `12 FREE SPINS ×N`, spiegazione che il moltiplicatore vale per le vincite dei dodici giri, pulsante INIZIA. Enter/Spazio su INIZIA solo dopo 0,7 s dalla comparsa.
HUD Chest (oro): medaglione ×N, `GIRI RIMANENTI`, `VINCITA BASE`, `TOTALE BONUS`; presente da stato READY, dal primo frame. Nessuna doppia moltiplicazione in UI: valori da `FeatureState`.

## 5. Buy Bonus
Prezzo/abilitazione letti da `BUY_BONUS` (V4: 128,6× BET) e dal profilo mercato. Modale: nome, costo, puntata, saldo, descrizione, ANNULLA/COMPRA; saldo insufficiente → messaggio, COMPRA disabilitato, nessun addebito. Dopo l'acquisto la modale si chiude subito, poi le tre casse. Bloccato durante round/feature/riepilogo. Escape inerte durante l'invio.

## 6. Free Spins Scatter
HUD viola con contatori propri: giri rimanenti, `GIRO n/N`, `+N EXTRA` da retrigger, `LINEE CON WILD ×3` (da config V4), vincita cumulata. Riepilogo `FREE SPINS COMPLETATI` con retrigger e Wild. Non mostra dati del bonus precedente (HUD/riepilogo resettati a ogni feature).

## 7. Dual Bonus
Una sola cinematica; Chest per primo; riepilogo Chest → CONTINUA → intro Scatter → HUD Scatter. Verificato a livello engine (test); **non** riprodotto end-to-end in browser.

## 8. Riepiloghi e messaggi
Riepilogo Chest: `CHEST BONUS COMPLETATO`, giri, base, moltiplicatore, totale effettivo, eventuale riduzione max-win, conteggio cosmetico, glow, CONTINUA; non accredita. Modali native (paytable, menu, Buy) unificate nella cornice viola/oro. Soglie celebrazione già centralizzate in `tierFor`/`WIN_TIERS` (nessun BIG WIN ≤ puntata, testato). MAX WIN mostra l'importo del motore.

## 9. Magic Book
Codex: `MAGIC_BOOK` 64/254/1035, il più alto a 3/4/5 (test). Arte `magic-book` unica, file esistente per ogni simbolo, help ordinato per payout decrescente (test). La richiesta precedente `MAGIC_BOOK_MATH_REQUEST.md` è superata.

## 10. Controllo tastiera
Un solo listener `keydown`/`keyup` (capture), stack di livelli. Nessun livello: Enter/Spazio girano solo se pronti, altrimenti inerti anche con focus su un pulsante; auto-repeat ignorato; 450 ms di quiete dopo la chiusura di un livello (un tasto premuto ripetutamente non cade su SPIN). Livelli: intro video, cinematica bonus, MAX WIN, FS intro, schermata casse (1/2/3, Esc solo anteprima dev), riepilogo. Dialog nativi mantengono focus trap/Escape. `attach()` idempotente. Mouse/touch invariati.
Smoke in browser (reale): 25 × Enter+Spazio durante Chest Bonus e 10 durante la rivelazione → nessuna modale, saldo invariato, fase invariata.

## 11. Test eseguiti
`tsc --noEmit` pulito; `vitest`: **116/116** (10 file): V2/V3/V4 matematica Codex invariati, continuità rulli, tastiera (9), ologramma (6), UI V4 (13: READY ×1/2/5, contatore 12→0, premio mostrato = motore, no doppio accredito, tre premi diversi, BEST PICK solo ×5, dual, Buy una volta/saldo insufficiente/mercato, Magic Book/paytable/arte, soglie). Smoke browser: Buy→chest→pick→INIZIA→HUD, Enter spam, scansione ologramma.
Spec di test 14 (skip non elimina premi) coperto solo indirettamente: skip/abort termina l'animazione e il flusso continua con la stessa feature del motore; nessun test automatico dedicato.

## 12. Typecheck / build
`tsc --noEmit` OK. `npm run build` OK (JS 715 kB, avviso chunk >500 kB). Scansione `dist`: nessun hook di debug (`__SKULL_QA__`, `__debugSkullChase`, ecc.), nessun path assoluto, GLB e video presenti, percorsi relativi. Parametri URL di debug (`bonusCelebrateMs`, `hold`, `chaseSpeed`) ora solo in DEV; voce di menu "anteprima bonus" rimossa dalla build.

## 13. Problemi residui / non verificati
- Nessun FPS reale: solo software GL; costo GPU dell'ologramma non misurato.
- Posizionamento 3D del Cercatore osservato a 1280×720 solo; mobile landscape e DPR non riverificati.
- Dual e riepilogo Scatter non provati end-to-end in browser; l'HUD Scatter non ha screenshot.
- Un ritocco finale al titolo/etichetta dell'HUD Chest (CSS) non è stato rivisto visivamente.
- Modale Buy: chiusura/backdrop verificati a livello logico e smoke, non con un test DOM dedicato.
- Il widget Buy resta attenuato durante ogni spin (stato "bloccato").
- Spazio disco del Mac quasi pieno (~0,7 GB liberi): ho eliminato solo i miei file temporanei.
- RTP con cap esatto ancora aperto (documento Codex); nessuna certificazione.
- Nulla è stato committato dopo il checkpoint `f57a279`.

## 14. Stato finale
**READY FOR DEMO RELEASE** come demo a crediti virtuali, con i limiti sopra (verifiche visive/performance su dispositivi reali ancora da fare). Nessun bug bloccante noto.
