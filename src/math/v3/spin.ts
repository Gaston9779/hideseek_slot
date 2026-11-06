import {CHEST_BONUS,FREE_SPINS,REELS,chestWeightTotal,type SymbolId} from './config';import {BASE_STRIPS,FS_STRIPS} from './strips';import {evaluate,type Evaluation,type Grid,type Mode} from './evaluate';import type {Rng} from '../v2/rng';
export interface ChestSet{prizes:[number,number,number]}
export interface Outcome{mode:Mode;stops:number[];grid:Grid;evaluation:Evaluation;chest:ChestSet|null}
export const stripsFor=(mode:Mode)=>mode==='free'?FS_STRIPS:BASE_STRIPS;
export function windowAt(strip:readonly SymbolId[],stop:number):SymbolId[]{const n=strip.length;return [-1,0,1].map(o=>strip[(stop+o+n)%n]!);}
export function drawChest(rng:Rng):ChestSet{let r=rng.int(chestWeightTotal()),set=CHEST_BONUS.sets[0]!;for(const s of CHEST_BONUS.sets){if(r<s.w){set=s;break;}r-=s.w;}const p=[...set.p] as [number,number,number];for(let i=2;i>0;i--){const j=rng.int(i+1);[p[i],p[j]]=[p[j]!,p[i]!];}return {prizes:p};}
export function generateOutcome(rng:Rng,mode:Mode='base'):Outcome{const strips=stripsFor(mode),stops=strips.map(s=>rng.int(s.length)),grid=strips.map((s,i)=>windowAt(s,stops[i]!)),evaluation=evaluate(grid,mode);const chest=mode==='base'&&evaluation.chestBonusCount>=CHEST_BONUS.triggerCount?drawChest(rng):null;return {mode,stops,grid,evaluation,chest};}
export const freeSpinsInitial=(n:number)=>n>=3?FREE_SPINS.initial[Math.min(n,5)]!:0;
export const freeSpinsRetrigger=(n:number)=>n>=3?FREE_SPINS.retrigger[Math.min(n,5)]!:0;
