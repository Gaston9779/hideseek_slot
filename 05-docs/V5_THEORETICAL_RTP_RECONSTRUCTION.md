# V5 theoretical RTP reconstruction

Raw calculation: [v5-precap.json](data/v5/theoretical/v5-precap.json). Tool: `node --import tsx tools/math/v5-theoretical.ts`.

The model is independent of production payout evaluation: it enumerates reel symbol-count states with `tools/math/v4/ref.ts`, exact special-window distributions, then uses finite-state Markov reward DP for V5 extensions, queued segments and picks. Reel probability inputs are exact integers; the final DP is IEEE-754 numerical summation, not Monte Carlo. The displayed precision should not be interpreted as a rational cap-inclusive proof.

| Component | RTP fraction | RTP percent |
|---|---:|---:|
| Base line wins | 0.549171113305622 | 54.9171113306% |
| Base Scatter pay | 0.028026401996613 | 2.8026401997% |
| Natural Scatter features, including in-feature picks | 0.348061112273596 | 34.8061112274% |
| Natural Chest features, including extensions | 0.037442777525300 | 3.7442777525% |
| **Normal total pre-cap** | **0.962701405101130** | **96.2701405101%** |

There is no duplicate dual term. Scatter feature contribution is weighted by each base `(ScatterCount, ChestCount)` state; Chest contribution is weighted once by `P(base Chest ≥3)`. A base dual receives both independently specified features serially, exactly as the engine does.

## Feature values

| Feature start | Expected physical spins | Expected pre-cap return |
|---|---:|---:|
| Scatter from 3 / 4 / 5 base Scatter | 12.5024974 / 15.6275700 / 20.8262847 | 48.2293109× / 60.2844719× / 80.3381664× |
| Chest ×1 / ×2 / ×5 | 12.5817722 each | 48.2427990× / 96.4855979× / 241.2139948× |
| Uniform Chest selection | — | 128.6474639× |

Feature-spin EV is 3.8343405289×. The current 134× Buy price therefore gives exact pre-cap `128.6474639 / 134 = 96.0055700682%`, independently reproduced by `tools/math/v5-exact-buy.ts`.

## Cap status

This result excludes cap clipping. The 5,000× cap is constructively reachable, but V5 permits up to 48 Chest spins and queued Scatter segments; no exact V5 cap distribution/correction is yet derived. Accordingly **96.2701405101% is pre-cap only**, not a certified final RTP.
