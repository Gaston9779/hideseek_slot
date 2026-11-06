# MATH SPEC v2.0.0 — Hide & Seek: Skull Hunt

Source of truth: `src/math/v2/config.ts` (+ `strips.ts`). The SHA-256 of config + strips is pinned in `tests/fixtures/math-hash.txt`; `tests/math-v2.test.ts` fails on any unrecorded change. Math code has no dependency on Three.js, DOM, CSS, animation or time.
Status words used in this package: **VERIFIED** (proved by exact arithmetic or an executed test), **SIMULATED** (Monte Carlo evidence), **NOT VERIFIED**, **REQUIRES EXTERNAL CERTIFICATION**.

## 1. Grid, lines, money
- 5 reels × 3 rows, 20 fixed paylines (listed in `config.ts: paylines`; all distinct, tested), wins left→right from reel 1, minimum 3 symbols.
- Bet levels (cents): 20 · 40 · 100 · 200 · 500 (all multiples of 20 ⇒ no rounding). Win in cents = `units × bet/20`. All money is integer cents; `units` = line-bet units (1 unit = total bet ÷ 20).
- Demo balance 100,000 ¢ virtual. No real-money play.

## 2. Reels
Independent uniform stop per reel (`rng.int(32)`, rejection-sampled); window = stop−1, stop, stop+1 (circular). Strips are explicit literal arrays (`strips.ts`), 32 stops each, generated deterministically by `tools/math/emitStrips.ts` (even spacing, no neighbouring duplicates where avoidable). No outcome depends on history, bet, balance, FPS or animation.

Symbol counts per 32-stop reel (base game / free spins):

| Symbol | R1 | R2–R4 | R5 | FS R1,R5 | FS R2–R4 |
|---|---|---|---|---|---|
| SKULL | 1 | 1 | 1 | 2 | 2 |
| BLASTER | 1 | 2 | 1 | 2 | 3 |
| GARGOYLE | 2 | 2 | 2 | 3 | 3 |
| MAUSOLEUM | 2 | 2 | 2 | 3 | 3 |
| CHEST | 3 | 3 | 3 | 4 | 3 |
| LANTERN | 3 | 3 | 3 | 4 | 3 |
| GHOST | 4 | 3 | 4 | 4 | 3 |
| TOMB | 5 | 4 | 5 | 4 | 3 |
| KEY | 5 | 4 | 5 | 3 | 2 |
| POTION | 5 | 4 | 5 | 2 | 2 |
| WILD | 0 | 3 | 0 | 0 | 4 |
| SCATTER | 1 | 1 | 1 | 1 | 1 |

Free spins use a richer strip set (`FS_STRIPS`): fewer low symbols, more WILDs.

## 3. Line wins
- Symbol of a line = first non-WILD symbol. WILD (reels 2–4 only) substitutes for every symbol **except SCATTER**; WILD has **no pay of its own**; a line of only WILD(s) followed by SCATTER or by the end pays nothing.
- Only the longest run per line pays; all winning lines are added. Ties/equal pays on different lines both pay (lines are independent).
- Line pay table (line-bet units, i.e. × line bet = × total bet ÷ 20):

| Symbol | 3 | 4 | 5 |
|---|---|---|---|
| SKULL | 60 | 240 | 1000 |
| BLASTER | 40 | 160 | 600 |
| GARGOYLE | 26 | 95 | 400 |
| MAUSOLEUM | 20 | 75 | 300 |
| CHEST | 14 | 48 | 200 |
| LANTERN | 10 | 36 | 150 |
| GHOST | 9 | 26 | 100 |
| TOMB | 7 | 19 | 70 |
| KEY | 5 | 14 | 50 |
| POTION | 5 | 12 | 40 |

## 4. Scatter
SCATTER pays anywhere on the 15 cells, **in addition** to lines, as a multiple of the total bet: 3 → 3× · 4 → 20× · 5 → 100×. At most one scatter per reel window by construction (one per strip; asserted in tests).

## 5. Free Spins
- Trigger (base game only): ≥3 scatters. Spins awarded: 3 → 12 · 4 → 15 · 5 → 20.
- Free spins cost nothing, use `FS_STRIPS`, no new bet; each spin is evaluated with the free-spin multiplier: a **winning line containing ≥1 WILD pays ×3** (lines without wild ×1). Scatter pays apply as in base.
- Retrigger (during free spins): ≥3 scatters add 5 / 8 / 10 spins (3/4/5 scatters), limited so that the **total awarded in one feature never exceeds 30**.
- Chest bonus does not trigger inside free spins.

## 6. Hide & Seek chest bonus
- Trigger: ≥4 scatters in the **base** game (probability 1 in 2,799). It is played *before* the free spins that the same 4/5 scatters also award.
- At **spin time** the RNG draws a prize set by weight, then shuffles its order. The three values (multiples of total bet) are committed in the outcome and never modified afterwards:

| Weight | Prize set (× total bet) | Mean |
|---|---|---|
| 40 | 10 · 25 · 50 | 28.33 |
| 30 | 20 · 40 · 80 | 46.67 |
| 18 | 25 · 60 · 120 | 68.33 |
| 9 | 50 · 100 · 225 | 125.00 |
| 3 | 100 · 200 · 500 | 266.67 |

  Expected prize = **56.88×** the bet (`exact.ts: chestEv`).
- The player picks chest 1/2/3. The credited prize is the committed value behind that chest (`SlotGame.pickChest`, once, idempotent).
- **Is the choice influential?** No — it is a pure reveal. Order is shuffled uniformly after the set is drawn, so every pick has identical distribution and expectation (tested). This is stated in the UI summary ("prize was decided before you picked").
- **BEST PICK** (Skull celebration) = selected prize equals the maximum of the three (ties count). Derived only from committed values; it changes nothing economically.
- Unselected prizes are shown, never credited. Double selection is ignored. Reload/interrupt: the engine snapshot keeps the committed prizes and the `selected/awarded` state; restoring never re-draws or re-credits.

## 7. Max win and cap
Maximum credited per **round** (trigger spin + chest + whole free-spin feature): **5,000× the round's bet** (100,000 units). When reached, the credit is clipped to the limit, remaining free spins are forfeited, the chest (if not yet played) is skipped, and the UI shows MAX WIN. See `RTP_VALIDATION_V2.md` §Max win: reachable in theory, probability < 10⁻⁵², not observable in practice. This is a **limit rule**, not a marketing claim of an attainable 5,000× win.

## 8. Round lifecycle (engine)
`spin()` debits (base only) and commits the outcome → `settle()` credits once → if chest: `pickChest()` once → `closeChest()` → free spins (`spin()`/`settle()` each) → round ends at 0 spins left or cap. Phases: `ready · spinning · free-spins · chest`. Snapshot/restore is versioned (`MATH_VERSION`); a snapshot from another version is rejected.

## 9. RNG
Production: Web Crypto, `int(n)` with rejection sampling (no modulo bias). Simulation: sfc32 seeded through splitmix32. No code path feeds history or balance into the RNG or the strips. Certified RNG / RGS RNG substitution: **REQUIRES EXTERNAL CERTIFICATION**.

## 10. Presentation tiers (derived from the real credited amount only)
loss · positive return ≤ bet (no celebration; net loss) · win (>1× bet) · Big Win (≥20×) · Mega Win (≥100×) · Max Win (round cap reached). Skull's Angry grumble: full loss in the base game only, on the 1st and every 4th consecutive loss, never in free spins — presentation only.
