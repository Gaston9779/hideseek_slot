import {FREE_SPINS,LINES,LINE_PAYS,SCATTER_PAY_X,UNITS_PER_BET,paylines,type SymbolId} from './config';
export type Grid=SymbolId[][];export type Mode='base'|'free';
export interface LineWin{line:number;symbol:SymbolId;count:number;units:number;wilds:number;amount:number}
export interface Evaluation{lineWins:LineWin[];scatterCount:number;chestBonusCount:number;scatterUnits:number;scatterAmount:number;lineUnits:number;totalUnits:number;totalMultiplier:number;capped:boolean}
export function evaluate(grid:Grid,mode:Mode='base'):Evaluation{
 let scatterCount=0,chestBonusCount=0;for(const col of grid)for(const s of col){if(s==='SCATTER')scatterCount++;else if(s==='CHEST_BONUS')chestBonusCount++;}
 const lineWins:LineWin[]=[];let lineUnits=0;
 for(let l=0;l<LINES;l++){const v:SymbolId[]=paylines[l]!.map((row,c)=>grid[c]![row]!);const lead=v.find(s=>s!=='WILD');if(!lead||lead==='SCATTER'||lead==='CHEST_BONUS')continue;let count=0,wilds=0;for(const s of v){if(s===lead||s==='WILD'){count++;if(s==='WILD')wilds++;}else break;}const pay=count>=3?LINE_PAYS[lead]?.[count-3]??0:0;if(!pay)continue;const units=mode==='free'&&wilds?pay*FREE_SPINS.wildMultiplier:pay;lineUnits+=units;lineWins.push({line:l+1,symbol:lead,count,units,wilds,amount:units/UNITS_PER_BET});}
 const scatterUnits=scatterCount>=3?SCATTER_PAY_X[Math.min(scatterCount,5)-3]!*UNITS_PER_BET:0,totalUnits=lineUnits+scatterUnits;
 return {lineWins,scatterCount,chestBonusCount,scatterUnits,scatterAmount:scatterUnits/UNITS_PER_BET,lineUnits,totalUnits,totalMultiplier:totalUnits/UNITS_PER_BET,capped:false};
}
