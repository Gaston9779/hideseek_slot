/** V4 audited math configuration. Payouts are line-bet units unless noted. */
export const MATH_VERSION='4.0.0';
export const SYMBOLS=['WILD','SCATTER','CHEST_BONUS','MAGIC_BOOK','SKULL','BLASTER','GARGOYLE','CHEST','LANTERN','GHOST','TOMB','KEY','POTION'] as const;
export type SymbolId=typeof SYMBOLS[number];
export const REELS=5,ROWS=3,LINES=20,UNITS_PER_BET=LINES;
export const BETS=[20,40,100,200,500] as const,START_BALANCE=100000;
export const paylines:readonly (readonly number[])[]=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]];
/** MAGIC_BOOK is unambiguously the highest ordinary symbol. */
export const LINE_PAYS:Record<string,readonly [number,number,number]>={
 MAGIC_BOOK:[64,254,1035],SKULL:[46,180,729],BLASTER:[31,118,440],GARGOYLE:[20,73,292],CHEST:[11,37,150],LANTERN:[8,27,106],GHOST:[7,19,74],TOMB:[5,14,53],KEY:[3,10,38],POTION:[3,9,30]};
export const SCATTER_PAY_X:readonly [number,number,number]=[3,20,100];
export const SCATTER_FREE_SPINS={initial:{3:12,4:15,5:20} as Record<number,number>,retrigger:{3:5,4:8,5:10} as Record<number,number>,maxAwardedPerFeature:30,wildMultiplier:3};
/** All three prizes exist once, shuffled uniformly before the player picks. */
export const CHEST_PACKAGES=[
 {spins:12,multiplier:1 as const},
 {spins:12,multiplier:2 as const},
 {spins:12,multiplier:5 as const},
] as const;
export type ChestMultiplier=typeof CHEST_PACKAGES[number]['multiplier'];
/** Buy price is calibrated from the exact Chest feature EV; cents are always integral because it is a whole-bet multiplier. */
/** 128.60× is representable in whole cents for every supported 0.20× bet step. */
export const BUY_BONUS={enabled:true,priceX:128.6,targetRtp:.96};
export const MAX_WIN_X=5000,MAX_WIN_UNITS=MAX_WIN_X*UNITS_PER_BET;
export const WILD_REELS=[1,2,3] as const;
