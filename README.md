# Hide & Seek: Skull Hunt — The Slot

An indie HTML5 slot-game demo set in a gothic hide-and-seek world. It runs entirely with virtual credits and is intended for development, demonstration, and mathematical review only.

## Highlights

- Five reels, three rows, and 20 fixed paylines.
- Thirteen game symbols, deterministic reel evaluation, and a separable RNG layer.
- Scatter Free Spins: 12, 15, or 20 initial spins, with +5, +8, or +10 retriggers.
- Hide & Seek Chest Bonus: 12 Free Spins with one committed `×1`, `×2`, or `×5` package selected from six equiprobable permutations.
- Optional 134× virtual-credit Buy Bonus and a 5,000× round cap.
- Three.js scenery, sprite-based reels and effects, audio cues, cinematics, responsive UI, and automated regression tests.

The approved V5.1 mathematical profile targets approximately 96% RTP. The documented exact pre-cap normal RTP is 96.00191961%; the capped bound is 96.00150146%–96.00191961%; the Buy Bonus pre-cap RTP is 96.00557007%. See [the V5.1 baseline](05-docs/SKULL_HUNT_V5_1_GAME_RULES_BASELINE.md) and [final math report](05-docs/V5_1_FINAL_MATH_REPORT.md).

## Technology

- TypeScript and Vite
- Three.js
- Vitest
- Playwright tooling for local visual validation

## Getting started

Requires a current Node.js LTS release and npm.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. The game uses virtual credits only.

### Quality checks

```bash
npm test
npm run typecheck
npm run build
```

The production build is emitted to `dist/` and is intentionally not versioned.

## Project layout

```text
src/                 game engine, math, renderer, audio, and UI
assets-2d/           2D artwork, symbols, UI, and audio assets
public/              runtime-served cinematics, bonus, and scenery assets
models/ textures/    source 3D models and textures
animations/          source animation assets
tests/               Vitest regression and mathematical tests
tools/ scripts/      validation, simulation, and asset-processing utilities
05-docs/             math specifications, audit evidence, and QA reports
```

## Certification and asset rights

This is not a certified gambling product. It has no RGS/provider integration, wallet backend, jurisdictional approval, or independent RNG/laboratory certification.

Some supplied 3D assets are identified in the project audit as Tripo/Mixamo-derived, but their redistribution licences and required attributions are not yet documented in this repository. Do not publish or redistribute those assets until their licences are verified. See [ASSET_AUDIT.md](05-docs/ASSET_AUDIT.md) and [GITHUB_RELEASE_REPORT.md](05-docs/GITHUB_RELEASE_REPORT.md).
