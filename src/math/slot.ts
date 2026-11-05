import { reelStrips, type SymbolId } from '../config/game'; import type { Rng } from './rng'; import { evaluate, type Grid, type Evaluation } from './evaluate';
export interface Outcome { stops:number[]; grid:Grid; evaluation:Evaluation; }
export function generateOutcome(rng:Rng, freeSpins=false): Outcome { const stops=reelStrips.map(s=>Math.floor(rng.next()*s.length)); const grid=reelStrips.map((strip,i)=>[-1,0,1].map(offset=>strip[(stops[i]+offset+strip.length)%strip.length]!)); return {stops,grid,evaluation:evaluate(grid,freeSpins)}; }
