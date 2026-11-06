# MATH CHANGELOG

Any change to `src/math/v2/config.ts` or `strips.ts` MUST: bump `MATH_VERSION`, update `tests/fixtures/math-hash.txt` (`npx tsx` snippet in the test), re-run `tools/math/exact.ts`, `enumerate.ts`, `simulate.ts`, and add an entry here. `tests/math-v2.test.ts › version pinning` enforces it.

## 2.0.0 — 2026-11-06 (rebuild; supersedes the unversioned "v1" engine)
Reason: audit (`MATH_AUDIT.md`) measured the v1 engine at ≈ 237 % (base) / 271 % (full) RTP — not a viable slot — with clumped strips, per-spin-only cap, dropped wild wins, fake chest values.
- Line pays now in line-bet units (÷20); all bets multiples of 20 ¢ (was 20/50/100/200/500 → 20/40/100/200/500).
- New explicit 32-stop strips (base + free spins), wild on reels 2–4 only, one scatter per reel.
- Paytable redesigned (table in `MATH_SPEC_V2.md`); wild has no own pay; scatter 3/20/100× total bet.
- Free spins: 12/15/20 initial, +5/8/10 retrigger, cap 30; FS strips; winning lines with wild ×3.
- Chest bonus connected to the engine: trigger ≥4 base scatters, committed prize sets, EV 56.88×.
- Cap 5,000× per round (was per spin).
- RNG: sfc32 for simulation; rejection-sampled `int(n)` for all sources.
- Exact theoretical RTP: **96.00032 %**. Base lines 59.0908 % · base scatter 2.8026 % · free spins 32.0746 % · chest 2.0323 %.
- Tuning log (documented parameter changes, never per-result forcing): initial paytable 97.81 % → trimmed low-symbol 4-of-a-kind and top chest sets → 96.00 %.
