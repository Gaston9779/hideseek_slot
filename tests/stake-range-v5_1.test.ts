import {describe,expect,it} from 'vitest';
import {SlotGame} from '../src/engine/game';
import {BETS,BUY_BONUS,MAX_BET_CENTS,MAX_WIN_UNITS,UNITS_PER_BET} from '../src/math/v4/config';
import {SeededRng} from '../src/math/v2/rng';

describe('V5.1 extended stake range',()=>{
 it('exposes the approved cent-integral market range through €50',()=>{
  expect(BETS).toEqual([20,40,100,200,500,1000,2000,5000]);expect(MAX_BET_CENTS).toBe(5000);
  for(const bet of BETS){expect(bet%UNITS_PER_BET).toBe(0);expect(Number.isInteger(bet*BUY_BONUS.priceX)).toBe(true);expect(Number.isInteger(MAX_WIN_UNITS*bet/UNITS_PER_BET)).toBe(true);}
 });
 it.each(BETS.map((bet,index)=>[bet,index] as const))('keeps buy debit, unit credit, cap and ledger integral at %ip', (bet,index)=>{
  const g=new SlotGame(new SeededRng(100+index),10_000_000);g.betIndex=index;expect(g.bet).toBe(bet);expect(g.unitCents).toBe(bet/20);expect(g.buyPriceCents()).toBe(bet*134);
  const before=g.balance;g.buyChestBonus();expect(g.balance).toBe(before-bet*134);const c=g.chest!,pick=c.multipliers.indexOf(5);g.pickChest(pick);g.closeChest();g.spin();g.last!.evaluation.totalUnits=600;const paid=g.settle();expect(paid).toBe(600*5*bet/20);expect(Number.isInteger(paid)).toBe(true);expect(g.conserved).toBe(true);
  (g as any).roundWinUnits=MAX_WIN_UNITS-1;g.spin();g.last!.evaluation.totalUnits=1;g.settle();expect(g.roundWinUnits).toBe(MAX_WIN_UNITS);expect(g.conserved).toBe(true);
 });
});
