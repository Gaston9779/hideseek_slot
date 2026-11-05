# Reference comparison and fidelity assessment

**Substantial 3D reconstruction: PASS. Strict reference fidelity: FAIL.** The scene is substantially rebuilt and playable, but does not yet reproduce the concept's premium material treatment, fine ornamentation and exact proportions. This report does not claim pixel-perfect or final artistic acceptance.

Reference inspected: `reference/slot-concept.png`, 1672×941. Its left game panel is roughly 1125×941 (about 1.20:1); the entire multi-panel sheet is approximately 16:9. The application fits the playable composition into a true 16:9 stage, preserving the recognizable left mascot / center machine / top logo / right gargoyle / bottom controls hierarchy. A direct full-sheet pixel error would mix different layouts and is not used as a fidelity score.

## Real captured passes

* `screenshots/before-1920.png`: original UI, cut-off Skull, empty purple scene and Unicode cards.
* `screenshots/pass1-1920.png`: actual stone machine and symbols; revealed prematurely exported textures, low mascot feet and a cropped spin button.
* `screenshots/pass2-1920.png`: corrected embedded textures and framing; static batching; original reaction animation verified.
* `screenshots/pass3-1920.png`: continuous mesh reels, atmosphere and symbol exploration; head-only crop experiment exposed an unacceptable cut edge and was removed.
* `screenshots/production-1920.png`: final production composition, intact original character symbols and individually cycling paylines.
* `screenshots/production-1280x720.png` and `production-844x390.png`: same production build at the required smaller desktop and mobile landscape viewports.
* Additional production captures record spinning, a real line win, reactions and Free Spins.

## What now follows the reference

Skull is prominent in the left foreground with its supplied scarf, mesh and texture maps, fully within the viewport and standing above the console. The frame has thick masonry, beveled blocks, recessed cells, metal divisions, foliage and actual depth. The right pedestal uses the original gargoyle. The moonlit cemetery contains original mausoleums plus gate, graves, lanterns, candles, foliage, pathways and a procedural fountain. Original logo artwork replaces text. A large bronze/orange-gold central button and stone console support crisp balance/bet/win text and working controls.

## Remaining visible differences

1. The supplied standalone logo differs from the concept logo and is taller relative to its width. It is used intact, not reshaped to fake a match.
2. The source Skull has a different pose/silhouette from the concept's blaster-holding hero. We preserve the supplied mesh; the character does not hold a fabricated replacement blaster.
3. Scenery's original albedo JPGs are missing. Stone shading is coherent but lacks the illustrated architectural texture detail. The gargoyle is the supplied angular original rather than the rounded creature in the concept.
4. Materials, foliage, sky and lighting remain simpler and harder-edged than the reference. Stone blocks have procedural grain but lack sculpted damage and painted surface variation. Ambient occlusion, bloom and the concept's rich soft lighting are not fully reproduced.
5. Some symbol props are simpler procedural meshes; the Skull symbol uses the intact original character rather than the exact head-only icon. Book/coin symbols in the reference are not part of the preserved math symbol set.
6. The machine is narrower relative to the 16:9 canvas, leaving more space around the mascot. The scene has less layered foreground vegetation and architectural depth than the concept.
7. The console includes a balance meter and menu; exact secondary control identities differ. The spin arrow typography approximates the reference rather than matching its custom artwork.
8. Mobile landscape preserves composition with letterboxing; portrait is not a separately art-directed layout.

See `visual-review.html` for local side-by-side reference and production viewing, and `REBUILD_AUDIT.md` for the verified root causes and implementation evidence.
