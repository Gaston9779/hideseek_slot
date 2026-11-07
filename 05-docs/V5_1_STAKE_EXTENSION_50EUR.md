# V5.1 stake extension through €50

## Change

Available stakes are now `€0.20, €0.40, €1, €2, €5, €10, €20, €50` (`[20,40,100,200,500,1000,2000,5000]` cents). Default remains €1 (`betIndex=2`). €0.50 remains intentionally unavailable.

`MAX_BET_CENTS=5000` is the market-deployment ceiling; `BETS` is derived from the approved catalog up to that ceiling. A future partner can reduce this one value before deployment without modifying RTP, reels, paytable, RNG, features, Chest distribution or the 5,000× cap.

## Verification

The selector and Buy dialog already use `BETS.length` for their upper bound and the shared `money()` formatter for amounts. HUD fields retain their existing auto-fit behavior, so €10/€20/€50 and their Buy prices are formatted through the same display path; no layout/style change was made.

New deterministic tests cover every available stake:

- all are multiples of 20 cents, therefore every unit, line win, feature credit and ledger amount remains whole cents;
- Buy cost remains exactly `134 × stake`: €26.80 / €53.60 / €134 / €268 / €670 / €1,340 / €2,680 / €6,700;
- max win remains exactly `5,000 × stake`, up to €250,000 at €50;
- Chest ×5 credit, cap clipping and ledger conservation are checked at every stake;
- no overflow, fractional cents or duplicate credit was observed.

## Files changed

- `src/math/v4/config.ts` — stake catalog, `MAX_BET_CENTS`, effective `BETS`.
- `src/config/game.ts` — exposes `MAX_BET_CENTS` to presentation/integration.
- `tests/stake-range-v5_1.test.ts` — deterministic coverage across all eight stakes.

## Results

Regression tests PASS (including 9 new stake tests), typecheck PASS, production build PASS. The existing audio test prints its intentional handled missing-file diagnostic but passes. No graphic, audio, cinematic, bonus-flow or mathematical-game change was made.
