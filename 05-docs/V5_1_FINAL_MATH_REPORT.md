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
