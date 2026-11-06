# PROVIDER READINESS — Hide & Seek: Skull Hunt (demo, math v2.0.0)

**This is a demo package prepared for preliminary provider/lab review. It is NOT certified and NOT commercially approved.** Certification and RGS integration are later steps.

| Area | Status | Notes |
|---|---|---|
| Theoretical RTP 96.0003 % (exact) | **VERIFIED** | exact rational + exhaustive enumeration, `RTP_VALIDATION_V2.md` |
| RTP by simulation (1 M/10 M/100 M, seeds fixed) | **SIMULATED** | all CIs contain 96.00 % |
| Evaluator vs independent evaluator | **VERIFIED** | 60 k random grids ×2 modes + 33.5 M-grid sample, 0 mismatches |
| Engine accounting (integer cents, conservation, no double credit) | **VERIFIED** | unit tests + 111 M rounds, 0 conservation failures |
| Interrupt/restore | **VERIFIED (engine)** / **NOT VERIFIED (UI persistence)** | snapshot API tested; the browser demo does not persist across reloads |
| Chest bonus tied to engine, committed prizes | **VERIFIED** | choice has no influence on EV (tested) |
| Practical 5,000× max win | **NOT VERIFIED** | cap is a limit; P ≤ 6.7×10⁻⁵³; observed max 744.6× / 10⁸ rounds |
| Production RNG | **REQUIRES EXTERNAL CERTIFICATION** | Web Crypto + rejection sampling; a certified RGS RNG replaces it via the `Rng` interface |
| RGS adapter | **NOT VERIFIED** | `Rng`, `SlotGame.snapshot/restore`, `BonusAdapter` are the seams; no RGS protocol implemented |
| Lab certification (GLI-19 or equivalent) | **REQUIRES EXTERNAL CERTIFICATION** | |
| Market compliance (UKGC RTS, others) | **NOT VERIFIED** | profiles below are starting points; the standards' current text was **not** consulted in this session (no document access) — the provider/lab must confirm |

## Market profiles (`src/config/markets.ts`, `?market=uk|demo`)
Presentation/control only; **probabilities, paytable and RTP are identical in every profile.**

| Topic | Demo profile | `uk` profile (to be confirmed against current UKGC RTS) |
|---|---|---|
| Minimum spin cycle | none | 2.5 s enforced before settle/presentation |
| Autoplay | not implemented | disabled (not implemented) |
| Turbo / quick spin | not implemented | disabled |
| Slam stop | not implemented | disabled |
| Win communication | tiers from real credited result; returns ≤ bet are **not** celebrated | same; net-position display flagged (`showNetPosition`) **not implemented** |
| RTP information | paytable dialog states 96.00 % theoretical, demo model | same |
| Rules/paytable | dialog generated from math config | same |
| Max win handling | 5,000× per round cap, remaining spins forfeited, MAX WIN tier | same; per-jurisdiction caps may differ — config value `MAX_WIN_X` is in the hashed math config |
| Demo behaviour | virtual credits, no persistence, no real money | same |

Not assumed: that 96 % is acceptable everywhere (some markets require different RTP variants — a second variant means new strips/paytable, new `MATH_VERSION`, new validation; not done).

## Known gaps for a provider
1. No audio (explicitly out of scope). 2. No autoplay/turbo/slam stop (deliberately absent). 3. No session persistence, history or reality-check UI. 4. Practical max-win shape (see §6 of RTP validation). 5. Free-spin and chest feature totals have no closed-form distribution; tails are Monte-Carlo only.
