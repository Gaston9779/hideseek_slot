# Skull Hunt Slot — V4 critical bugfix and final math audit

Date: 2026-11-06. Scope is limited to the Buy/Chest state contract, accounting, deterministic tests and math evidence. No asset, Three.js scene, cinematic, CSS/layout or browser automation was changed.

## Executive outcome

The three reported defects are fixed and covered by regression tests. In particular, a selected Chest ×2 now enters the exposed `CHEST_FREE_SPINS` state at **READY, 12 remaining, base bonus 0, multiplier 2** before its first reel result; every credited Chest spin records both its base value and its single multiplier application. The accepted Buy flow closes its confirmation dialog before starting the chest-selection follow-up.

The V4 math remains internally consistent, but exact capped RTP is not yet solved as a closed-form value. This audit adds rigorous V4-specific upper bounds rather than reusing V3 claims. Provider certification remains open.

## 1. Critical defects: cause, correction and regression evidence

| Defect | Actual cause | Correction | Regression |
|---|---|---|---|
| Buy dialog remained over the three chests | `GameBuyBonusAdapter.purchase()` awaited the entire `runChest()` callback, and the widget closed the dialog only after that promise returned. | Purchase is now atomic only; on success the widget immediately calls `dialog.close()`, then invokes `afterPurchase()` for the chest flow. Buttons are locked while submitting; a refused purchase remains open with its reason. | `ui-config.test.ts`: concurrent double purchase has exactly one accepted debit; deferred follow-up is called only after acceptance. |
| ×2/×5 unavailable until first FS result | UI inferred feature information from a settled result rather than exposing the new feature state directly. | `FeatureState` is created as `READY` at `closeChest()`, with `spinsAwarded=12`, `spinsRemaining=12`, multiplier and all zero accounting fields. `beginFeatureUi()` reads it before a spin; HUD title/subtitle receive Chest, 12 FS and multiplier immediately. | `engine-v4.test.ts`: immediately after pick/close, state matches `READY`, 12 remaining, selected multiplier, zero values. |
| Multiplier could not be reconciled to the displayed total | The engine credited the multiplication but retained only one aggregate `totalWinUnits`; UI could not distinguish a base amount from an already multiplied amount. | Feature accounting now tracks `baseSpinWinUnits`, `baseBonusWinUnits`, `grossMultipliedBonusWinUnits`, `effectiveBonusWinUnits`, `creditedBonusWinUnits`, state and completion snapshot. `settle()` applies `baseSpinWin × multiplier` exactly once; cap clipping changes only effective/credited. | Three deterministic €30 tests, restore test and cap test, below. |

The event contract remains unchanged: `skull-hunt:game-event` still emits `FREE_SPINS_TRIGGERED`, `CHEST_BONUS_TRIGGERED`, `DUAL_BONUS_TRIGGERED`, `MAX_WIN`, and `BEST_CHEST_PICK`; accounting fields are state data, not extra economic events.

## 2. Deterministic Chest multiplier evidence

Test bet is €1.00 (`unitCents=5`). The deterministic test injects a base feature result of 600 units, i.e. €30.00, then completes the other eleven spins at zero. No pick credit is made.

| Selected package | Base bonus | Gross multiplied | Effective / credited | Final ledger paid | Balance delta after Buy debit |
|---|---:|---:|---:|---:|---:|
| 1× | €30.00 | €30.00 | €30.00 | €30.00 | `−Buy price + €30.00` |
| 2× | €30.00 | €60.00 | €60.00 | €60.00 | `−Buy price + €60.00` |
| 5× | €30.00 | €150.00 | €150.00 | €150.00 | `−Buy price + €150.00` |

The restore regression snapshots an unsettled €30.00 ×2 result, restores it, settles once for €60.00, and proves that a second `settle()` throws. The cap regression starts with only 1,000 units of cap room: a 600-unit ×2 gross is 1,200 units, while effective/credited is exactly 1,000 units (€50.00); no second payment is made. `lastCompletedChestFeature` persists the completed Chest reconciliation even if a queued Scatter feature follows it.

The non-redesigned HUD receives the immediate state as `CHEST BONUS — 12 FREE SPINS — ×N`. Its existing detail text shows base and effective total; the existing summary receives `base / multiplier / effective total` from the completed Chest record. This is presentation of committed engine data only.

## 3. Files changed for this bugfix

| File | Change |
|---|---|
| `src/engine/buyBonus.ts` | atomic Buy transaction, in-flight guard, deferred `afterPurchase()` |
| `src/ui/buyBonusWidget.ts` | close accepted dialog before chest follow-up; coherent failure and double-click lock |
| `src/engine/game.ts` | READY/ACTIVE/COMPLETED Chest state; separated base/gross/effective/credited fields; completed Chest snapshot |
| `src/main.ts` | initializes Chest UI before spin and supplies completed reconciliation |
| `src/ui/gameplayUi.ts` | consumes exposed state for immediate Chest heading and final reconciliation text |
| `tests/engine-v4.test.ts` | deterministic ×1/×2/×5, restore, cap, READY-state tests |
| `tests/ui-config.test.ts` | atomic double-click/deferred-follow-up Buy test |
| `tools/math/v4/enumerate-feature.ts`, `cap-bound.ts` | V4-only max-win/cap evidence |

## 4. Math audit after the code fix

The bugfix changes state exposure and audit fields, not outcome generation, paytable, strip law or credit formula. Therefore the existing exact pre-cap and Monte Carlo RTP data remain applicable; no payout-distribution simulation was repeated.

### Magic Book

`MAGIC_BOOK` is the highest ordinary symbol at every length: `64 / 254 / 1035`, exceeding every other ordinary 3/4/5-of-a-kind entry. This is checked in `math-v4.test.ts`. **PASS.**

### Max Win 5,000×

The exact V4 feature enumeration evaluates all `32^5 = 33,554,432` distinct feature-stop states; the 96-stop strips repeat that 32-stop cycle. The maximum is **13,899 units = 694.95×**, at stops `[14,17,7,20,20]`, with one occurrence (`1 / 33,554,432`). A Chest 5× applies this once per feature spin; two such spins produce `138,990` units, above the 100,000-unit (5,000×) round cap.

Thus the max is truly reachable. A conservative explicit normal-round lower bound is:

`P(Chest trigger) × P(select 5×) × P(max spin)^2 = 8.6167955863e-20`.

This is a lower bound only—not the exact cap frequency—because many other combinations can reach the cap. The V4 Chernoff/union upper bound is `2.3263992260e-9` per normal paid round. For a Buy Chest it is reachable with lower bound `2.9605947323e-16` and has upper bound `1.5171476784e-7`. **PASS for reachability; FAIL for exact hit frequency.**

### RTP and cap

Exact pre-cap normal decomposition is unchanged:

| Component | RTP |
|---|---:|
| Base lines | 54.9171113306% |
| Base Scatter | 2.8026401997% |
| Scatter FS | 34.6868158068% |
| Chest FS | 3.5934976504% |
| **Normal pre-cap total** | **96.0000649874%** |

The new `cap-bound.ts` uses the V4 exhaustive feature histogram and a Chernoff/union bound. It bounds the normal RTP loss at `≤ 0.00013651427` (RTP fraction), hence normal capped RTP is rigorously within **[95.9864135604%, 96.0000649874%]**. The interval is mathematically valid but too wide to call an exact capped RTP. **Bounded: PASS; exact capped RTP: FAIL/open.**

### Buy Bonus price and RTP

Buy price remains `128.60×`. All supported bets are integral cents with no rounding variance:

| Bet cents | Buy cost cents |
|---:|---:|
| 20 | 2,572 |
| 40 | 5,144 |
| 100 | 12,860 |
| 200 | 25,720 |
| 500 | 64,300 |

Pre-cap exact Chest EV is `123.4668979645×`, so Buy RTP is exactly `123.4668979645 / 128.60 = 96.0084743114%` for every supported stake. The V4 cap bound limits Buy loss to `≤ 0.00556747684`, yielding a conservative capped interval **[95.4517266279%, 96.0084743114%]**. The fixed price is therefore coherent and cent-exact, but it does not meet an exact 96.0000000% specification. **Arithmetic: PASS; exact 96% target and exact capped Buy RTP: FAIL/open.**

### Monte Carlo already executed

No payout-affecting defect was found, so the retained runs were not repeated:

| Run | RTP | 95% CI | Cap hits | Conservation failures |
|---|---:|---:|---:|---:|
| 100,000, seed 20261119 | 94.46885% | [90.22354%, 98.71416%] | 0 | 0 |
| 1,000,000, seed 20261120 | 95.39886% | [94.08116%, 96.71656%] | 0 | 0 |

They are engine sanity checks, not exact-RTP evidence. Raw files and exhaustive/cap-bound artefacts are under `05-docs/data/v4/`.

## 5. Final verification status

| Check | Status |
|---|---|
| Buy closes before Chest follow-up; failure and double click coherent | PASS |
| Chest ×N, 12 remaining, zero initial win exposed before first spin | PASS |
| ×1/×2/×5 one-time economic application and reconciliation | PASS |
| Restore and cap no double credit | PASS |
| Magic Book top regular symbol | PASS |
| 5,000× reachable in V4 | PASS |
| V4 cap probability exact | FAIL / bound only |
| Normal capped RTP exact | FAIL / interval only |
| Buy capped RTP exact and exact 96.0000000% price | FAIL / interval only |
| `npm run typecheck`, full test suite, production build | PASS — 88 tests, 7 files |

V4 can no longer terminate a Chest ×2 without retaining and supplying the base, ×2 gross, cap-adjusted effective and credited values. It is suitable for a provider’s preliminary technical/math review, but must not be called certified until the open cap-distribution and Buy-target work is independently completed.
