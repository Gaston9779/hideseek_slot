# Skull Hunt Slot — V4 final targeted audit

Date: 2026-11-06. Scope: V4 math, state/accounting, event contract and deterministic/Monte-Carlo validation only. No 3D scene, model, video or CSS work is part of this change. V3 is preserved by git checkpoint `674ea20` before V4 work.

**Decision:** the V4 implementation is internally coherent and suitable for a *preliminary* provider math review, with two explicit non-certification findings: the cap correction has not yet been bounded exactly, and the cent-representable Buy price produces 96.0084743%, not exactly 96.0000000%. It is not ready to be represented as certified or released for real money.

## Immutable evidence and reproducibility

| Item | Result | Status |
|---|---:|---|
| Math version / configuration SHA-256 | `4.0.0` / `94c368a22422546fd1dec6d0d8af83077958ebf7bb2cd6d58e5218dd50919be2` | PASS |
| Base stop space | `96^5 = 8,153,726,976` | PASS |
| Independent exact calculation | `tools/math/v4/exact.ts`, arbitrary-precision rational DP; does not import production evaluator | PASS |
| Raw exact evidence | `05-docs/data/v4/theoretical-precap.json`, `targeted-audit.json` | PASS |
| Production-engine MC | 1,000,000 paid rounds, seed `20261120`, raw JSON retained | PASS (sanity only) |
| Cap effect exact/bounded | not yet separately bounded for V4 | FAIL / open certification item |

Reproduce:

```sh
node --import tsx tools/math/v4/exact.ts
node --import tsx tools/math/v4/targeted-audit.ts
node --import tsx tools/math/v4/simulate.ts 1000000 20261120
npm run typecheck
npm test
```

## 1. Simultaneous Scatter + Chest Bonus triggers

The exact counter convolution enumerates every three-cell window on each reel and convolves the five bivariate `(scatterCount, chestBonusCount)` distributions. It counts a **single base outcome** only when both counts are at least three; it does not add separately triggered events and it does not inspect feature outcomes.

| Exact event | Probability | One in |
|---|---:|---:|
| Scatter trigger | 0.007124483585357 | 140.3610505 |
| Chest Bonus trigger | 0.000291049480438 | 3,435.8419005 |
| Simultaneous trigger | 0.000106524538110 | 9,387.5084346 |
| Simultaneous given Chest | 0.366001471469421 | 36.6001471% |

Thus `P(dual | chest) = P(dual) / P(chest) = 0.000106524538110 / 0.000291049480438 = 36.6001471%`. This is why the dual rate is approximately 36.6% of Chest Bonus activations.

Concrete exact reproducible example: seed `693` produces stops `[75,11,13,21,16]`, with Scatter at `(0,0)`, `(2,2)`, `(4,1)` and Chest Bonus at `(1,2)`, `(2,1)`, `(4,0)`. Counts are `3 Scatter + 3 CHEST_BONUS`; its committed authentic package order is `[5,2,1]`. Full grid is in [targeted-audit.json](data/v4/targeted-audit.json).

`generateOutcome()` only creates a Chest package in `base` mode. Both V4 feature modes use `FS_STRIPS`, which contain zero `CHEST_BONUS` symbols. The base settlement enqueues Scatter once, enters Chest first for a dual, then runs Chest FS and only then starts the queued Scatter FS. The counters and trigger events are therefore neither separate-base double counts nor Free Spin events.

**Status: PASS.**

## 2. Three authentic Chest prizes and 5,000× cap

V4 has no standalone 5,000× jackpot award. The three, and only three, shuffled packages are:

| Package | Spins | Feature multiplier | Exact expected package return |
|---|---:|---:|---:|
| 1× | 12 | 1× | 46.3000867367× |
| 2× | 12 | 2× | 92.6001734734× |
| 5× | 12 | 5× | 231.5004336834× |

Fisher–Yates performs two unbiased integer selections, so all six permutations have exact probability `1/6`; a selected position is 1×, 2× or 5× with probability `1/3`. The selected multiplier is applied exactly once to the full monetary result of each of the 12 Chest FS spins (line and Scatter wins), never as an immediate pick credit. `BEST_CHEST_PICK` is emitted only for a selected 5× package.

The **5,000×** rule is now a round cap (`MAX_WIN_UNITS = 100,000`), not a prize package. `SlotGame.credit()` clips a credit to remaining room, emits `MAX_WIN` once when the cap is crossed, and forfeits unplayed feature spins. It applies across base win, Chest FS and subsequently queued Scatter FS. The cap is visible through `capReached`, `MAX_WIN`, snapshot state and the engine’s max tier; it is not a paytable atom, so the old V3-style “5000× jackpot probability/contribution” is not applicable.

The largest selected Chest multiplier is visibly represented in the Chest package/selection state and in the event payload, while every actual monetary credit remains in `settle()` only. **Status: PASS for single-payment/cap mechanics; FAIL for a formal V4 cap-probability/RTP-correction proof.**

## 3. Base game, Free Spins, Chest FS and Buy Bonus coherence

The V4 strips are the validated V3 stop strips with only `MAUSOLEUM → MAGIC_BOOK` identity replacement. Both base and FS strips are 96 cells per reel. `MAGIC_BOOK`, ordinary `CHEST`, and `CHEST_BONUS` are distinct IDs; FS strips have no Chest Bonus, so no Chest retrigger/nesting is possible. Scatter still pays during Chest FS but does not award spins; Scatter FS retains its own 12/15/20 initial, +5/+8/+10 retrigger and 30-awarded-spin ceiling.

Exact, pre-cap normal RTP decomposition:

| Component | RTP |
|---|---:|
| Base line wins | 54.9171113306% |
| Base Scatter pays | 2.8026401997% |
| Scatter Free Spins (including retrigger DP) | 34.6868158068% |
| Chest Free Spins | 3.5934976504% |
| **Total, pre-cap** | **96.0000649874%** |

There is no duplicate term: base Scatter pays are in the base row; Scatter feature value is triggered from base outcomes; Chest value includes only its own 12 multiplier-applied feature spins. A simultaneous base stop appears in both feature *trigger conditions* by design but is not paid twice—the two independently specified features run serially in one capped round.

The exact purchased Chest EV is `123.4668979645×`. A price of `128.60×` is cent-integral for every configured stake and gives `123.4668979645 / 128.60 = 96.0084743114%`. This is the closest simple fixed `0.05×`-granular price used here, but is not the requested exact 96.0000000%; the true unconstrained price would be `128.6113520463×`, which cannot be represented as integral cents at the 0.20 stake. **Buy target: FAIL (0.0084743 percentage points high) pending an approved price-table/rounding policy or a final parameter retune.**

MC raw outcome distribution: the 100k pilot recorded below/equal/above stake at `85.586% / 0.748% / 13.666%`; the 1m run recorded `85.5583% / 0.7689% / 13.6728%`. The 1m RTP was `95.39886%`, with 95% CI `[94.08116%, 96.71656%]`, zero cap hits, zero accounting-conservation failures and observed max `996.4×`. This sample is deliberately a variance sanity check, not an RTP proof; use the exact pre-cap result for the central estimate. Raw outputs: [simulation-1000000-seed20261120.json](data/v4/simulation-1000000-seed20261120.json) and [simulation-100000-seed20261119.json](data/v4/simulation-100000-seed20261119.json).

**Status: PASS for identity, isolation, accounting and exact pre-cap decomposition; FAIL for exact capped RTP / exact Buy target.**

## 4. Client animation event contract

The engine has a typed, committed-fact event union in `src/engine/events.ts`; `src/main.ts` dispatches them as `skull-hunt:game-event`. Events are emitted after the economic state transition and never determine an award:

| Required event | Emission condition | Status |
|---|---|---|
| `FREE_SPINS_TRIGGERED` | base Scatter or Scatter-FS retrigger | PASS |
| `CHEST_BONUS_TRIGGERED` | base Chest trigger or Buy entry | PASS |
| `DUAL_BONUS_TRIGGERED` | same base stop has both counts ≥3 | PASS |
| `MAX_WIN` | round cap transitions false → true | PASS |
| `BEST_CHEST_PICK` | chosen committed multiplier is 5× | PASS |

Supplementary events (`CHEST_PICK_COMPLETED`, `CHEST_FREE_SPINS_STARTED/UPDATED/COMPLETED`, `BUY_BONUS_PURCHASED`) expose selection and 12-spin progression. Payloads include `roundId` and `spinNo`; Chest state and pending outcome are snapshot-versioned (`4.0.0`) for restore/idempotency. No animation has been implemented as part of this audit.

## Test matrix

| Suite / check | Evidence | Status |
|---|---|---|
| Production evaluator vs independent reference | 20,000 V4 base/feature random grids | PASS |
| Exact line/special enumeration | rational exact tool, 96^5 stop space | PASS |
| Package permutation integrity | all six scripted Fisher–Yates permutations | PASS |
| Magic Book hierarchy / symbol identity | V4 tests and distinct mappings | PASS |
| Chest lifecycle | one pick, 12 exact spins, no direct pick credit | PASS |
| Feature isolation / retrigger rules | no FS Chest Bonus; separate Scatter retrigger state | PASS |
| Cap / ledger / snapshot / Buy debit | V4 engine tests | PASS |
| Simulation / distribution / trigger sanity | 100k + 1m production-engine runs, raw data | PASS (non-certifying) |

`npm run typecheck` and the full Vitest suite pass: **82 tests, 7 files**.

## Provider-review conclusion

**Preliminary review: YES, conditionally.** The V4 rules, exact pre-cap calculation, deterministic accounting, dual sequencing and event API are coherent. The source set to hand to the reviewer is `src/math/v4/`, `src/engine/game.ts`, `src/engine/events.ts`, `tools/math/v4/`, this document and `05-docs/data/v4/`.

**Certification/release: NO.** Before approval, independently reproduce the exact calculation; complete a V4-specific cap-bound or exhaustive cap correction; choose a jurisdictionally approved Buy price/rounding policy that meets its specified target; run a larger independent RNG/production build campaign; and obtain laboratory/RGS, RNG, transactional persistence, market-compliance and compiled-artifact certification.
