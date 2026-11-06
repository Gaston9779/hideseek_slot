import {CHEST_PACKAGES,SCATTER_FREE_SPINS,type ChestMultiplier,type SymbolId} from './config';import {BASE_STRIPS,FS_STRIPS} from './strips';import {evaluate,type Evaluation,type Grid,type Mode} from './evaluate';import type {Rng} from '../v2/rng';
export type SpinMode='base'|'scatter-feature'|'chest-feature';export interface ChestPackages{multipliers:[ChestMultiplier,ChestMultiplier,ChestMultiplier]}
/** `mode` stays base/free for renderer compatibility; featureType carries the V4 distinction. */
export interface Outcome{mode:'base'|'free';featureType:'scatter'|'chest'|null;stops:number[];grid:Grid;evaluation:Evaluation;chest:ChestPackages|null;featureMultiplier:number}
export const stripsFor=(mode:SpinMode)=>mode==='base'?BASE_STRIPS:FS_STRIPS;
export const windowAt=(strip:readonly SymbolId[],stop:number)=>[-1,0,1].map(o=>strip[(stop+o+strip.length)%strip.length]!);
/** Fisher–Yates makes every one of the six package permutations exactly 1/6. */
export function drawChestPackages(rng:Rng):ChestPackages{const p=CHEST_PACKAGES.map(x=>x.multiplier) as ChestMultiplier[];for(let i=2;i>0;i--){const j=rng.int(i+1);[p[i],p[j]]=[p[j]!,p[i]!];}return {multipliers:p as ChestPackages['multipliers']};}
export function generateOutcome(rng:Rng,mode:SpinMode='base',chestMultiplier=1):Outcome{const strips=stripsFor(mode),stops=strips.map(s=>rng.int(s.length)),grid=strips.map((s,i)=>windowAt(s,stops[i]!)),evaluation=evaluate(grid,mode==='base'?'base':'feature'),chest=mode==='base'&&evaluation.chestBonusCount>=3?drawChestPackages(rng):null;return {mode:mode==='base'?'base':'free',featureType:mode==='chest-feature'?'chest':mode==='scatter-feature'?'scatter':null,stops,grid,evaluation,chest,featureMultiplier:chestMultiplier};}
export const scatterInitial=(n:number)=>n>=3?SCATTER_FREE_SPINS.initial[Math.min(n,5)]!:0;
export const scatterRetrigger=(n:number)=>n>=3?SCATTER_FREE_SPINS.retrigger[Math.min(n,5)]!:0;
