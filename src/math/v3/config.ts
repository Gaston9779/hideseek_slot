/** Skull Hunt math model V3. Pure payout data; no DOM, rendering, timing, balance or history. */
export const MATH_VERSION='3.0.0';
export const SYMBOLS=['WILD','SCATTER','CHEST_BONUS','SKULL','BLASTER','GARGOYLE','MAUSOLEUM','CHEST','LANTERN','GHOST','TOMB','KEY','POTION'] as const;
export type SymbolId=typeof SYMBOLS[number];
export const REELS=5,ROWS=3,LINES=20,UNITS_PER_BET=LINES;
export const BETS=[20,40,100,200,500] as const;
export const START_BALANCE=100000;
export const paylines:readonly (readonly number[])[]=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]];
/** Line-bet units. CHEST_BONUS, SCATTER and WILD have no line pay. */
export const LINE_PAYS:Record<string,readonly [number,number,number]>={
 SKULL:[60,240,1000],BLASTER:[40,160,600],GARGOYLE:[26,95,400],MAUSOLEUM:[20,75,300],CHEST:[14,48,200],LANTERN:[10,36,150],GHOST:[9,26,100],TOMB:[7,19,70],KEY:[5,14,50],POTION:[5,12,40]};
export const SCATTER_PAY_X:readonly [number,number,number]=[3,20,100];
export const FREE_SPINS={initial:{3:12,4:15,5:20} as Record<number,number>,retrigger:{3:5,4:8,5:10} as Record<number,number>,maxAwardedPerFeature:30,wildMultiplier:3};
export const CHEST_BONUS={
 triggerCount:3,
 /** Weight denominator 10,000. Values are multiples of total bet. Exactly one committed value is credited. */
 sets:[
  {w:7260,p:[10,24,40] as [number,number,number]},
  {w:2000,p:[30,60,120] as [number,number,number]},
  {w:400,p:[100,250,500] as [number,number,number]},
  {w:340,p:[100,500,5000] as [number,number,number]},
 ]
};
export const chestWeightTotal=()=>CHEST_BONUS.sets.reduce((a,s)=>a+s.w,0);
export const MAX_WIN_X=5000,MAX_WIN_UNITS=MAX_WIN_X*UNITS_PER_BET;
export const WILD_REELS=[1,2,3] as const;
