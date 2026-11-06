import {describe,it,expect} from 'vitest';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import * as C from '../src/math/v2/config';import {BASE_STRIPS,FS_STRIPS} from '../src/math/v2/strips';
import {evaluate,type Grid} from '../src/math/v2/evaluate';import {refEvaluate} from '../tools/math/ref';import {SeededRng,CryptoRng} from '../src/math/v2/rng';
import {generateOutcome,windowAt} from '../src/math/v2/spin';import {exactModel} from '../tools/math/exact';
const fill=(s:C.SymbolId):Grid=>Array.from({length:5},()=>[s,s,s]);
/** grid where only cells in `cells` carry `sym`, every other cell alternates two harmless low symbols so no accidental lines form */
function lineGrid(line:readonly number[],sym:C.SymbolId,n=5):Grid{const g:Grid=Array.from({length:5},(_,c)=>[0,1,2].map(r=>((c+r)%2?'POTION':'TOMB') as C.SymbolId));for(let c=0;c<n;c++)g[c]![line[c]!]=sym;return g;}
describe('version pinning',()=>{it('config+strips hash is pinned (any math change must bump version, fixture and changelog)',()=>{
 const payload=JSON.stringify({v:C.MATH_VERSION,s:C.SYMBOLS,bets:C.BETS,lines:C.paylines,pays:C.LINE_PAYS,sc:C.SCATTER_PAY_X,fs:C.FREE_SPINS,cap:C.MAX_WIN_X,chest:C.CHEST,base:BASE_STRIPS,free:FS_STRIPS});
 const h=createHash('sha256').update(payload).digest('hex');expect(h).toBe(readFileSync('tests/fixtures/math-hash.txt','utf8').trim());});});
describe('structure',()=>{
 it('20 distinct paylines, 5 columns, rows 0..2',()=>{expect(C.paylines.length).toBe(20);expect(new Set(C.paylines.map(l=>l.join())).size).toBe(20);for(const l of C.paylines){expect(l.length).toBe(5);expect(l.every(r=>r>=0&&r<=2)).toBe(true);}});
 it('all bets are multiples of 20 cents (no rounding anywhere)',()=>{for(const b of C.BETS)expect(b%20).toBe(0);});
 it('strips: 5 reels × 32, wild only on reels 2-4, ≤1 scatter per 3-row window',()=>{for(const set of [BASE_STRIPS,FS_STRIPS]){expect(set.length).toBe(5);set.forEach((s,r)=>{expect(s.length).toBe(32);if(![1,2,3].includes(r))expect(s.includes('WILD')).toBe(false);for(let i=0;i<s.length;i++)expect(windowAt(s,i).filter(x=>x==='SCATTER').length).toBeLessThanOrEqual(1);});}});
});
describe('evaluator',()=>{
 it('pays every payline (3/4/5 of a kind) and agrees with the independent reference',()=>{for(let l=0;l<20;l++)for(const n of [3,4,5]){const g=lineGrid(C.paylines[l]!,'SKULL',n);const e=evaluate(g);const w=e.lineWins.find(x=>x.line===l+1);expect(w?.count,`line ${l+1} n=${n}`).toBe(n);expect(w!.units).toBe(C.LINE_PAYS.SKULL![n-3]);expect(e.totalUnits).toBe(refEvaluate(g,'base').totalUnits);}});
 it('fewer than 3 pays nothing',()=>{expect(evaluate(lineGrid(C.paylines[1]!,'SKULL',2)).lineWins.find(x=>x.line===2)).toBeUndefined();});
 it('wild substitutes (isolated, leading, multiple) and never pays alone',()=>{
  const g=lineGrid(C.paylines[0]!,'KEY');g[1]![1]='WILD';expect(evaluate(g).lineWins[0]!.count).toBe(5);
  const lead=lineGrid(C.paylines[0]!,'KEY');lead[0]![1]='WILD';lead[1]![1]='WILD';expect(evaluate(lead).lineWins.find(x=>x.line===1)!.symbol).toBe('KEY');
  const allW=lineGrid(C.paylines[0]!,'WILD');expect(evaluate(allW).lineWins.find(x=>x.line===1)).toBeUndefined();
  const wsc=lineGrid(C.paylines[0]!,'WILD',3);wsc[3]![1]='SCATTER';expect(evaluate(wsc).lineWins.find(x=>x.line===1)).toBeUndefined();});
 it('wild does not substitute for scatter; scatter breaks a run',()=>{const g=lineGrid(C.paylines[0]!,'KEY');g[2]![1]='SCATTER';expect(evaluate(g).lineWins.find(x=>x.line===1)).toBeUndefined();});
 it('one win per line: the longest run, never double counted',()=>{const e=evaluate(lineGrid(C.paylines[0]!,'GHOST',5));expect(e.lineWins.filter(x=>x.line===1).length).toBe(1);expect(e.lineWins[0]!.units).toBe(C.LINE_PAYS.GHOST![2]);});
 it('scatter pays anywhere for 3/4/5 and counts all cells',()=>{for(const [k,x] of [[3,3],[4,20],[5,100]] as const){const g:Grid=Array.from({length:5},()=>['TOMB','POTION','TOMB'] as C.SymbolId[]);let n=0;for(let c=0;c<5&&n<k;c++){g[c]![c%3]='SCATTER';n++;}const e=evaluate(g);expect(e.scatterCount).toBe(k);expect(e.scatterUnits).toBe(x*20);}});
 it('free-spin multiplier applies only in free mode and only to lines containing a wild',()=>{const g=lineGrid(C.paylines[0]!,'KEY');g[2]![1]='WILD';const b=evaluate(g,'base').lineWins.find(x=>x.line===1)!,f=evaluate(g,'free').lineWins.find(x=>x.line===1)!;expect(f.units).toBe(b.units*C.FREE_SPINS.wildMultiplier);const g2=lineGrid(C.paylines[0]!,'KEY');expect(evaluate(g2,'free').lineWins.find(x=>x.line===1)!.units).toBe(evaluate(g2,'base').lineWins.find(x=>x.line===1)!.units);});
 it('ties: equal-pay different symbols on different lines both pay',()=>{const g=lineGrid(C.paylines[1]!,'KEY');for(let c=0;c<5;c++)g[c]![2]='POTION';const e=evaluate(g);expect(e.lineWins.length).toBeGreaterThanOrEqual(2);});
 it('main evaluator == independent reference on 60,000 random grids, both modes',()=>{const rng=new SeededRng(7);const syms=C.SYMBOLS;for(let i=0;i<60000;i++){const g:Grid=Array.from({length:5},()=>[0,1,2].map(()=>syms[rng.int(syms.length)]!));for(const m of ['base','free'] as const){const a=evaluate(g,m),b=refEvaluate(g,m);if(a.totalUnits!==b.totalUnits||a.scatterCount!==b.scatterCount)throw new Error(`mismatch ${JSON.stringify(g)} ${m} ${a.totalUnits} vs ${b.totalUnits}`);}}});
 it('theoretical maximum single-spin screens stay below the round cap in one spin (cap is a round-level rule)',()=>{const g=fill('SKULL');expect(evaluate(g,'free').totalUnits).toBeLessThan(C.MAX_WIN_UNITS);});
});
describe('rng',()=>{
 it('is reproducible and int() stays in range',()=>{const a=new SeededRng(5),b=new SeededRng(5);for(let i=0;i<1000;i++){const x=a.int(32);expect(x).toBe(b.int(32));expect(x>=0&&x<32).toBe(true);}});
 it('is uniform (chi-square, n=7 and n=32)',()=>{for(const n of [7,32]){const r=new SeededRng(99),N=700000,c=Array(n).fill(0);for(let i=0;i<N;i++)c[r.int(n)]++;const e=N/n;const chi=c.reduce((s,x)=>s+(x-e)**2/e,0);expect(chi).toBeLessThan(n===7?22.5:61);}});
 it('rejects invalid n; crypto source stays in range',()=>{expect(()=>new SeededRng(1).int(0)).toThrow();const c=new CryptoRng();for(let i=0;i<1000;i++){const x=c.int(32);expect(x>=0&&x<32).toBe(true);}});
 it('outcome depends only on the RNG stream (no history, no balance): same seed → same outcomes across engines',()=>{const a=new SeededRng(3),b=new SeededRng(3);for(let i=0;i<500;i++)expect(generateOutcome(a)).toEqual(generateOutcome(b));});
});
describe('exact RTP',()=>{
 const m=exactModel();
 it('theoretical RTP is 96.00% (exact rational; pinned to 8 decimals)',()=>{expect(m.total.toString(8)).toBe('0.96000323');expect(Math.abs(m.total.num()-0.96)).toBeLessThan(0.0001);});
 it('components sum exactly to the total',()=>{expect(m.baseLines.add(m.baseScatter).add(m.fsRtp).add(m.chestRtp).frac()).toBe(m.total.frac());});
 it('enumeration report (if present) matches the analytic integers exactly',()=>{let j:any;try{j=JSON.parse(readFileSync('05-docs/data/enumeration.json','utf8'));}catch{return;}
  expect(j.base.combinations).toBe(32**5);expect(BigInt(j.base.sumLineUnits)).toBe(20n*(m.baseLines.n*(m.DB/m.baseLines.d)));
  expect(BigInt(j.free.sumLineUnits)).toBe(20n*(m.fsLines.n*(m.DF/m.fsLines.d)));expect(j.base.scatterCounts.slice(0,6).map(BigInt)).toEqual(m.sB.slice(0,6).map(q=>q.n*(m.DB/q.d)));expect(j.free.scatterCounts.slice(0,6).map(BigInt)).toEqual(m.sF.slice(0,6).map(q=>q.n*(m.DF/q.d)));expect(j.base.refSampleMismatches).toBe(0);expect(j.free.refSampleMismatches).toBe(0);});
});
