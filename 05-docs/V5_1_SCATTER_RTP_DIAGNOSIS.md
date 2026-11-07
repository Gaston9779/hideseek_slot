# V5.1 Scatter RTP diagnosis — 10 versus 12 initial spins

## Result

The loss is mathematically explained by the two removed initial Scatter spins. It is not a HUD or DEV-only error. The production configuration formerly used `initial[3]=12`; the V5 DP used the same 12-spin state.

| Pre-cap contribution (RTP fraction) | 12-spin legacy | 10-spin approved | Delta |
|---|---:|---:|---:|
| Base lines | 0.5464889043 | 0.5464889043 | 0 |
| Base Scatter awards | 0.0280264020 | 0.0280264020 | 0 |
| Scatter feature, including retriggers/picks | 0.3480611123 | 0.2936666347 | -0.0543944776 |
| Chest feature | 0.0374427775 | 0.0374427775 | 0 |
| **Total** | **0.9600191961** | **0.9056247185** | **-0.0543944776** |

The feature DP keeps the same strips, retrigger awards, maximum award, chest-pick cap, multiplier choice and queued-segment rule in both cases. The only changed state is the initial count for exactly three base-game Scatter.

## Feature-level comparison

| Metric | 10 initial | 12 initial | Delta |
|---|---:|---:|---:|
| Exact expected physical feature spins | 10.418820 | 12.502497 | 2.083678 |
| Exact feature value (× total bet) | 40.191368 | 48.229311 | 8.037943 |
| Expected ×1 segment spins | 10.393567 | 12.472195 | 2.078627 |
| Expected ×2 segment spins | 0.012626 | 0.015151 | 0.002525 |
| Expected ×5 segment spins | 0.012626 | 0.015151 | 0.002525 |

The added two starting opportunities also create a small, legitimate increase in retriggers and internal Chest picks; they do not change their probability law. There is no separate Dual-rule change: dual rounds retain a 12-spin Chest feature and then enter the Scatter feature at its selected initial count.

## Independent feature Monte Carlo

`tools/math/v5-scatter-diagnosis.ts 100000` uses direct feature-state simulation and `generateOutcome`, rather than the DP transition routine. Same seed per comparison.

| Metric | 10 initial | 12 initial |
|---|---:|---:|
| Mean feature value | 40.09355× | 48.18678× |
| Standard error | 0.12634× | 0.13874× |
| Mean physical spins | 10.40930 | 12.49347 |
| Retrigger spins | 0.37426 | 0.44835 |
| Internal Chest picks | 0.00292 | 0.00376 |

Observed value difference: 8.09323× (95% uncertainty approximately ±0.36779×), containing the DP difference 8.03794×. This supports, rather than disproves, the 5.43944776 percentage-point normal-RTP drop.

## Cap and certification

Neither comparison includes a newly derived 5,000× round-cap correction. The old normal cap bound belongs to the 12-spin model and cannot certify the corrected model. No normal 96% claim is valid until a separately approved retune, exact/cap analysis and larger production-engine campaign are completed.

## Non-implemented retune options

1. Increase feature-line payouts only: needs about +5.44 RTP points through the Scatter feature; preserves trigger frequency but raises feature volatility and tail/cap pressure.
2. Increase base Scatter trigger frequency through strips: target a higher 3+ Scatter rate while keeping pays fixed; materially changes hit frequency, reel design and volatility.
3. Raise the 3-Scatter award while retaining the displayed 10 spins via an approved per-feature additive award/multiplier mechanic: commercially transparent but changes feature rules and volatility; it must not be hidden.

None is implemented. Buy Bonus remains mathematically unchanged only if Chest rules, strips and feature payouts remain unchanged; any global strip/payout retune requires Buy revalidation.
