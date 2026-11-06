# Skull Hunt — RTP Validation V3

## Theoretical result

The independent rational enumerator reports **96.0006488767464%**, within the specified 96.00% ±0.01 percentage-point band.

| Component | RTP |
|---|---:|
| Base lines | 58.0239754032% |
| Base Scatter | 2.8026401997% |
| Free Spins | 32.0746149179% |
| Chest Bonus, after selected-5,000× cap correction | 3.0994183560% |
| **Total** | **96.0006488767%** |

The proof in [exact.ts](../tools/math/v3/exact.ts) does not import the production evaluator. It enumerates symbol-count line states, the exact bivariate visible Scatter/Chest distribution, and a finite-state Free Spins retrigger DP using arbitrary-precision rational arithmetic. The production evaluator is separately compared with [ref.ts](../tools/math/v3/ref.ts) over 100,000 random grids in both modes.

The exact total includes the material selected-5,000× cap correction. For every other prize, [cap-bound.ts](../tools/math/v3/cap-bound.ts) pads the feature to 30 iid potential Free Spins and applies a Chernoff bound to the exhaustive Free Spin payout histogram. Since V3 only replaces a low V2 base symbol with a non-paying trigger, its base payout cannot exceed the exhaustively established 2,140-unit V2 maximum. With the 500× largest non-jackpot chest, at least 87,860 Free Spin units are required; the resulting cap-event bound is **9.405×10⁻⁵¹**, and its RTP effect is below **4.703×10⁻⁴⁷**. Thus all displayed RTP decimals are cap-exact. Raw bound: [non-jackpot-cap-bound.json](data/v3/non-jackpot-cap-bound.json).

## Trigger probabilities

| Event | Exact probability | One in paid rounds |
|---|---:|---:|
| Free Spins | 0.7124483585% | 140.3611 |
| Chest Bonus | 0.0291049480% | 3,435.8419 |
| Both on the same base spin | 0.0106524538% | 9,387.5084 |
| Selected 5,000× prize | 0.0003298561% | 303,162.5207 |

## Production-engine Monte Carlo

| Paid rounds | Seed | Observed RTP | 95% CI | Selected 5,000× |
|---:|---:|---:|---:|---:|
| 1,000,000 | 20261116 | 96.62632% | 94.38371–98.86893% | 4 |
| 10,000,000 | 20261117 | 95.96991% | 95.31269–96.62712% | 33 |
| 100,000,000 | 20261118 | 95.95451% | 95.74533–96.16368% | 335 |

The theoretical value is inside the 100M 95% interval and its 99.9% interval (95.60333–96.30568%). The 100M observed trigger rates were 1/140.4544 Free Spins, 1/3,428.6498 Chest Bonus and 1/9,404.6835 simultaneous. There were zero accounting-conservation failures.

Raw evidence: [theoretical.json](data/v3/theoretical.json), [1M](data/v3/simulation-1000000-seed20261116.json), [10M](data/v3/simulation-10000000-seed20261117.json), [100M](data/v3/simulation-100000000-seed20261118.json).
