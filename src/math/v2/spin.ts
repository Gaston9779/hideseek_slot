import {CHEST,FREE_SPINS,REELS,chestWeightTotal,type SymbolId} from './config';
import {BASE_STRIPS,FS_STRIPS} from './strips';
import {evaluate,type Evaluation,type Grid,type Mode} from './evaluate';
import type {Rng} from './rng';
export interface ChestSet{prizes:[number,number,number]}   // ×total bet, order already shuffled; committed at spin time
export interface Outcome{mode:Mode;stops:number[];grid:Grid;evaluation:Evaluation;chest:ChestSet|null}
export const stripsFor=(mode:Mode)=>mode==='free'?FS_STRIPS:BASE_STRIPS;
export function windowAt(strip:readonly SymbolId[],stop:number):SymbolId[]{const n=strip.length;return [-1,0,1].map(o=>strip[(stop+o+n)%n]!);}
/** Draws the chest prize set + shuffle. Uses the RNG only here, only for base spins with ≥4 scatters. */
export function drawChest(rng:Rng):ChestSet{
 let r=rng.int(chestWeightTotal());let set=CHEST.sets[0]!;for(const s of CHEST.sets){if(r<s.w){set=s;break;}r-=s.w;}
 const p=[...set.p] as [number,number,number];for(let i=2;i>0;i--){const j=rng.int(i+1);[p[i],p[j]]=[p[j]!,p[i]!];}
 return {prizes:p};
}
/** One spin. Independent uniform stop per reel, nothing else influences the result (no history, balance, bet, or timing). */
export function generateOutcome(rng:Rng,mode:Mode='base'):Outcome{
 const strips=stripsFor(mode);const stops:number[]=[];for(let r=0;r<REELS;r++)stops.push(rng.int(strips[r]!.length));
 const grid=strips.map((s,i)=>windowAt(s,stops[i]!));const evaluation=evaluate(grid,mode);
 const chest=mode==='base'&&evaluation.scatterCount>=CHEST.triggerScatters?drawChest(rng):null;
 return {mode,stops,grid,evaluation,chest};
}
export const freeSpinsInitial=(scatters:number)=>scatters>=3?FREE_SPINS.initial[Math.min(scatters,5)]!:0;
export const freeSpinsRetrigger=(scatters:number)=>scatters>=3?FREE_SPINS.retrigger[Math.min(scatters,5)]!:0;
