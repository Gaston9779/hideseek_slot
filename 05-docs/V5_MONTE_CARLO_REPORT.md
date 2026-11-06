# V5 Monte Carlo report

All campaigns use the real `SlotGame`, real settlement/cap/ledger and real chest APIs. Chest position uses a separate reproducible `SeededRng`; it never substitutes a multiplier draw.

| Campaign | Rounds | Engine / choice seed | RTP | 95% CI | 99.9% CI | SD | Cap / accounting failures |
|---|---:|---|---:|---:|---:|---:|---:|
| Normal pooled | 10,000,000 | 2026110711/12 + 2026110713/14 | 96.5698500% | 96.1184225–97.0212775% | 95.8119754–97.3277246% | 7.28336× | 0 / 0 |
| Normal pilot | 1,000,000 | 2026110701 / 02 | 95.5377500% | 94.1999348–96.8755652% | — | 6.82559× | 0 / 0 |
| Buy | 1,000,000 | 2026110703 / 04 | 96.1949808% | 95.9636240–96.4263376% | 95.8065698–96.5833919% | 1.18039× | 0 / 0 |

Normal observed trigger rates (10m component runs) were Scatter 0.007125875 / 0.0070115, Chest 0.000290 / 0.0002775 and dual 0.000104125 / 0.000095; consistent in scale with the exact base rates, but the campaign is not an exact frequency proof.

The Buy sample used 12,584,256 physical feature spins. It recorded 93,765 `FEATURE_EXTENDED` events, proving the V4.1 extension path is exercised. No cap hit was observed; this cannot establish a zero cap probability.

The normal 10m estimate is above 96% and its 95% CI excludes 96%. Since no V5 normal theoretical model exists, this is a release-blocking discrepancy rather than proof that the engine is wrong. It requires a V5 state-space calculation and an independent larger campaign before any target claim.

Raw JSON: `data/v5/normal-*.json`, `data/v5/buy-1000000-e2026110703-c2026110704.json`, and pooled summaries.
