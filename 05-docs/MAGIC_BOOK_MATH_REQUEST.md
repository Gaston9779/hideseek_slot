# Magic Book — hierarchy check and request for Codex

**Finding (executed on `src/math/v3`):** the Magic Book art is bound to math ID `CHEST`. It is **not** the highest-paying ordinary symbol: it is 5th of 10.

| ID (art) | pays 3/4/5 (line-bet units) | strip count / reel (96 stops) | share of base-line RTP (×total bet) |
|---|---|---|---|
| SKULL (gold coin) | 60 / 240 / 1000 | 3 | 0.0417 |
| BLASTER (ghost tombstone) | 40 / 160 / 600 | 3-6-6-6-3 | 0.0465 |
| GARGOYLE | 26 / 95 / 400 | 6 | 0.0607 |
| MAUSOLEUM (red book) | 20 / 75 / 300 | 6 | 0.0470 |
| **CHEST (Magic Book)** | **14 / 48 / 200** | **9** | **0.0760** |
| LANTERN … POTION | 10/36/150 … 5/12/40 | 9–15 | 0.050–0.085 |
Base-line RTP total 0.580240; V3 theoretical RTP 96.00065 %.

Nothing was changed in the math. Two ways to obtain "Magic Book = highest ordinary symbol":

## Option A — presentation-only remap (recommended, zero math risk)
Swap the *artwork* of the two IDs: show the Magic Book on `SKULL` (60/240/1000, 3 per reel) and the gold coin on `CHEST` (14/48/200, 9 per reel). Distribution, RTP and hash are untouched.
Files: `src/config/presentation.ts` (`SYMBOL_ART` for `SKULL` / `CHEST`: files `magic-book` ↔ `coin`, labels), paytable/help text is generated from it. A ready switch exists: `SYMBOL_HIERARCHY_REMAP` in `presentation.ts` (default **off** — it changes the visual identity of the approved coin symbol, so it needs the owner's decision).

## Option B — relabel in the math (identity-preserving permutation)
Exchange the labels `SKULL` ↔ `CHEST` consistently in `LINE_PAYS`, `BASE_STRIPS`, `FS_STRIPS` (and any `symbolCounts` test fixtures). This is a permutation of symbol names: line EV, RTP (96.0006488767 %), hit frequency, SD and all distributions are mathematically identical; WILD substitution is symmetric. It still requires: bump `MATH_VERSION`, new `math-v3-hash`, rerun `tools/math/v3` exact + enumeration + the 100 M simulation, changelog entry. Files: `src/math/v3/config.ts`, `src/math/v3/strips.ts`, `tests/fixtures/math-v3-hash.txt`, docs.

**Do not** simply raise the `CHEST` payout (14/48/200 → above 60/240/1000): with 9 symbols per reel its 3-of-a-kind frequency is 27× that of `SKULL`, which would multiply the base RTP; that would need a full re-tuning and re-validation.
