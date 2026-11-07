import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {SlotGame} from '../src/engine/game';import {SeededRng} from '../src/math/v2/rng';

const SCATTER_INITIAL_FREE_SPINS=12, CHEST_INITIAL_FREE_SPINS=12;
const game=()=>new SlotGame(new SeededRng(117));
function triggerScatter(g:SlotGame,dual=false){g.spin();const o=g.last!;o.evaluation.scatterCount=3;o.evaluation.chestBonusCount=dual?3:0;o.evaluation.totalUnits=0;o.chest=dual?{multipliers:[1,2,5]}:null;g.settle();}

describe('approved Free Spins quantities (independent literals)',()=>{
 it('natural Scatter trigger awards exactly 12 and consumes exactly 12 without extensions',()=>{const g=game();triggerScatter(g);expect(g.featureState!.spinsAwarded).toBe(SCATTER_INITIAL_FREE_SPINS);let played=0;while(g.phase==='free-spins'){g.spin();g.last!.evaluation.scatterCount=0;g.last!.evaluation.chestBonusCount=0;g.last!.evaluation.totalUnits=0;g.settle();played++;}expect(played).toBe(SCATTER_INITIAL_FREE_SPINS);expect(g.lastCompletedFeature!.spinsRemaining).toBe(0);});
 it('Chest starts exactly 12',()=>{const g=game(),c=g.buyChestBonus();g.pickChest(0);g.closeChest();expect(g.featureState!.spinsAwarded).toBe(CHEST_INITIAL_FREE_SPINS);});
 it('dual keeps Chest at 12 and queued Scatter at 12',()=>{const g=game();triggerScatter(g,true);const c=g.chest!;g.pickChest(c.multipliers.indexOf(1));g.closeChest();for(let i=0;i<CHEST_INITIAL_FREE_SPINS;i++){g.spin();g.last!.evaluation.scatterCount=0;g.last!.evaluation.chestBonusCount=0;g.last!.evaluation.totalUnits=0;g.settle();}expect(g.featureState).toMatchObject({type:'scatter',spinsAwarded:SCATTER_INITIAL_FREE_SPINS});});
 it('Scatter retrigger is separately counted (+5 for three)',()=>{const g=game();triggerScatter(g);g.spin();g.last!.evaluation.scatterCount=3;g.last!.evaluation.chestBonusCount=0;g.last!.evaluation.totalUnits=0;g.settle();expect(g.featureState).toMatchObject({spinsAwarded:17,retriggerAwarded:5,spinsRemaining:16});});
 it('DEV test path derives its initial counter from the production engine feature',()=>{const main=readFileSync('src/main.ts','utf8');expect(main).toContain('devTest.initial=feature.spinsAwarded');expect(main).toContain('await view.freeSpinsIntro(feature.spinsAwarded,false)');});
});
