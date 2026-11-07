# V5.1 final math report

Status: **PASS with bounded cap uncertainty; NOT CERTIFIED.** Baseline checkpoint: `ab91df7`.

## Result

V5.1 changes only base-game MAGIC_BOOK 4OAK from 254 to 242 units. Feature pays, 96-stop strips, trigger probabilities, Chest packages, selection, Buy price (134x), and the cap remain unchanged. The client paytable reads `LINE_PAYS`, so the displayed base value updates from the same configuration.

| metric | V5 pre-cap | V5.1 pre-cap | V5.1 capped bound |
|---|---:|---:|---:|
| Normal RTP | 96.27014051% | 96.00191961% | 96.00150146%–96.00191961% |
| Buy RTP | 96.00557007% | 96.00557007% | 96.00551179%–96.00557007% |

The normal capped interval follows a rigorous upper correction of 0.00041815 RTP points; it is inside 96.00% ±0.01 pp.

## Cap evidence

`tools/math/v5_outcome_distribution.cpp` exhaustively coalesces and evaluates all 8,153,726,976 feature-stop outcomes, yielding 18,725 joint `(units, scatter, chest)` rows. `tools/math/v5-cap-state-bound.ts` applies the actual finite V5 extension/pick state recursion to exponential moments, then Chernoff's excess-loss inequality. It is a bound, not an asserted exact correction. A cap clips the credit that reaches 100,000 units, emits `MAX_WIN`, discards remaining feature work, and closes the round. Constructive reachability remains verified.

## Contributions and triggers

Base lines 54.64889043%; base Scatter 2.80264020%; Scatter feature 34.80611123%; Chest feature 3.74427775%. Trigger rates: Scatter 0.71244836%, Chest 0.02910495%, dual 0.01065245%. Chest pre-cap values: x1 48.242799x, x2 96.485598x, x5 241.213995x, uniform 128.647464x.

## Alternatives assessed

1. Shared MAGIC_BOOK 5OAK trim: reaches normal target but reduces Buy RTP; rejected.
2. Base-strip substitutions: alter ordinary symbol distribution/hit behaviour; rejected.
3. Selected base-only 4OAK trim: preserves triggers, feature economics and Buy; selected.

No provider certification claim is made. Exact cap correction, full independent RNG review and lab certification remain open.

## Final regression — 2026-11-07

Profile verified: production build uses `MATH_VERSION=5.1.0` at commit `ea3b1c9f1b426e7f97469c2a9527c86669937dfa`. SHA-256: config `bbf1df15d97b0d4d06ded5afb84ab08f9d90600d852ef966a7e9bc1e67c7ece8`; strips `25dcf15b0583091204196994d7acf13fccf2300faf54a7b32003b7f924e50e40`; evaluator `8303aa7f6def899fe076f92305f4d8e37539efc5f0d2a8061338323476bf3e74`; engine `1436b1042d013159d17cb0473b9da5f6aa6bd50a1392e99a30c9ebca4c476a88`; UI paytable config `9503827b0e2d7aaff0e26adbede2a23b12e876e65de69e46e44db801ce5442bd`.

| simulation | seeds (engine / choice) | observed RTP | 95% CI | cap hits | accounting failures | comparison |
|---|---|---:|---:|---:|---:|---|
| Normal 10,000,000 | 2026110721 / 2026110722 | 96.06935550% | 95.62080189%–96.51790911% | 0 | 0 | contains capped-theory interval 96.00150146%–96.00191961% |
| Buy 1,000,000 | 2026110713 / 2026110714 | 96.08570791% | 95.85419766%–96.31721816% | 0 | 0 | contains capped-theory interval 96.00551179%–96.00557007% |

Raw artefacts: `data/v5/normal-10000000-e2026110721-c2026110722.json` and `data/v5/buy-1000000-e2026110713-c2026110714.json`. Both use `SlotGame`, natural rounds / `buyChestBonus()` respectively, and independently seeded real chest position selection. They include all features through completion.

Production evaluator assertion: a deterministic base Magic Book 4OAK pays **242** units. `src/config/game.ts` exposes the same `LINE_PAYS` table to the help/paytable. The V5 audit verifies all 13 mathematical IDs map one-to-one to the expected presentation assets and published paytable entries; 217/217 tests pass, as do `tsc --noEmit` and the production build. The intentional missing-audio test prints a handled 404 diagnostic only; it is not a test failure.

Final regression status: **PASS**. The normal and Buy confidence intervals include their rigorous capped-theory intervals, no duplicate-credit/accounting failure occurred, and no obsolete V5 profile was used. Still not certification: the cap correction remains a rigorous upper bound rather than an exact point correction, and independent RNG/laboratory certification is outstanding.
