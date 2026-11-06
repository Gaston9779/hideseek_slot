/**
 * SKULL HUNT math model v2 — single source of truth for every number that affects a payout.
 * Pure data. No DOM, no Three.js, no animation. Changing ANY value here changes MATH_HASH and fails tests/math-version.test.ts
 * until MATH_VERSION, the fixture hash and 05-docs/MATH_CHANGELOG.md are updated together.
 *
 * Units: line wins are integers in "line-bet units" (1 unit = totalBet/20). Scatter & chest prizes are declared in multiples of the TOTAL bet
 * and converted to units (×20). Cents = units × (bet/20); every bet level is a multiple of 20 cents so there is never any rounding.
 */
export const MATH_VERSION='2.0.0';
export const SYMBOLS=['WILD','SCATTER','SKULL','BLASTER','GARGOYLE','MAUSOLEUM','CHEST','LANTERN','GHOST','TOMB','KEY','POTION'] as const;
export type SymbolId=typeof SYMBOLS[number];
export const REELS=5,ROWS=3,LINES=20,UNITS_PER_BET=LINES;
export const BETS=[20,40,100,200,500] as const;          // integer cents, all multiples of 20
export const START_BALANCE=100000;                         // demo virtual credits (cents)
export const paylines:readonly (readonly number[])[]=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]];
/** Line pays in line-bet units, index = symbols in a row from reel 1 (3,4,5). WILD substitutes for everything except SCATTER and has no pay of its own. */
export const LINE_PAYS:Record<string,readonly [number,number,number]>={
 SKULL:[60,240,1000],BLASTER:[40,160,600],GARGOYLE:[26,95,400],MAUSOLEUM:[20,75,300],CHEST:[14,48,200],LANTERN:[10,36,150],GHOST:[9,26,100],TOMB:[7,19,70],KEY:[5,14,50],POTION:[5,12,40]};
/** Scatter pays anywhere, multiples of TOTAL bet, for 3/4/5 scatters. Independent of lines and added to them. */
export const SCATTER_PAY_X:readonly [number,number,number]=[3,20,100];
export const WILD_REELS=[1,2,3] as const;                  // 0-based reels on which WILD exists (documented; enforced by strips)
export const FREE_SPINS={
 initial:{3:12,4:15,5:20} as Record<number,number>,        // spins awarded by scatter count in the BASE game
 retrigger:{3:5,4:8,5:10} as Record<number,number>,        // spins added by scatter count DURING free spins
 maxAwardedPerFeature:30,                                  // hard cap on total spins awarded in one feature (initial + retriggers)
 wildMultiplier:3,                                         // a winning line that contains ≥1 WILD pays ×3 in free spins (never in base)
};
export const MAX_WIN_X=5000;                               // per round: trigger spin + chest + free spins
export const MAX_WIN_UNITS=MAX_WIN_X*UNITS_PER_BET;
/** Hide & Seek chest bonus. Triggered by ≥4 scatters in the BASE game. A set of three prizes (×total bet) is drawn by weight at SPIN time, then the
 *  order is shuffled by the RNG; the player's pick selects one of the three already-committed values (pure reveal: every pick has equal EV). */
export const CHEST={triggerScatters:4,sets:[{w:40,p:[10,25,50]},{w:30,p:[20,40,80]},{w:18,p:[25,60,120]},{w:9,p:[50,100,225]},{w:3,p:[100,200,500]}] as {w:number,p:[number,number,number]}[]};
export const chestWeightTotal=()=>CHEST.sets.reduce((a,s)=>a+s.w,0);
