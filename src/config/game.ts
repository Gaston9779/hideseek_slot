export const SYMBOLS = ['WILD','SCATTER','SKULL','BLASTER','GARGOYLE','MAUSOLEUM','CHEST','LANTERN','GHOST','TOMB','KEY','POTION'] as const;
export type SymbolId = typeof SYMBOLS[number];
export const paytable: Record<SymbolId, number[]> = { WILD:[0,0,0,20,100], SCATTER:[0,0,2,10,50], SKULL:[0,0,0,12,50], BLASTER:[0,0,0,10,35], GARGOYLE:[0,0,0,8,25], MAUSOLEUM:[0,0,0,7,20], CHEST:[0,0,0,6,16], LANTERN:[0,0,0,5,12], GHOST:[0,0,0,4,10], TOMB:[0,0,0,3,8], KEY:[0,0,0,2,6], POTION:[0,0,0,2,5] };
export const paylines = [[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]] as const;
export const reelStrips: SymbolId[][] = Array.from({length:5}, (_,r) => { const weights: [SymbolId,number][] = [['POTION',16],['KEY',15],['TOMB',14],['GHOST',13],['LANTERN',12],['CHEST',10],['MAUSOLEUM',8],['GARGOYLE',7],['BLASTER',6],['SKULL',5],['WILD',3],['SCATTER',2]]; return weights.flatMap(([s,n])=>Array(n).fill(s)).sort((a,b)=>((a.charCodeAt(0)+r*7)%17)-((b.charCodeAt(0)+r*7)%17)); });
export const BETS = [20,50,100,200,500] as const; // integer cents
export const MAX_WIN_MULTIPLIER = 5000;
