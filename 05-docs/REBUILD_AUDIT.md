# Critical visual rebuild — evidence and causes

## Reference verified

`reference/slot-concept.png` physically exists and was opened with image viewing: **1672 × 941** pixels. `01-reference/slot-concept.png` does not exist. The left 1125-pixel-wide panel contains the playable concept; the right side is three feature illustrations. We reconstruct the left panel into a 16:9 game composition, rather than displaying the entire mood board as the game.

The supplied logo, subsequently identified by the user, is `reference/skull-hunt-logo.png`, **1448 × 1086**. It was opened, inspected, copied intact into the release, and is displayed directly. Its art and proportions differ from the logo depicted in the concept.

## Verified old implementation

The original source is preserved in `06-releases/checkpoints/pre-visual-rebuild.zip`. The old release also remains intact. `screenshots/before-1920.png` is an actual Chrome capture, not an illustration. `before-browser-audit.json` records requests, console messages and DOM bounds.

* **Skull below the interface:** a perspective camera at `(0,2.8,11)` with no lookAt targets straight along -Z, while Skull was placed at `(-5,-2.25,0)` with arbitrary scale 2.2. Its placement had no relationship to the HTML mascot rectangle. The foreground HTML panel began at y=894 and extended to y=1056 at 1080p. The screenshot shows the tiny remaining fragment at the bottom. The model loaded; composition was wrong.
* **Empty purple background:** old scene code created only a ground plane, a flat moon disc and 18 dodecahedron stones, in addition to Skull and lights. It did not construct a cemetery. The camera also placed most ground details below the viewport.
* **Scenery absent:** there was no FBX loader, conversion pipeline, scenery load call or scenery model in public assets. The earlier asset audit was a filename list, not successful conversion or browser verification.
* **Flat reels:** old `renderGrid` generated HTML div cards, with Unicode character glyphs. CSS blurred them during a fixed timeout. All stopped together after Promise.all; individual sequential timeouts did not produce separate reel stopping.
* **Logo absent:** generic HTML text replaced the original art. The initial folder had no logo; the logo now provided is integrated verbatim.
* **760 KB ZIP:** archive listing contained `index.html` (1,982 bytes), CSS (5,362), JS (595,335), and one GLB (1,021,108), plus an assets directory entry. It excluded every scenery FBX, the rigged FBX, a logo and external standalone textures. The single GLB embedded three maps; compression explains the small archive.
* **Remote dependencies:** CSS requested Google Fonts and two font files from Google. These requests were observed in Chrome. The rebuild uses system fonts and local artwork, with no remote dependency.
* **Animation:** both original GLBs are byte-identical (SHA-256 `392d3912b6ff03e32f7588f4f71e3639254d3f9dbe721ea1f04a7f7674048a5d`) and contain no clips. Consequently the old AnimationMixer branch never ran. It also used milliseconds as seconds if it were activated. The FBX does contain actual clips; those have now been recovered.

## Rebuild architecture

The renderer constructs beveled masonry, pillars, a recessed five-column machine, 15 mesh symbol positions, stone paths, a control plinth, bronze/gold button assemblies, lanterns, candles, cemetery crosses, foliage, a moon and sky. The supplied mausoleum, gargoyle and catgoyle meshes are loaded from converted GLBs. Missing fountain/gate source models are represented by explicitly procedural environment geometry.

The original textured rigged Skull is normalized by measured model bounds and placed on a raised foreground platform. A Three.js AnimationMixer plays the recovered `agree`, `afraid`, and `angry_01` clips. Idle is a restrained, newly authored two-bone motion, not a claimed source clip.

The DOM supplies the unchanged logo, numeric text, accessible transparent control hit areas, loading/error state and dialogs. Button positions are projected from the same 3D camera as their bronze meshes. Landscape screens preserve a 16:9 view, letterboxing extra width; portrait provides a rotate hint.

Continuous reel movement uses clipped 3D symbol meshes, quadratic deceleration and staggered stopping. The final grid comes exclusively from the existing outcome generator. Payline tubes and gold/purple highlights reflect its evaluation.

Static meshes are batched by material. Draw calls dropped from 775 in the first reconstruction to about 325 in the refined initial scene (roughly 304k rendered triangles; browser evidence contains the exact count for each pass).

## Gameplay scope

`src/math/*` and the reel strips/paytable remain unchanged. UI reentry is blocked before calling the engine; disabled controls, keyboard repeat protection and dialog guards prevent concurrent spins. Three narrowly scoped state fixes reject double settlement, reject reset during an outstanding spin, and apply +5 (rather than +10) when a retrigger occurs on the last free spin.

The legacy paytable indexes by match count but lacks index 5 entries. Five-symbol lines therefore currently return zero in that existing model. This is a known pre-existing math defect, explicitly deferred because this milestone requests preservation of the math while rebuilding graphics. The displayed paytable now reflects the actual evaluator indices. RTP, volatility and certification remain unverified; this is not provider-ready math.
