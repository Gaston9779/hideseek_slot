# V5.1 Chest Bonus — commercial analysis

Status: analysis only. No production mathematical, RTP, strip, paytable, UI or Buy-price change was made. Profile: commit `bf6438d`, `MATH_VERSION=5.1.0`, Buy price 134x.

## Evidence and method

The existing 1,000,000-buy raw run (`05-docs/data/v5/buy-1000000-e2026110713-c2026110714.json`) is the primary RTP cross-check: 96.085708% observed, with package means x1 48.208181x, x2 96.425173x, x5 241.243814x. It contains no order statistics, so it cannot answer the requested medians/percentiles. The supplemental, reproducible 500,000-buy analysis is `data/v5_1/buy-commercial-500000-e2026110731-c2026110732.json`; it uses production `SlotGame.buyChestBonus()`, production free spins/extensions, Fisher–Yates package commit, and an independent random chest-position RNG. It is simulated evidence, not a claim of an exact distribution.

Exact/theoretical context: pre-cap package EVs are 48.242799x / 96.485598x / 241.213995x, uniform 128.647464x. The 134x pre-cap Buy RTP is 96.005570%; the capped value lies in 96.005512–96.005570% by the existing rigorous cap bound.

## Per selected chest — simulated 500k Buy sample

All returns below are multiples of base stake, not multiples of purchase price.

| chest | selections | mean | P10 | P25 | median | P75 | P90 | P95 | P99 | P99.9 | min / max | SD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| x1 | 165,993 | 48.173 | 11.70 | 20.95 | 37.05 | 61.80 | 95.00 | 124.30 | 209.35 | 376.30 | 0 / 675.40 | 42.619 |
| x2 | 167,231 | 96.226 | 23.40 | 41.70 | 74.00 | 123.30 | 189.30 | 249.20 | 420.90 | 741.80 | 0 / 1,343.10 | 85.225 |
| x5 | 166,776 | 240.750 | 58.50 | 104.25 | 185.25 | 308.50 | 473.25 | 623.25 | 1,060.00 | 1,857.75 | 0 / 3,632.75 | 213.561 |

| chest | 0x | <10x | <50x | >=100x | >=134x | >=200x | >=500x | >=1000x | Max Win |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| x1 | 0.0880% | 7.7461% | 64.8853% | 8.8136% | 4.1176% | 1.2157% | 0.0139% | 0% | 0% |
| x2 | 0.0885% | 2.5605% | 31.8147% | 35.0360% | 21.3764% | 8.7083% | 0.4873% | 0.0108% | 0% |
| x5 | 0.0851% | 0.6458% | 7.7061% | 76.5086% | 65.2078% | 46.2794% | 8.7447% | 1.2508% | 0% |

The simulation observed 46,433 `FEATURE_EXTENDED` events, 9.2866% per purchase. These are included in every number above. No cap hit occurred; this does not prove cap probability is zero.

## Overall Buy economics — simulated 500k sample

Mean 128.4795x; median 76.00x; SD 157.9189x. Distribution: 0–<10x 3.6434%; 10–<50x 31.1088%; 50–<100x 25.0840%; 100–<134x 9.8970%; 134–<200x 11.5140%; 200–<500x 15.6684%; 500–<1000x 2.6636%; >=1000x 0.4208%.

- Return below 134x price: 69.7332%; break-even/profit: 30.2668%.
- Loss greater than 50% of price: 45.3260%; loss greater than 90%: 5.8632%.
- At least 2x / 5x / 10x the purchase price (268x / 670x / 1,340x): 12.0856% / 1.4616% / 0.1308%.
- Sample Max Win frequency: 0/500,000. The existing 1M Buy raw also recorded 0/1,000,000; this is observation, not an exact frequency.

## Interpretation of the three choices

The packages are mathematically fair in the stated sense: one each x1/x2/x5 is committed and the selected position is uniform; observed selection counts are near one third. Their outcomes are intentionally not equally attractive at a 134x purchase price.

- x5 still returns less than price in **34.7922%** of its selections.
- x1 exceeds price in only **4.1176%**; x2 exceeds it in **21.3764%**.
- x5 supplies the upper tail: its median is above price (185.25x), while x1/x2 medians are below it. This explains a commercial experience with a highly visible high prize but a low overall median.

Qualitative judgment, not provider benchmarking: the structure is internally coherent and clearly differentiated. It is commercially plausible for a high-volatility explicit Buy, but materially punitive in typical realized outcomes: roughly seven purchases in ten are below cost and nearly half lose over half the cost. Whether that is suitable depends on the intended high-volatility audience and disclosure/design goals; no comparison with competitor products is asserted.

## Indicative price arithmetic — not a recommendation or retune

At a target 96% Buy RTP, required average feature value is simply `0.96 × price`:

| hypothetical price | required feature EV for 96% | current exact pre-cap feature EV | implied pre-cap RTP with current feature |
|---:|---:|---:|---:|
| 100x | 96.0x | 128.647464x | 128.6475% |
| 120x | 115.2x | 128.647464x | 107.2062% |
| 134x current | 128.64x | 128.647464x | 96.0056% |
| 150x | 144.0x | 128.647464x | 85.76498% |

Conclusion: **134x is mathematically coherent** with the current feature EV and capped bound. It is **commercially plausible only as a deliberately high-volatility Buy**; its simulated distribution is **penalizing in the majority of results**, though not inconsistent with its advertised x1/x2/x5 risk structure. It is suitable for the current experience only if that high-risk expectation is intentional and clearly communicated. Certification, exact full distribution, and external market benchmarking are not provided by this report.
