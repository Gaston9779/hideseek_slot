# Visual rebuild architecture

Vite / TypeScript / Three.js. The scene is rendered in an orthographic 16:9 composition, fitted into the available screen without stretching. DOM control locations are projected from mesh positions through the same camera; text remains crisp and accessible. Coarse-pointer controls have minimum 44px touch areas.

* `src/rendering/scene.ts`: model loading, camera/lighting, cemetery and machine construction, clipped scrolling reel meshes, sequential deceleration, outcome placement, line highlights, mesh console and projected anchors.
* `src/rendering/geometry.ts`: reusable rounded masonry, lanterns, graves, foliage, procedural stone texture, normalization and static batching.
* `src/rendering/symbols.ts`: consistent mesh symbols using supplied Skull/gargoyle/mausoleum and procedural chest, potion, lantern, key, ghost and blaster.
* `src/rendering/atmosphere.ts`: procedural sky and additive light halos.
* `src/animation/mascot.ts`: AnimationMixer, recovered clips, generated idle, crossfades and return to idle.
* `src/main.ts`: accessible controls, UI lock, keyboard handling, status, dialogs and virtual-credit presentation.
* `src/math`: preserved independent outcome generation/evaluation.
* `src/engine/game.ts`: credit/free-spin state, with small settlement/reset/retrigger safety fixes.

Normal play uses browser CryptoRng. Explicit `?qa=1&seed=5` enables reproducible test outcomes and inspection; no debug overlay appears in normal play. This is only an in-memory virtual-credit demo. No audio, server, wallet or RGS code was introduced.

## Commands

```sh
npm install
npm run dev -- --host 127.0.0.1
npm run typecheck
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

With the dev server running, `node scripts/convert-assets.mjs` regenerates derived GLBs. With the production preview running, `GAME_URL=http://127.0.0.1:4173/ PASS_NAME=production FULL_CHECK=1 node scripts/validate-visual.mjs` captures and verifies the production game. These scripts use local Google Chrome and Playwright; adjust `executablePath` on another machine. A static HTTP server is required; directly opening index.html via file:// is unsupported by browser module/loading rules.

## Limits

Desktop Chrome was tested; no real mobile GPU benchmark or Safari test is claimed. The scene uses 315,995 triangles and 326 draw calls in the initial production view. The primary JS bundle remains over Vite's 500KB warning threshold. Resource disposal for repeated full application mounts is not a supported workflow; the page owns one scene for its lifetime.
