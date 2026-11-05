# Skull Hunt — visual rebuild release

**Implemented and browser-verified substantial 3D rebuild. Strict reference fidelity remains FAIL.** See `VISUAL_COMPARISON.md` for the precise artistic gaps and `REBUILD_AUDIT.md` for why the previous version failed.

## Package

`06-releases/SkullHunt-Slot-Visual-Rebuild.zip`

* ZIP size: **6,143,688 bytes** (6.14 MB decimal).
* Uncompressed web payload: **11,960,537 bytes**.
* SHA-256: `61e3d93e44c7ec2d10cafa8cc0ca4ed16a7c6b2e9b131ce485f66ad5ae4cdaf4`.
* Nine actual files plus two directory entries. Root `index.html`; relative CSS/JS/logo/model paths. No remote fonts or assets.
* `unzip -t` passed; `unzip -l` confirmed all five models, logo, JS, CSS and root HTML. SHA-256 checks of all nine files read back from the ZIP byte-match the browser-tested production build.
* Source commit: none (the supplied directory has no Git repository). `release-manifest.json` records source-file SHA-256 hashes plus exact build asset hashes and sizes.
* Rollback: `06-releases/checkpoints/pre-visual-rebuild.zip` preserves pre-edit source, package lock, tests, public assets and documentation. The original preview ZIP remains unchanged.

| Packaged model / image | Bytes |
|---|---:|
| Original Skull GLB | 1,021,108 |
| Rigged Skull GLB, textures and three source animations | 3,422,896 |
| Original mausoleum geometry, converted GLB | 1,556,992 |
| Original gargoyle geometry, converted GLB | 1,663,992 |
| Original catgoyle geometry, converted GLB | 1,711,172 |
| Original transparent logo PNG | 1,936,206 |

## Verified results

* TypeScript typecheck and production build pass. Vite warns about the approximately 641KB JS bundle; it is not a build failure.
* Eight unit tests pass (five existing math tests and three new state-safety regressions). This is not mathematical certification.
* The production build was served on port 4173 and tested with actual Chrome/Playwright interactions. `production-browser.json` contains the evidence.
* Betting increases/decreases; spin locks conflicting controls; final reel symbols equal the generated outcome; integer-credit arithmetic matches one debit and one settlement.
* QA seed 5 generated a 40× payout: a 1.00 virtual stake changed 1,000.00 to 1,039.00, with 40.00 shown as the win.
* QA seed 66 generated three Scatters and awarded 10 Free Spins. The following Free Spin was tested with no stake deduction.
* The mixer advances real `agree`, `afraid`, `angry_01` clip time and changes sampled head/spine/arm bone quaternions. The generated idle loop also advances. Original animations remain in the release GLB.
* Paytable, menu, balance reset and responsive spin-button containment pass.
* **Zero page errors, console errors, HTTP failures and remote requests** in the production browser run.
* Five models and the logo load locally. Textures are embedded; missing scenery source JPG references do not reach the browser.
* Real screenshots exist at **1920×1080, 1280×720, 844×390**, plus spinning, win, reaction and Free Spin states. The screenshots were opened and inspected over multiple passes.
* Final initial scene: **326 draw calls / 315,995 triangles** as recorded by the renderer. No claim of a certified frame rate or actual mobile hardware benchmark.

## Known limitations

The supplied scenery's albedo JPGs are missing. The converted original meshes use stone materials. The fountain/gate were not supplied as models and are procedural. The supplied logo and Skull pose differ from their concept illustrations. Lighting, foliage, ornamentation and several symbols need further artistic work to meet the reference's premium finish. The title sheet is a collage with a roughly 1.20:1 playable panel; the game uses a true 16:9 stage.

Math strips/evaluation are intentionally preserved. A pre-existing paytable defect remains: five-symbol payouts are undefined and evaluate to zero. RTP and volatility are unverified. This release demonstrates rendering/game interactions, not a provider-ready math model. The crate feature remains disabled. There is no audio, wallet, backend or real-money play.

## Launch

```sh
cd /Users/nicolaviola/Desktop/SkullHunt-Slot
npm install
npm run dev -- --host 127.0.0.1
```

For the tested production build: `npm run preview -- --host 127.0.0.1 --port 4173`, then open `http://127.0.0.1:4173/`. To deploy the ZIP, extract its contents into a static HTTP server's document directory. Do not open it directly with file://.
