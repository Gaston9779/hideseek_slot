# V5 RTP discrepancy analysis

| Quantity | Value |
|---|---:|
| Reconstructed normal pre-cap RTP | 96.2701405101% |
| 10m normal MC RTP | 96.5698500008% |
| Difference | +0.2997094907 percentage points |
| MC standard error | 0.230326% points |
| Standardized difference | +1.30 standard errors |
| MC CI95 | 96.1184225–97.0212775% |

The reconstructed value lies inside the MC CI95. The 10m result is therefore consistent with **sampling variation around a true pre-cap value near 96.27014%**; it is not a reproducible payout/code discrepancy. The old V4.0 model (95.76195%) was 0.80790 percentage points below the reconstructed value because it omitted V5 extensions/internal picks, explaining the earlier apparent mismatch.

The current pre-cap configuration is nevertheless about **+0.27014 percentage points** above the nominal 96% target. Cap clipping may reduce it, but no valid V5 cap correction proves that it reduces the full amount. Classification: **B, materially above target pre-cap; no code defect demonstrated.**

Buy is separate: exact pre-cap 96.00557%, and its 1m MC 96.19498% differs by 1.60 standard errors, within CI95. Thus Buy is mathematically coherent pre-cap; it cannot validate normal RTP.
