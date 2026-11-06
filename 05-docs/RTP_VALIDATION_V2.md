# RTP VALIDATION v2.0.0

Reproduce: `npx tsx tools/math/exact.ts` · `npx tsx tools/math/enumerate.ts` (≈150 s) · `npx tsx tools/math/simulate.ts <spins> <seed> [workers]`. Raw outputs: `05-docs/data/*.json`.
Labels: **VERIFIED** exact arithmetic/executed test · **SIMULATED** Monte Carlo · **NOT VERIFIED** · **REQUIRES EXTERNAL CERTIFICATION**.

## 1. Method (VERIFIED)
1. **Line EV, exact rational** (`exact.ts`): lines are identical in law (one row per reel, reels independent, each row marginally uniform), so one line is enumerated over its 12⁵ symbol tuples weighted by strip symbol counts, with the *independent* regex-based evaluator `tools/math/ref.ts`. Denominator 32⁵.
2. **Scatter distribution, exact** by convolution of per-reel window scatter counts.
3. **Free spins, exact**: expected number of spins by DP over (spins played, spins awarded) including retriggers and the 30-spin cap; payout via Wald's identity (a spin is played iff decided by earlier spins). FS per-spin EV from the free-spin strips and ×3 wild rule.
4. **Chest**: exact weighted mean of the prize table × P(≥4 scatters).
5. **Exhaustive enumeration** (`enumerate.ts`): all 32⁵ = 33,554,432 stop combinations for base **and** free-spin strips with the *production* `evaluate()`. Integer sums are compared to the analytic integers in `tests/math-v2.test.ts` (line units, free-spin line units, and the scatter-count histogram match **to the unit**); 1 in 1024 grids also cross-checked against the reference evaluator (0 mismatches).
6. **Monte Carlo through the real engine** (`SlotGame`: spin → settle → chest → free spins, cap, accounting). Conservation `balance = start − wagered + paid` checked after every round: 0 failures in 111 M rounds.

## 2. Theoretical RTP (VERIFIED, uncapped; cap effect < 10⁻⁵², §6)

| Component | Contribution |
|---|---|
| Base game lines | **59.0908 %** |
| Base game scatter pays | 2.8026 % |
| Free spins (lines + scatter, incl. retrigger) | **32.0746 %** |
| Hide & Seek chest bonus | **2.0323 %** |
| **Total** | **96.0003 %** (exact fraction in `exact.ts`; 0.960003234502…) |

Base game alone (lines + scatter, per spin) = 61.8934 % (enumeration: 415,359,820 units / (33,554,432 × 20)).

## 3. Feature statistics (VERIFIED)
- Free-spin trigger (≥3 scatters): P = 119,529 / 16,777,216 = 0.7124 % → **1 in 140.36**.
- Expected spins per trigger: 12.619 (3 sc: 12.457 · 4 sc: 15.571 · 5 sc: 20.751).
- Free-spin per-spin EV: 3.5678× bet (lines 3.5397 + scatter 0.0280); per-spin SD 9.219×; hit frequency 45.14 %; max single FS spin 480×.
- Average free-spin feature win (given trigger): **45.02× bet**.
- Chest trigger (≥4 scatters): **1 in 2,799**; average prize **56.88× bet**; pick is non-influential (tested).
- Base spin (exact, enumeration): hit frequency **45.75 %** (1 in 2.19); SD 1.549× bet; P(spin ≥ 5×) 1.70 %, ≥ 10× 0.457 %, ≥ 20× 0.0913 %, ≥ 50× 0.00483 %, ≥ 100× 0.000724 %; max single base spin 107×. Returns in (0, 1×] occur on 29.91 % of base spins (net loss — no celebration in the UI).

## 4. Monte Carlo (SIMULATED, real engine, 1 base spin = 1 round incl. its features; fixed bet)

| Run | Rounds | Seed | RTP | 95 % CI | 99.9 % CI | Round SD | Time |
|---|---|---|---|---|---|---|---|
| 1 M | 1,000,000 | 20261106 | 95.690 % | 94.573–96.806 % | 93.816–97.563 % | 5.695 | 1.8 s |
| 10 M | 10,000,000 | 20261107 | 96.326 % | 95.970–96.682 % | 95.728–96.924 % | 5.748 | 15.8 s |
| 100 M | 100,000,000 | 20261108 | 96.086 % | 95.973–96.199 % | 95.897–96.275 % | 5.750 | 159 s |

All intervals contain the exact 96.0003 %. (100 M: +0.086 pp = 1.5 σ.) **The simulations corroborate the exact result; they are not the proof** — the proof is §1–§2.

100 M-round component means: base 61.915 % · free spins 32.112 % · chest 2.059 % (exact: 61.893 / 32.075 / 2.032). Observed free-spin trigger 1 in 140.30; chest 1 in 2,784; avg FS spins/trigger 12.620; avg chest prize 57.3×.

## 5. Volatility and distribution of the round return (SIMULATED, 100 M rounds)
SD of the return per round **5.75× bet** (variance 33.1) with mean 0.961 ⇒ coefficient of variation ≈ 6.0 → medium-high volatility as targeted. Round return ≥ 1× bet: **16.94 %**; any base-spin win: 45.75 %.

| P(round return ≥ x × bet) | |
|---|---|
| ≥ 10× | 1.111 % (1 in 90) |
| ≥ 20× | 0.660 % (1 in 152) |
| ≥ 50× | 0.284 % (1 in 352) |
| ≥ 100× | 0.0679 % (1 in 1,472) |
| ≥ 200× | 0.00769 % (1 in 13,000) |
| ≥ 500× | 0.000391 % (1 in 256,000) |
| ≥ 1000× | 0 in 10⁸ rounds |

Round-return buckets (100 M): 0 → 54.25 % · (0,1) 28.82 % · [1,2) 7.37 % · [2,5) 7.21 % · [5,10) 1.24 % · [10,20) 0.451 % · [20,50) 0.376 % · [50,100) 0.216 % · [100,200) 0.060 % · [200,500) 0.0073 % · [500,1000) 0.0004 %.

## 6. Max win (documented limit; practical reachability NOT achieved)
- Rule: cap 5,000× per round (`MAX_WIN_UNITS = 100,000`).
- Theoretically reachable: yes (e.g. a 500× chest + 30 free spins of ≥ ~2,900 units average, spins up to 9,600 units exist), the engine clips and ends the round (unit-tested).
- Rigorous bound (Chernoff, free-spin per-spin histogram from the exhaustive enumeration, worst-case 30 spins + max chest + max base): **P(round ≥ cap) ≤ 6.7 × 10⁻⁵³**. Hence the cap changes the RTP by < 10⁻⁵⁰ and the stated 96.0003 % is effectively the capped RTP.
- **Observed** maximum in 100 M rounds: 744.6×; cap hits: 0. **The 5,000× target is therefore a limit rule, not an attainable win** in this paytable. A provider expecting a practically attainable 5,000× would require a redesign (e.g. progressive FS multipliers); this is intentionally not done now. **NOT VERIFIED:** any claim of practical 5,000× hit frequency.

## 7. Tests executed (final run, see `RELEASE_REPORT_V2.md` for counts)
Per payline (20 × 3 lengths vs reference), isolated/leading/combined wilds, wild-only line, scatter 3/4/5, free-spin multiplier, ties, 60 k random grids main vs independent evaluator (both modes), chi-square RNG uniformity, strips structure, version-hash pin, exact RTP pin, enumeration-vs-analytic integer equality, insufficient credits, double spin, double settle, double chest pick, invalid chest index, interruption mid-spin and mid-chest with restore, free-spin cap at 30, cap clipping/forfeit, balance conservation over 30 k spins, integer cents.

## 8. Limitations / what is not proven
- Round-level SD, tails and buckets are **SIMULATED** (no closed-form distribution of the feature total was built).
- Independence of reel stops and uniformity rely on the RNG: crypto source = **REQUIRES EXTERNAL CERTIFICATION**.
- Free-spin retrigger uses Wald's identity on the uncapped total (valid; cap effect bounded in §6).
- Results of one 100 M seed are a sample (z = 1.5 here); 1 M and 10 M runs are shown to illustrate sampling error, not to select the best.
- Lab certification (GLI-19 / equivalent), RNG certification, RTP sign-off per jurisdiction: **REQUIRES EXTERNAL CERTIFICATION**.
