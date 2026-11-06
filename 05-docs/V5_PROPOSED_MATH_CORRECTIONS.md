# V5 proposed math corrections — analysis only, not applied

No economic configuration has been changed in this reconstruction.

## Finding

Normal pre-cap RTP is 96.2701405101%, approximately 0.27014 percentage points over target. Buy pre-cap RTP is 96.0055700682% at 134× and is independently coherent.

## Smallest coherent direction

Keep trigger strips, Chest package fairness and Buy price unchanged. Retune a small number of ordinary line-pay entries only after rerunning the V5 DP. This preserves:

- base Scatter/Chest/dual trigger frequencies;
- Scatter and Chest extension probabilities;
- the 1/2/5 selection law and package spin counts;
- Max Win reachability mechanism;
- Buy price denominator and current Buy target.

Reducing an ordinary line pay also reduces feature-spin EV, so it lowers normal Scatter and Chest contributions in addition to base lines. The marginal effect must be computed with `v5-theoretical.ts` for each candidate; a naïve V4 coefficient is invalid.

## Alternatives rejected

- Changing reels/trigger density: changes feature rates, variance and the intended extension behavior; not minimal.
- Changing Chest package multipliers: changes genuine player-choice value and Buy EV; not minimal.
- Changing Buy price: cannot correct normal RTP and Buy is already near target.
- Relying on the cap: unsupported; no V5 cap correction exists.

Before any retune, complete an independent V5 cap distribution/bound, calculate exact/paytable sensitivities with the current DP, select a target tolerance, rerun exact pre-cap + Monte Carlo, and separately recalibrate Buy only if its post-cap value requires it.
