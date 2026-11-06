import {describe,expect,it} from 'vitest';
import {SlotGame} from '../src/engine/game';import {SeededRng} from '../src/math/v2/rng';
import {FEATURE_RULES} from '../src/math/v4/config';

const mk=()=>new SlotGame(new SeededRng(0x5c011));
const startChest=(m:1|2|5)=>{const g=mk(),c=g.buyChestBonus();g.pickChest(c.multipliers.indexOf(m));g.closeChest();return g;};
/** one feature spin with injected special counts and a fixed base win (units) */
function spin(g:SlotGame,o:{sc?:number;cb?:number;base?:number;packs?:[1|2|5,1|2|5,1|2|5]}={}){g.spin();const l=g.last!;l.evaluation.scatterCount=o.sc??0;l.evaluation.chestBonusCount=o.cb??0;l.evaluation.totalUnits=o.base??0;if(o.packs)l.chest={multipliers:o.packs};return g.settle();}
const startScatter=(g=mk())=>{g.spin();const l=g.last!;l.evaluation.scatterCount=3;l.evaluation.chestBonusCount=0;l.evaluation.totalUnits=0;l.chest=null;g.settle();g.drainEvents();expect(g.phase).toBe('free-spins');return g;};

describe('Chest feature (any multiplier): in-feature extensions',()=>{
 for(const m of [1,2,5] as const)it(`×${m}: 3 Scatter → +6 spins, same multiplier, counted and paid by the normal mechanics`,()=>{
  const g=startChest(m);spin(g,{sc:3,base:100});const f=g.featureState!;
  expect(f.spinsRemaining).toBe(11+6);expect(f.spinsAwarded).toBe(18);expect(f.multiplier).toBe(m);expect(f.baseBonusWinUnits).toBe(100);expect(f.effectiveBonusWinUnits).toBe(100*m);
  expect(g.drainEvents().some(e=>e.type==='FEATURE_EXTENDED'&&e.addedSpins===6&&e.source==='SCATTER')).toBe(true);});
 it('3 Chest Bonus inside the Chest feature → +12 spins (no pick); both at once → +18',()=>{
  let g=startChest(2);spin(g,{cb:3});expect(g.featureState!.spinsRemaining).toBe(11+12);expect(g.phase).toBe('free-spins');expect(g.chest).toBeNull();
  g=startChest(5);spin(g,{sc:3,cb:3});expect(g.featureState!.spinsRemaining).toBe(11+18);});
 it('REGRESSION: three Scatter on the LAST chest spin do not end the feature — six more spins follow (the reported lost bonus)',()=>{
  const g=startChest(5);for(let i=0;i<11;i++)spin(g,{});expect(g.featureState!.spinsRemaining).toBe(1);
  spin(g,{sc:3});expect(g.phase).toBe('free-spins');expect(g.featureState!.spinsRemaining).toBe(6);expect(g.lastCompletedFeature).toBeNull();
  for(let i=0;i<6;i++)spin(g,{});expect(g.phase).toBe('ready');expect(g.lastCompletedFeature!.spinsPlayed).toBe(18);expect(g.lastCompletedFeature!.multiplier).toBe(5);expect(g.conserved).toBe(true);});
 it('total awarded spins are capped',()=>{const g=startChest(1);let guard=0;while(g.phase==='free-spins'&&guard++<200)spin(g,{sc:3,cb:3});expect(g.lastCompletedFeature!.spinsAwarded).toBeLessThanOrEqual(FEATURE_RULES.chest.maxAwardedSpins);expect(g.lastCompletedFeature!.spinsPlayed).toBe(g.lastCompletedFeature!.spinsAwarded);});
 it('multiplier is applied exactly once per spin, also on extension spins; ledger exact',()=>{
  const g=startChest(5);spin(g,{sc:3,base:10});for(let i=0;i<17;i++)spin(g,{base:10});const f=g.lastCompletedFeature!;
  expect(f.baseBonusWinUnits).toBe(180);expect(f.effectiveBonusWinUnits).toBe(900);expect(g.ledger.paid).toBe(900*g.roundBet/20);});
});
describe('Scatter feature: 3 Chest Bonus → pick a chest, +12 spins with the picked multiplier',()=>{
 it('pick pending keeps the feature alive even on the last spin; spins are appended after the running ones',()=>{
  const g=startScatter();const left=g.featureState!.spinsRemaining;for(let i=0;i<left-1;i++)spin(g,{base:10});
  spin(g,{cb:3,packs:[1,2,5],base:10});expect(g.phase).toBe('chest');expect(g.lastCompletedFeature).toBeNull();expect(g.chest!.inFeature).toBe(true);
  g.pickChest(2);expect(g.closeChest()).toBe(true);expect(g.phase).toBe('free-spins');const f=g.featureState!;expect(f.spinsRemaining).toBe(12);expect(f.multiplier).toBe(5);
  for(let i=0;i<12;i++)spin(g,{base:10});const done=g.lastCompletedFeature!;expect(done.spinsPlayed).toBe(left+12);expect(g.phase).toBe('ready');
  expect(done.baseBonusWinUnits).toBe((left+12)*10);expect(done.effectiveBonusWinUnits).toBe(left*10+12*10*5);expect(g.conserved).toBe(true);});
 it('remaining spins keep ×1 first, the appended 12 run at the picked multiplier (×2)',()=>{
  const g=startScatter();const left=g.featureState!.spinsRemaining;spin(g,{cb:3,packs:[1,2,5],base:0});g.pickChest(1);g.closeChest();
  const paid:number[]=[];const total=left-1+12;for(let i=0;i<total;i++){const before=g.ledger.paid;spin(g,{base:10});paid.push((g.ledger.paid-before)/(g.roundBet/20));}
  expect(paid.slice(0,left-1).every(x=>x===10)).toBe(true);expect(paid.slice(left-1).every(x=>x===20)).toBe(true);});
 it('a ×1 pick still adds 12 spins; at most 3 picks per feature',()=>{
  const g=startScatter();for(let k=0;k<4;k++){spin(g,{cb:3,packs:[1,2,5]});if(g.phase==='chest'){g.pickChest(0);g.closeChest();}else break;}
  expect(g.featureState!.chestPicks).toBe(FEATURE_RULES.scatter.maxChestPicks);});
 it('Scatter retrigger inside the Scatter feature is unchanged (5 for three)',()=>{const g=startScatter();const before=g.featureState!.spinsRemaining;spin(g,{sc:3});expect(g.featureState!.spinsRemaining).toBe(before-1+5);});
 it('snapshot/restore keeps queued segments and the pending in-feature pick',()=>{
  const g=startScatter();spin(g,{cb:3,packs:[1,2,5]});const s=g.snapshot();const r=mk();r.restore(s);expect(r.phase).toBe('chest');expect(r.chest!.inFeature).toBe(true);r.pickChest(1);r.closeChest();expect(r.featureState!.queued.length+((r.featureState!.multiplier>1)?1:0)).toBeGreaterThan(0);});
});
