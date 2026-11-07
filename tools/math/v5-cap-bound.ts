/** Rigorous Chernoff cap-loss upper bound from the exhaustive feature-spin
 * distribution. It deliberately dominates every feature by 66 independent
 * 5x feature spins; therefore it is conservative, including extensions/picks. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { MAX_WIN_UNITS } from '../../src/math/v4/config';
import { BASE_STRIPS } from '../../src/math/v4/strips';
import { specialDist } from './v4/exact';

const total = 96 ** 5;
const rows = readFileSync('05-docs/data/v5_1/feature-spin-outcomes.tsv', 'utf8').trim().split('\n').slice(1).map(line => { const [units, scatter, chest, count] = line.split('\t').map(Number); return { units, scatter, chest, count }; });
const chestMgfLog = (t: number) => {
  let max = -Infinity; for (const x of rows) max = Math.max(max, t * 5 * x.units + Math.log(x.count / total));
  let s = 0; for (const x of rows) s += Math.exp(t * 5 * x.units + Math.log(x.count / total) - max);
  return max + Math.log(s);
};
// The base grid contributes at most 20*1035 + 20*100 units.  Treating that
// maximum as certain makes the normal-play bound valid without assuming payout
// independence between the base spin and its triggered feature.
const baseUpperUnits = 20 * 1035 + 20 * 100;
const thresholdNormal = MAX_WIN_UNITS - baseUpperUnits;
const thresholdBuy = MAX_WIN_UNITS;
const d = specialDist(BASE_STRIPS), db = total;
let pScatter = 0, pChest = 0;
for (let sc = 0; sc < d.length; sc++) for (let cb = 0; cb < d[sc]!.length; cb++) { const p = Number(d[sc]![cb]!)/db; if (sc >= 3) pScatter += p; if (cb >= 3) pChest += p; }
const bound = (threshold: number, maxSpins: number) => {
  let best: { t: number; logLoss: number; loss: number } | null = null;
  for (let t = 0.000001; t <= 0.00015; t += 0.000001) {
    // E[(X-C)+] <= exp(log E[e^(tX)] - tC) / t.
    const logLoss = maxSpins * chestMgfLog(t) - t * threshold - Math.log(t);
    if (!best || logLoss < best.logLoss) best = { t, logLoss, loss: Math.exp(logLoss) };
  }
  return best!;
};
const scatterNormal = bound(thresholdNormal, 66), chestNormal = bound(thresholdNormal, 48), buy = bound(thresholdBuy, 48);
// Union bound: a base dual is counted in both feature terms, which is again conservative.
const normalLoss = pScatter * scatterNormal.loss + pChest * chestNormal.loss;
const report = { schema: 'skull-hunt-v5_1-rigorous-cap-bound-1', method: 'exhaustive 96^5 feature-spin distribution + Chernoff moment bound; conservative feature domination', exactInputs: { featureSpinOutcomes: total, maxFeatureSpinUnits: Math.max(...rows.map(x => x.units)), maxScatterFeatureSpins: 66, maxChestFeatureSpins: 48, baseUpperUnits, maxWinUnits: MAX_WIN_UNITS, pScatter, pChest }, bounds: { normal: { scatterFeature: scatterNormal, chestFeature: chestNormal, expectedLossUnitsPerBaseRound: normalLoss, rtpFractionUpperBound: normalLoss / 20 }, buy: { chestFeature: buy, expectedLossUnitsPerPurchase: buy.loss, rtpFractionUpperBound: buy.loss / (134 * 20) } }, note: 'Bounds are valid but intentionally much wider than a cap distribution; no cap correction is asserted as exact.' };
mkdirSync('05-docs/data/v5_1', { recursive: true }); writeFileSync('05-docs/data/v5_1/cap-rigorous-bound.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
