# V5.1 stake scaling to €50 — technical/economic verification

No UI limit was changed. The present configuration exposes `BETS=[20,40,100,200,500]` cents (€0.20/€0.40/€1/€2/€5); €0.50, €10, €20 and €50 are not selectable in the current UI/configuration.

## Deterministic unit model

Production math pays integer **units**, with 20 units per total bet. A payout is `units × stakeCents / 20`; Chest multiplier and Free Spin results multiply units before currency conversion. Buy cost is `134 × stakeCents`; max is `5,000 × stakeCents`. Thus outcome multiples, RTP, 20-line relative payout and Chest 1/2/5 package distribution are stake-independent. Exact cent representation requires `stakeCents` divisible by 20, unless monetary rounding policy is added.

| stake | cents/unit | line & bonus scaling | Buy 134x | Max 5,000x | cent-integral for all unit payouts | result |
|---:|---:|---|---:|---:|---|---|
| €0.20 | 1c | exact | €26.80 | €1,000 | yes | PASS |
| €0.50 | 2.5c | exact only in half-cents | €67.00 | €2,500 | **no** | FAIL without rounding policy |
| €1 | 5c | exact | €134 | €5,000 | yes | PASS |
| €2 | 10c | exact | €268 | €10,000 | yes | PASS |
| €5 | 25c | exact | €670 | €25,000 | yes | PASS |
| €10 | 50c | exact | €1,340 | €50,000 | yes | PASS technically |
| €20 | 100c | exact | €2,680 | €100,000 | yes | PASS technically |
| €50 | 250c | exact | €6,700 | €250,000 | yes | PASS technically |

JavaScript `number` safely represents these cent totals by many orders of magnitude (well below `Number.MAX_SAFE_INTEGER` in ordinary session lengths); no numeric overflow is indicated. However the engine's present `balance` is a number and does not impose an integer-cent invariant. At €0.50, odd-unit line wins would create 0.5-cent balances, so displaying/settling currency requires an explicit approved rounding policy before enabling that stake.

## Recommendation

Do not enable €0.50 until a formal rounding/ledger policy and tests are approved. €10/€20/€50 are arithmetically linearly scalable, including Buy and max win, but require a separate UI/product approval to extend `BETS`, balance provisioning and responsible-gaming limits. This is a technical conclusion only, not authorization to change the maximum stake.
