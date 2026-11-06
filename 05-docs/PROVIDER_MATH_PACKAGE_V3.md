# Skull Hunt — Provider Math Package V3

## Package index

- Runtime configuration and strips: `src/math/v3/config.ts`, `strips.ts`
- Production evaluation/outcome generation: `src/math/v3/evaluate.ts`, `spin.ts`
- State, accounting, cap and restore: `src/engine/game.ts`
- Independent reference path: `tools/math/v3/ref.ts`, `exact.ts`, `cap-bound.ts`
- Production-engine simulator: `tools/math/v3/simulate.ts`
- Hash-pinned verification: `tests/math-v3.test.ts`, `tests/fixtures/math-v3-hash.txt`
- UI acceptance: `scripts/validate-math-v3.mjs`
- Raw evidence: `05-docs/data/v3/*.json`
- Compiled artifact/source hashes: `05-docs/release-manifest.json`

Configuration SHA-256: `da885592c42997c45058c61a08327dc008e2744ac9e9e3e6740939fa32789aba`.

## Reproduction commands

```sh
TMPDIR=/tmp npm test
TMPDIR=/tmp npm run typecheck
node --import tsx tools/math/v3/exact.ts
node --import tsx tools/math/v3/cap-bound.ts
node --import tsx tools/math/v3/simulate.ts 1000000 20261116 8
node --import tsx tools/math/v3/simulate.ts 10000000 20261117 8
node --import tsx tools/math/v3/simulate.ts 100000000 20261118 8
TMPDIR=/tmp npm run build
```

The simulator runs the real `SlotGame` sequence, including complete Free Spins, committed chest selection, cap and ledger. Seeds and worker partitioning are recorded. The theoretical JSON preserves exact fractions as strings.

## Readiness statement

**Status: ready for provider preliminary math review and independent lab handoff; not regulator certified.** The model meets the internal 96.00% ±0.01pp target, produces the top award at a meaningful measurable frequency, passes deterministic and large-sample validation, and has auditable raw artifacts.

Before real-money release, a provider or lab must independently reproduce the proof and cap bound, approve the RNG/entropy integration, verify platform-specific persistence and transaction boundaries, validate jurisdictional rules/localization and formally certify the compiled release artifact.
