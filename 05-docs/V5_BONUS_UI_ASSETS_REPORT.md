# Bonus UI v2 — integrazione asset (Buy Bonus + Chest Free Spins HUD)

Matematica, prezzo, RTP, audio, simboli, cinematiche: non modificati. Checkpoint: `40d990c`.

## Asset caricati (`assets-2d/ui/bonus-v2/`, tutti PNG RGBA con alpha corretto, nessuna maschera applicata)
`buy-bonus-frame.png` 1122×1402 · `chest-free-spins-hud.png` 1672×941 · `multiplier-x1/x2/x5.png` 1254². Importati da `src/ui/bonusAssets.ts` (URL hashate in build, precaricati all'avvio).

## File
Nuovi: `src/ui/bonusAssets.ts`, `bonusAnchors.ts`, `babySkullPortrait.ts`, `tests/bonus-ui-assets.test.ts`.
Modificati: `src/ui/buyBonusWidget.ts`, `src/ui/gameplayUi.ts`, `src/ui/gameplay.css`, `src/main.ts`, `tests/node-shim.d.ts`.

## Coordinate
Misurate sui PNG (flood fill delle aree vuote, rilevamento anello dei medaglioni) e salvate in `bonusAnchors.ts` in pixel dell'immagine; ogni elemento è posizionato in **percentuale** dell'immagine, testi in `cqw` del contenitore con `aspect-ratio` originale. Immagine e aree interattive scalano insieme; nessuna deformazione. Verifica numerica in browser a 1280×720 e 844×390@2x: rapporto d'aspetto esatto (0,8003), regioni lette dal DOM coincidono con le ancore (±0,1 px), la modale sta nel viewport.

## Buy Bonus
Il frame è l'unico sfondo (nessuna vecchia cornice). Dinamici dal motore: prezzo (`adapter.quote`), puntata, saldo, pulsanti −/+ (cambio puntata), GIOCA + prezzo, ANNULLA, chiusura (cerchio rosso, aggiunto come pulsante), messaggio saldo insufficiente nella fascia del testo. Hitbox sopra le superfici dell'artwork, senza doppie cornici. Testo: «Scegli una delle tre casse e ottieni 12 Free Spins con moltiplicatore sulle vincite.» (due righe nella fascia sotto la targa). I tre medaglioni ×1/×2/×5 nei tre cerchi, da sinistra a destra, solo illustrativi (nessun numero aggiuntivo, non cliccabili), interi con il Baby Skull che sporge.

## Baby Skull 3D
Riusa il GLB originale già caricato per lo Skull (clone del template con SkeletonUtils: stessa geometria/materiali, nessun nuovo download) e il rig poser della chase. Sequenza: emerge → guarda a sinistra → a destra → inclinazione/saltello curioso → idle. Il canvas si estende sopra il riquadro, così corna e testa possono sporgere. Al `close` il ciclo si ferma e il rig si resetta; il renderer si libera in `dispose()`. **Limite:** una `<dialog>` nativa sta nel top layer, perciò i canvas della slot (chase) non possono comparirci sopra: il ritratto ha un proprio piccolo renderer WebGL, creato alla prima apertura e usato solo mentre la modale è aperta.

## HUD Chest Free Spins
`chest-free-spins-hud.png` al posto del pannello (stessa posizione, 420 px). Targa «CHEST FREE SPINS»; cerchio grande = medaglione del pacchetto realmente scelto (`medalFor(multiplier)`; nessun fallback permanente: se il moltiplicatore non è 1/2/5 non mostra nulla); riquadri GIRI RIMANENTI e VINCITA BASE (solo base, il totale moltiplicato resta per il finale); riquadro basso «CHEST BONUS ATTIVO». Visibile dallo stato READY. Scatter Free Spins mantiene il suo HUD.

## Test
`tsc` OK; `vitest` 165/165 (nuovi: 5 PNG RGBA e dimensioni, mappatura medaglioni, ancore dentro l'immagine e senza sovrapposizioni, sequenza del Baby Skull, start/stop/dispose idempotenti, nessun valore fisso nel Buy). Browser (solo controlli numerici, nessuno screenshot): modale aperta/chiusa due volte (Esc e ×), prezzo 134.00, medaglioni 1-2-5, flusso Buy→casse→HUD con medaglione ×5, 12 giri, base 0.00, nessun errore console. Build: vedi sotto.

## Da verificare a mano (non controllato visivamente)
Centratura dei testi nelle cornici; resa del Baby Skull (taglia, inquadratura, direzione dello sguardo); leggibilità del testo descrittivo a schermi piccoli; sovrapposizione del Baby Skull dei medaglioni con la targa dell'HUD; zoom del browser. Gli anchor dei pulsanti −/+ e della chiusura sono stimati sui cerchi dorati, da confermare a occhio.


## Aggiornamento
- Medaglioni ufficiali (`multiplier-x*.png`) ovunque compaia ×1/×2/×5 nel bonus: apertura casse (prima testo), finale, HUD Scatter con moltiplicatore, modale Buy, HUD Chest. I premi nelle casse sono ora il medaglione stesso (selezionato: alone dorato; non selezionato: ridotto/desaturato con «NON SCELTA»).
- Baby Skull del Buy: il clone ereditava la posizione/scala dello Skull in scena (fuori campo → riquadro vuoto). Ora la trasformazione viene azzerata prima della normalizzazione; verificato numericamente che il canvas contiene pixel (~45 % del riquadro, testa a ~28 % dall'alto, corna sopra il bordo del riquadro). Il canvas usa `preserveDrawingBuffer` (piccolo).
- Pulsante: «GIOCA».
