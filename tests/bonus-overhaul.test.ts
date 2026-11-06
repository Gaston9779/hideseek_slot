import {describe,expect,it} from 'vitest';
import {SlotGame} from '../src/engine/game';import {SeededRng} from '../src/math/v2/rng';
import {hiddenBonusCents,shownSpinCents} from '../src/ui/bonusAccounting';
import {finaleLevel,FINALE_T} from '../src/ui/chestFinale';
import {MARKETS} from '../src/config/markets';
import {readFileSync} from 'node:fs';

const mk=()=>new SlotGame(new SeededRng(0x5c011));
/** One whole Chest feature with fixed base wins (units) per spin — same injection technique as engine-v4.test.ts. */
function run(m:1|2|5,baseUnits:number[]){
 const g=mk(),c=g.buyChestBonus();g.pickChest(c.multipliers.indexOf(m));g.closeChest();const unit=()=>g.roundBet/20;
 const start=g.balance;const trace:{shown:number;real:number;base:number}[]=[];let baseCum=0;
 baseUnits.forEach((u,i)=>{g.spin();g.last!.evaluation.totalUnits=u;const credited=g.settle();const done=g.lastCompletedFeature&&g.phase!=='free-spins'&&i===baseUnits.length-1;
  const ff=done?g.lastCompletedFeature:g.feature;const shown=shownSpinCents(ff,g.roundBet,credited);baseCum+=shown;
  const hidden=hiddenBonusCents(ff,g.roundBet);trace.push({shown:g.balance-hidden,real:g.balance,base:baseCum});});
 return {g,start,trace,unit};
}
describe('Chest feature: base shown during the spins, multiplier revealed only at the end (presentation accounting)',()=>{
 for(const m of [1,2,5] as const)it(`×${m}: displayed balance moves by the BASE win only; at the reveal it equals the ledger; no double multiplication`,()=>{
  const wins=[0,100,0,60,0,0,40,0,0,0,0,200];const {g,start,trace,unit}=run(m,wins);
  const baseTotal=wins.reduce((a,b)=>a+b,0)*unit();
  trace.forEach((t,i)=>{expect(t.shown).toBeCloseTo(start+wins.slice(0,i+1).reduce((a,b)=>a+b,0)*unit(),6);});   // shown = start + base cumulative (NOT multiplied)
  const f=g.lastCompletedFeature!;expect(f.baseBonusWinUnits*unit()).toBeCloseTo(baseTotal,6);
  expect(f.effectiveBonusWinUnits).toBe(f.baseBonusWinUnits*m);expect(g.balance).toBeCloseTo(start+baseTotal*m,6);   // revealed total == ledger credit (×m once)
  expect(g.ledger.paid).toBeCloseTo(baseTotal*m,6);expect(g.conserved).toBe(true);
  expect(trace[trace.length-1]!.real).toBeCloseTo(g.balance,6);
 });
 it('×5 with 30.00 base: finale shows 30.00 → 150.00 and the ledger agrees',()=>{
  const g=mk();const c=g.buyChestBonus();g.pickChest(c.multipliers.indexOf(5));g.closeChest();const unit=g.roundBet/20;
  const units=30*100/unit/1;const per=units/12;for(let i=0;i<12;i++){g.spin();g.last!.evaluation.totalUnits=per;g.settle();}
  const f=g.lastCompletedFeature!;expect(f.baseBonusWinUnits*unit).toBeCloseTo(3000,6);expect(f.effectiveBonusWinUnits*unit).toBeCloseTo(15000,6);expect(g.ledger.paid).toBeCloseTo(15000,6);
 });
 it('cap: the finale total is the effective (post-cap) amount, never the unpaid gross',()=>{
  const g=mk(),c=g.buyChestBonus();g.pickChest(c.multipliers.indexOf(5));g.closeChest();
  g.spin();g.last!.evaluation.totalUnits=30000;g.settle();   // 30,000 × 5 = 150,000 gross > 100,000 cap → feature ends at once
  const f=g.lastCompletedFeature!;expect(f.grossMultipliedBonusWinUnits).toBe(150000);expect(f.effectiveBonusWinUnits).toBeLessThan(f.grossMultipliedBonusWinUnits);
  expect(f.effectiveBonusWinUnits).toBe(100000);expect(g.capReached).toBe(true);expect(g.ledger.paid).toBe(100000*g.roundBet/20);
  expect(finaleLevel({baseCents:1,multiplier:5,totalCents:2,capped:g.capReached,spins:2})).toBe('max');
 });
 it('scatter feature: nothing is held back (no multiplier concept)',()=>{expect(hiddenBonusCents({effectiveBonusWinUnits:9,baseBonusWinUnits:9},100)).toBe(0);expect(shownSpinCents(null,100,777)).toBe(777);});
});
describe('finale presentation',()=>{
 it('×5 is a package celebration, not MAX WIN; MAX only when the engine capped',()=>{
  const d={baseCents:3000,multiplier:5,totalCents:15000,capped:false,spins:12};expect(finaleLevel(d)).toBe('x5');expect(finaleLevel({...d,multiplier:2})).toBe('x2');expect(finaleLevel({...d,multiplier:1})).toBe('x1');expect(finaleLevel({...d,capped:true})).toBe('max');});
 it('timeline order: base counts first, multiplier appears, then the transformation, then CONTINUA',()=>{const t=FINALE_T;expect(t.baseIn).toBeLessThan(t.mult);expect(t.baseIn+t.baseCount).toBeLessThanOrEqual(t.mult);expect(t.mult).toBeLessThan(t.transform);expect(t.transform+t.transformMs).toBeLessThanOrEqual(t.settle);});
});
describe('flow rules',()=>{
 it('free-spin auto start is a market flag for the already awarded spins only (demo on, UK off)',()=>{expect(MARKETS.demo!.featureAutoSpins).toBe(true);expect(MARKETS.uk!.featureAutoSpins).toBe(false);});
 it('no CONTINUA/START button in the chest selection scene; the real scene closes itself; video plays once per round through one coordinator',()=>{
  const ov=readFileSync('src/bonus/bonusOverlay.ts','utf8');expect(ov.includes('track(()=>api.close()')).toBe(true);expect(ov.includes('INIZIA')).toBe(false);
  const m=readFileSync('src/main.ts','utf8');expect((m.match(/async function bonusVideo\(/g)??[]).length).toBe(1);expect(m.includes('videoRound===game.roundNo')).toBe(true);
  expect((m.match(/await bonusVideo\(\)/g)??[]).length).toBe(2);   // after the chest scene, and before the scatter intro (Dual: skipped by the round flag)
 });
});
