/** Exhaustive one-spin outcome distribution for V5's 96-stop feature reels.
 * Windows with identical 3-row symbol tuples are coalesced before the 5-reel
 * Cartesian product.  This is exhaustive, not a Monte Carlo sample. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { LINE_PAYS, paylines, SCATTER_FREE_SPINS, SCATTER_PAY_X } from '../../src/math/v4/config';
import { FS_STRIPS } from '../../src/math/v4/strips';
import { windowAt } from '../../src/math/v4/spin';

type Window = { a: string[]; n: number; sc: number; cb: number };
const kinds = FS_STRIPS.map(strip => {
  const m = new Map<string, Window>();
  for (let i = 0; i < strip.length; i++) {
    const a = windowAt(strip, i); const key = a.join(',');
    const old = m.get(key);
    if (old) old.n++; else m.set(key, { a, n: 1, sc: a.filter(x => x === 'SCATTER').length, cb: a.filter(x => x === 'CHEST_BONUS').length });
  }
  return [...m.values()];
});
const hist = new Map<string, number>();
function payout(w: Window[]) {
  let units = 0;
  for (const line of paylines) {
    const v = line.map((row, col) => w[col]!.a[row]!);
    const lead = v.find(s => s !== 'WILD');
    if (!lead || lead === 'SCATTER' || lead === 'CHEST_BONUS') continue;
    let count = 0, wilds = 0;
    for (const s of v) { if (s === lead || s === 'WILD') { count++; if (s === 'WILD') wilds++; } else break; }
    const p = count >= 3 ? LINE_PAYS[lead]?.[count - 3] ?? 0 : 0;
    units += wilds ? p * SCATTER_FREE_SPINS.wildMultiplier : p;
  }
  const sc = w.reduce((x, q) => x + q.sc, 0), cb = w.reduce((x, q) => x + q.cb, 0);
  if (sc >= 3) units += SCATTER_PAY_X[Math.min(sc, 5) - 3]! * 20;
  return [units, sc, cb] as const;
}
let cases = 0;
for (const a of kinds[0]!) for (const b of kinds[1]!) for (const c of kinds[2]!) for (const d of kinds[3]!) for (const e of kinds[4]!) {
  const [u, sc, cb] = payout([a, b, c, d, e]); const key = `${u}/${sc}/${cb}`;
  hist.set(key, (hist.get(key) ?? 0) + a.n * b.n * c.n * d.n * e.n); cases++;
}
const rows = [...hist].map(([key, count]) => { const [units, scatter, chest] = key.split('/').map(Number); return { units, scatter, chest, count }; }).sort((a,b) => a.units-b.units || a.scatter-b.scatter || a.chest-b.chest);
const total = 96 ** 5, check = rows.reduce((s, x) => s + x.count, 0);
const report = { schema: 'skull-hunt-v5-feature-spin-outcome-distribution-1', method: 'exhaustive coalesced 3-row windows across five independent 96-stop reels', windowsPerReel: kinds.map(x => x.length), coalescedCartesianCases: cases, totalOutcomes: total, check, rows };
mkdirSync('05-docs/data/v5_1', { recursive: true });
writeFileSync('05-docs/data/v5_1/feature-spin-outcomes.json', JSON.stringify(report) + '\n');
console.log(JSON.stringify({ ...report, rows: rows.length }, null, 2));
