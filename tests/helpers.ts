import {SlotGame} from '../src/engine/game';import {SeededRng,type Rng} from '../src/math/v2/rng';
import {generateOutcome,type Outcome} from '../src/math/v3/spin';
import type {Mode} from '../src/math/v3/evaluate';
/** Finds a seed whose NEXT outcome satisfies pred (deterministic search; used to reach rare states in tests without touching the math). */
export function seedFor(pred:(o:Outcome)=>boolean,mode:Mode='base',from=1,max=3_000_000):number{for(let s=from;s<from+max;s++){if(pred(generateOutcome(new SeededRng(s),mode)))return s;}throw new Error('no seed');}
export const game=(seed:number,balance=100000)=>new SlotGame(new SeededRng(seed),balance);
export type {Rng};
