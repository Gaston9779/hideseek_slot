# RELEASE REPORT — v2.0.0 (math rebuild + cinematic/animation polish)

Not certified. Demo for preliminary provider/lab evaluation. Earlier releases in `06-releases/` are untouched.

## Deliverables
- Web build: `06-releases/SkullHunt-Slot-v2.0.0.zip` (production `dist/`, base `./`, open `index.html` from any static host).
- Math package: `06-releases/SkullHunt-MathPackage-v2.0.0.zip` (`src/math/v2`, `src/engine`, `tools/math`, `tests`, `05-docs` math docs + `data/`).
- Docs: [MATH_AUDIT](MATH_AUDIT.md) · [MATH_SPEC_V2](MATH_SPEC_V2.md) · [RTP_VALIDATION_V2](RTP_VALIDATION_V2.md) · [MATH_CHANGELOG](MATH_CHANGELOG.md) · [PROVIDER_READINESS](PROVIDER_READINESS.md).
- Screenshots: `05-docs/screenshots/v2/` (idle at 1920×1080, 1280×720, 844×390; spin; win; small return; big win; angry; bonus chests; pick; best pick; bonus complete; free spins; video transition frames incl. mobile and skip).

## Executed checks
| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `vitest run` (61 tests: 19 bonus-controller, 21 math, 21 engine) | **61 / 61 pass** |
| Exact RTP | 96.00032 % (pinned in test) |
| Exhaustive enumeration 2 × 33,554,432 grids | integer-equal to analytic; 0 reference mismatches |
| Monte Carlo 1 M / 10 M / 100 M | 95.69 % / 96.33 % / 96.09 %, all CIs contain 96.00 % |
| Production build (`npm run build`) | pass (bundle > 500 kB warning is pre-existing: three.js) |
| Browser tests (headless Chromium, dev + production preview) | cinematic natural end + transition (brighten → flash → particles → crossfade), skip (no black screen), reduced-motion (no flash/particles), mobile 844×390, real chest round from engine (committed prizes, Escape ignored, credit once, then free spins), big win / win / small return / loss tiers and Skull reactions |
| Console errors | none in any run |

## Changes in the game
- Math engine v2 (see spec). Chest bonus now real (trigger ≥4 base scatters); preview from the menu remains, labelled as preview, never credits.
- Win tiers from the real credited amount; sub-bet returns not celebrated.
- Cinematic: single `CinematicPlayer` unchanged API; new exit transition, skip crossfade, reduced-motion path. The Kling video is not regenerated; the original file and its on-screen attribution are untouched (no crop, no watermark removal). Distribution rights/attribution of the Kling clip remain the owner's responsibility.
- Skull ×1.5 (`SKULL_SCALE`, from the configured 190 px height), feet re-anchored from the real bounding box on the stone ledge (anchor shifted 15 px left so horns clear the reel frame); canvas enlarged so nothing clips.
- Skull animations: GLB clips present = `angry_01`, `agree`, `afraid` (+ procedural idle/watch). Event machine `MascotController.dispatch`: SPIN_STARTED→watch, SPIN_LOSS→**angry_01** (1.7× speed, 1st and every 4th consecutive base-game full loss, never in free spins), WIN→agree, BIG_WIN→agree 1.35× + hop, BONUS_TRIGGER→agree 1.6×, BEST_CHEST_PICK→bigwin, BONUS_END→idle. Playback verified in the browser (`activeClip: angry_01`, action time advancing). The earlier use of `angry_01` for the bonus intro was replaced.
- Lighting: lantern key light flickers in sync with the 2D lamps; fill/rim colour pulses on win/bonus events (disabled with reduced motion).
- Market profile hook (`?market=uk` → 2.5 s minimum spin cycle).

## Not done / limits (honest)
- Priority 7 was applied conservatively: dynamic Skull lighting, sub-bet tier correction and the transition effects are new; reel-stop, wild/scatter and chest-opening animations were **not** reworked beyond what existed.
- Audio intentionally absent. Autoplay/turbo/slam stop intentionally absent.
- No GLI-19 / UKGC text was consulted in this session; compliance statements are provider-facing starting points (`PROVIDER_READINESS.md`).
- Practical 5,000× max win is **not** attainable with this paytable (P ≤ 6.7×10⁻⁵³); documented.
- H.264 MP4 fallback and Safari/iOS were not exercised (Playwright Chromium has no H.264); WebM VP9 path tested.
- Gameplay persistence across page reload is not implemented (engine snapshot/restore is, and is tested).

## Release artefacts (SHA-256)
- `06-releases/SkullHunt-Slot-v2.0.0.zip` (16.4 MB) — `a467fc8b003910a12d1d197e3424d31bfb3a6de8b3236aece8bf010fea9333b6`
- `06-releases/SkullHunt-MathPackage-v2.0.0.zip` (65 KB) — `a44b54908c55bd257a350d5740c0deb3a5a820a8fd22259014dd37ebfd822bb0`
Production-preview browser run: console errors `[]`. (Win meter reads mid count-up in screenshots taken during the animation; the engine credit is exact, e.g. seed 925 → 2,410 ¢.)
