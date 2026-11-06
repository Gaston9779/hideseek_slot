# V5 full game math audit

Baseline: commit `cc24dcce9d1a27aae302577da6ab019c172fc2cd` (2026-11-07), math `4.1.0`. Production entry is `src/main.ts`; it constructs `SlotGame` from `src/engine/game.ts`, which imports only `src/math/v4/*`. `src/config/game.ts`, `src/math/evaluate.ts`, and `src/math/slot.ts` re-export V4. No stale V2/V3 production math import was found; V2 supplies only the shared RNG interface/implementations.

## Executive scorecard

| Area | Status |
|---|---|
| Base Math / payline evaluator | PASS |
| Reel strips / RNG implementation | PASS |
| Symbol mapping (source-level) | PASS |
| Scatter Bonus runtime state | PASS |
| Chest Bonus real selection/runtime accounting | PASS |
| Buy Bonus atomicity/accounting | PASS |
| Dual base trigger | PASS |
| V5 normal theoretical RTP | FAIL — stale V4.0 model only |
| V5 normal MC agreement with 96% target | FAIL / inconclusive against missing model |
| V5 Buy theoretical pre-cap RTP | PASS |
| Max Win reachability | PASS |
| Exact cap probability / capped RTP | NOT VERIFIED |
| DOM/pixel UI correctness | NOT VERIFIED (no browser visual audit requested) |
| Release readiness | FAIL — certification blockers remain |

## Configuration fingerprint

| Configuration item | SHA-256 |
|---|---|
| Symbols | `ba89c0e15d0b8a318e95e29b529ffcbb1beb132f50f592f10cfa571199bd5d8f` |
| Paytable | `49dd92023f954752ac2bb4b812cb42da9fffbd47df18686dd8a2aa36f479061e` |
| Base + FS strips | `42c7a4e3c9f8f0ce4c4f689f692965deb217ed0a3b94ea92ea8097e34ed415cc` |
| Chest packages | `d13f0d4e2b6f0bf07fec61c320d634dd821925b3f3ed7d66fad1738a27fba3da` |
| Buy price | `b5394006c85bf6b9a0780e4de5570b81e6299a2b15e28331c4a5799351b22576` |
| Max win | `0f8eb4b72b6e0c9e88b388eb967b49e067ef1004bf07bffc22c3acb13b43580a` |

The current configuration is materially different from V4.0: `FS_STRIPS` now have one `CHEST_BONUS` per reel, `FEATURE_RULES` permit Chest extensions and Scatter-to-Chest appended segments, and Buy is `134×`, not `128.60×`.

## Verified base-game facts

- 5 reels × 3 rows, exactly 20 five-column fixed paylines, left-to-right evaluation.
- 10 ordinary IDs, 3 specials; Wild substitutes regular symbols. Scatter and Chest Bonus do not line-pay.
- Every 3/4/5 ordinary pay and a Wild-substitution case is independently tested in `tests/v5-audit.test.ts`.
- Integer units are `totalBet / 20`; configured bets are 20, 40, 100, 200 and 500 cents.
- Base static exact values from the independent V4 reference path: line RTP `54.9171113306%`, Scatter pay RTP `2.8026401997%`; base trigger rates Scatter `0.007124483585357` (1/140.3611), Chest `0.000291049480438` (1/3435.8419), dual `0.000106524538110` (1/9387.5084).

These static values are exact for current base strips. They are **not** a full V5 RTP because V4.1 feature transitions differ.

## V5 feature rules actually executed

- Scatter base trigger: 3/4/5 Scatter award 12/15/20 spins; Scatter retrigger is +5/+8/+10, with the engine’s awarded-spin rule.
- Chest selection packages are a Fisher–Yates permutation of exactly `12×1`, `12×2`, `12×5`.
- Chest feature: 3+ Scatter appends 6 spins; 3+ Chest Bonus appends 12 spins with the same multiplier; total awarded capped at 48.
- Scatter feature: an in-feature 3+ Chest Bonus opens a real pick and appends 12 spin segment at that selected multiplier; at most three such picks. The production engine and V5 simulator call `pickChest()` and `closeChest()`, not a direct multiplier draw.
- Base dual remains ordered Chest first, then queued Scatter. State snapshots serialize pending outcome, feature queues/segments, pick state, cap and ledger.

## Exact V5 Buy calculation

`tools/math/v5-exact-buy.ts` uses the independent line evaluator, exact special-count distribution and a finite-state rational DP over Chest extensions (12 through 48 spins). It excludes cap clipping, which was not observed in the campaign.

| Quantity | Exact pre-cap value |
|---|---:|
| Feature spin EV | 3.8343405289× |
| Expected Chest spins | 12.5817721705 |
| Package EV ×1 / ×2 / ×5 | 48.2427989593 / 96.4855979186 / 241.2139947965× |
| Mean selected Chest EV | 128.6474638914× |
| Buy price | 134.00× |
| **Buy RTP pre-cap** | **96.0055700682%** |

This validates the stated Buy denominator and explains why a 1m MC result near 96.2% is statistically plausible. A V5 normal exact calculation is not presently supplied: it must model Scatter retriggers, in-feature picks, queued multiplier segments and cap together. The old `tools/math/v4/exact.ts` reports a V4.0/old-feature-rules value (`95.7619499868%`) and must not be cited as V5 RTP.

## Max Win and cap

The cap is `100,000` units = 5,000× current round stake, shared across base and all features; reaching it clips the current credit, emits `MAX_WIN`, and ends remaining play. Buy uses its selected stake as the cap reference.

Reachability is proven constructively in current FS strips: stops `[46,17,7,20,52]` produce 13,899 feature units (694.95×). Two such Chest ×5 spins total 138,990 units and therefore hit the cap. This establishes reachability, not its exact probability. No cap hit occurred in 10m normal or 1m Buy rounds. The V4 cap bound and 32-stop enumeration are not valid V5 cap proofs because V4.1 uses 96-stop feature strips with inserted Chest Bonus and permits extensions.

## Reproduction

```sh
npm run typecheck
npm test
node --import tsx tools/math/v5-exact-buy.ts
node --import tsx tools/math/v5-simulate.ts normal 8000000 2026110711 2026110712
node --import tsx tools/math/v5-simulate.ts normal 2000000 2026110713 2026110714
node --import tsx tools/math/v5-simulate.ts buy 1000000 2026110703 2026110704
```

Raw outputs are in `05-docs/data/v5/`.
