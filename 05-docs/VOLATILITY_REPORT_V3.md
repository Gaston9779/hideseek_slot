# Skull Hunt — Volatility Report V3

The model is high volatility. The 100M production-engine sample has paid-round variance **113.8964 bet²** and standard deviation **10.6722× bet**. The 5,000× atom materially controls convergence, so small RTP samples are not suitable for certification decisions.

Observed complete-round percentiles are P50 0×, P75 0.60×, P90 1.80×, P95 3.00×, P99 10.85×, P99.9 82.00× and P99.99 171.05×.

## Observed complete-round tail, 100M rounds

| Return at least | Probability | Approx. one in | Count |
|---:|---:|---:|---:|
| 1× | 16.715680% | 5.98 | 16,715,680 |
| 10× | 1.127860% | 88.66 | 1,127,860 |
| 20× | 0.674421% | 148.28 | 674,421 |
| 50× | 0.283366% | 352.90 | 283,366 |
| 100× | 0.057259% | 1,746.45 | 57,259 |
| 250× | 0.002429% | 41,169.21 | 2,429 |
| 500× | 0.001055% | 94,786.73 | 1,055 |
| 1,000× | 0.000335% | 298,507.46 | 335 |
| 2,000× | 0.000335% | 298,507.46 | 335 |
| 5,000× | 0.000335% | 298,507.46 | 335 |

The exact selected-5,000× rate is 1/303,162.52; the observed 335/100M is consistent. Every 5,000× sample hit was cap-limited as intended. The next-largest configured chest prize is 500×, explaining the visible gap to the top atom.

The base-spin immediate hit frequency was 44.352314%; complete paid rounds returning at least the stake were 16.715680%. These metrics answer different questions and should not be conflated. Average triggered Free Spins length was 12.6155 spins; total physical spins were 108,981,925 for 100M paid rounds.

Source: [100M raw output](data/v3/simulation-100000000-seed20261118.json). Tail values are empirical estimates, not closed-form probabilities, except the selected-5,000× event documented in the RTP proof.
