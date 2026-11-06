import {describe,it,expect} from 'vitest';
import {SlotGame} from '../src/engine/game';
import {SeededRng} from '../src/math/v2/rng';
import {BUY_BONUS,MAX_WIN_UNITS} from '../src/math/v4/config';

const make=()=>new SlotGame(new SeededRng(0x5c011));
const chest=(g:SlotGame,m:1|2|5)=>{const c=g.buyChestBonus();expect(g.pickChest(c.multipliers.indexOf(m))).toMatchObject({multiplier:m});expect(g.closeChest()).toBe(true);};
const settleUnits=(g:SlotGame,units:number)=>{g.spin();g.last!.evaluation.totalUnits=units;return g.settle();};

describe('V4 Chest Bonus engine',()=>{
 it('commits one permutation of the three authentic packages and starts exactly 12 Chest FS after selection',()=>{
  const g=make(),c=g.buyChestBonus();
  expect([...c.multipliers].sort((a,b)=>a-b)).toEqual([1,2,5]);
  const pick=c.multipliers.indexOf(5);expect(g.pickChest(pick)).toMatchObject({multiplier:5,best:true});
  expect(g.closeChest()).toBe(true);expect(g.featureState).toMatchObject({type:'chest',status:'READY',spinsAwarded:12,spinsRemaining:12,multiplier:5,baseBonusWinUnits:0,grossMultipliedBonusWinUnits:0,effectiveBonusWinUnits:0,creditedBonusWinUnits:0});
  const events=g.drainEvents();expect(events.some(e=>e.type==='CHEST_BONUS_TRIGGERED')).toBe(true);expect(events.some(e=>e.type==='BEST_CHEST_PICK')).toBe(true);expect(events.some(e=>e.type==='CHEST_FREE_SPINS_STARTED')).toBe(true);
 });
 it('pays only reel outcomes during the chest feature and ends after its exact 12 spins',()=>{
  const g=make(),c=g.buyChestBonus();g.pickChest(c.multipliers.indexOf(2));g.closeChest();
  const before=g.ledger.paid;let played=0;while(g.phase==='free-spins'){g.spin();g.settle();played++;}
  expect(played).toBe(12);
  expect(g.phase).toBe('ready');expect(g.featureState).toBeNull();expect(g.ledger.paid).toBeGreaterThanOrEqual(before);
  const events=g.drainEvents();expect(events.filter(e=>e.type==='CHEST_FREE_SPINS_UPDATED')).toHaveLength(12);expect(events.some(e=>e.type==='CHEST_FREE_SPINS_COMPLETED')).toBe(true);
 });
 it('does not permit repeat picks and persists an unclosed selection without a monetary credit',()=>{
  const g=make(),c=g.buyChestBonus(),before=g.ledger.paid;expect(g.pickChest(0)).toBeTruthy();expect(g.pickChest(1)).toBeNull();
  const restored=make();restored.restore(g.snapshot());expect(restored.chest?.selectedMultiplier).toBe(c.multipliers[0]);expect(restored.ledger.paid).toBe(before);
 });
 it('uses an integral, atomic, calibrated Buy Bonus debit',()=>{
  const g=make(),before=g.balance,cost=g.buyPriceCents();expect(cost).toBe(g.bet*BUY_BONUS.priceX);g.buyChestBonus();expect(g.balance).toBe(before-cost);expect(g.ledger.wagered).toBe(cost);expect(g.roundKind).toBe('buy');
 });
 it('never pays above the round cap and emits MAX_WIN once when the cap is crossed',()=>{
  const g=make();g.buyChestBonus();const c=g.chest!;g.pickChest(0);g.closeChest();(g as any).roundWinUnits=MAX_WIN_UNITS-1;
  g.spin();g.last!.evaluation.totalUnits=1;
  g.settle();expect(g.roundWinUnits).toBeLessThanOrEqual(MAX_WIN_UNITS);expect(g.drainEvents().filter(e=>e.type==='MAX_WIN')).toHaveLength(1);
 });
 it.each([[1,3000],[2,6000],[5,15000]] as const)('reconciles a known €30 base bonus at ×%i as €%i exactly once',(m,expectedCents)=>{
  const g=make(),balance=g.balance;chest(g,m);const paid=settleUnits(g,600),f=g.featureState!;
  expect(paid).toBe(expectedCents);expect(f).toMatchObject({status:'ACTIVE',baseSpinWinUnits:600,baseBonusWinUnits:600,multiplier:m,grossMultipliedBonusWinUnits:600*m,effectiveBonusWinUnits:600*m,creditedBonusWinUnits:600*m,totalWinUnits:600*m});expect(g.balance).toBe(balance-g.buyPriceCents()+expectedCents);expect(g.ledger.paid).toBe(expectedCents);
  for(let i=1;i<12;i++)settleUnits(g,0);const done=g.lastCompletedFeature!;expect(done).toMatchObject({status:'COMPLETED',baseBonusWinUnits:600,grossMultipliedBonusWinUnits:600*m,effectiveBonusWinUnits:600*m,creditedBonusWinUnits:600*m});expect(g.ledger.paid).toBe(expectedCents);
 });
 it('restores an unsettled Chest win without duplicate credit or multiplier',()=>{
  const g=make();chest(g,2);g.spin();g.last!.evaluation.totalUnits=600;const saved=g.snapshot(),restored=make();restored.restore(saved);expect(restored.featureState).toMatchObject({status:'ACTIVE',spinsRemaining:12,baseBonusWinUnits:0,multiplier:2});expect(restored.settle()).toBe(6000);expect(()=>restored.settle()).toThrow();expect(restored.featureState).toMatchObject({baseBonusWinUnits:600,grossMultipliedBonusWinUnits:1200,creditedBonusWinUnits:1200});
 });
 it('reports the cap reduction separately from the gross Chest multiplier',()=>{
  const g=make();chest(g,2);(g as any).roundWinUnits=MAX_WIN_UNITS-1000;const before=g.balance;expect(settleUnits(g,600)).toBe(5000);const done=g.lastCompletedFeature!;expect(done).toMatchObject({baseBonusWinUnits:600,grossMultipliedBonusWinUnits:1200,effectiveBonusWinUnits:1000,creditedBonusWinUnits:1000,completed:true});expect(g.balance-before).toBe(5000);expect(g.capReached).toBe(true);
 });
});
