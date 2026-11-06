# Bonus cinematics V3 — Seeker chase tied to confirmed bonus events

Presentation only. Math/engine untouched; the controller reads `skull-hunt:game-event` (payloads from `src/engine/events.ts`, nothing invented).

| Event (real payload fields used) | Cinematic |
|---|---|
| `FREE_SPINS_TRIGGERED` (`source==='BASE'`, `awardedSpins`) | chase → violet magic burst + violet frame glow + spectral wisps → existing Free Spins screen (count from engine state/event) |
| `CHEST_BONUS_TRIGGERED` | chase; a crate drops on the plinth, Seeker trips into it → golden burst + gold frame glow → existing Hide & Seek screen |
| `DUAL_BONUS_TRIGGERED` (`awardedSpins`) | ONE chase (crate + violet/gold energy), banner "HIDE & SEEK BONUS + N FREE SPINS" → Chest Bonus → on completion the already-assigned Free Spins screen |
| `BEST_CHEST_PICK` | marks the round; the chest overlay's existing celebration (Skull 3D, golden particles, "BEST PICK!") runs once |
| `MAX_WIN` + `BEST_CHEST_PICK` same round | single coordinated sequence inside the chest screen: banner "MAX WIN! <real credited amount>", dual gold/violet glow, richer bursts, Skull celebrating |
| `MAX_WIN` alone (cap reached on a spin) | MAX WIN screen after settlement: real round total counter, Skull above the dim layer, bursts; the regular BIG/MEGA banner is suppressed so nothing overlaps |
`FREE_SPINS_TRIGGERED` with `source==='RETRIGGER'` keeps the existing in-feature banner (no chase).

## Controller (`src/chase/bonusCinematic.ts`)
`BonusCinematicController` is armed per player spin (`beginSpin/endSpin`); events outside an armed spin (restored sessions) are ignored; every event is de-duplicated by `type:roundId:spinNo`; DUAL overrides CHEST/FS so only one handler runs. `run()` never rejects; skip (button, Space/Enter/Esc) aborts only the chase and plays a short ending, so prizes/features are never skipped. Reduced motion: no chase, no flashes/particles, brief glow only. The seeker/skull/crate GLBs are loaded once (`director.ts`) and reused.
The old random spin-count trigger (`scheduler.ts`, minSpins/maxSpins/cooldown) was removed.

## Chase timeline (story 7.0 s ÷ 1.25 ≈ 5.6 s)
Seeker enters right (stays on the right slab, clear of the reels) and scans → Skull alert (`afraid` clip) / panic / flees left → hidden behind the machine (depth occluders from the frame/panel PNG alpha) → Seeker follows ~0.6 s later → Skull pops out right, dashes home along the plinth, settles at the exact original pose/scale → crate drops (chest/dual) → Seeker emerges, trips (impact = ending trigger) and tumbles out right.

## Reproducible seeds (`?qa&seed=N`, DEV builds; first spin; verified)
FS only `136` · Chest only `872` (prizes 40/24/10) · Dual `693` (prizes 10/24/40, 12 FS) · Jackpot `295476` (prizes 100/500/5000: pick chest 3 → `BEST_CHEST_PICK`+`MAX_WIN`, balance 99,900→599,900). Seeds are SeededRng seeds of the first spin; they do not apply to production (crypto RNG).
