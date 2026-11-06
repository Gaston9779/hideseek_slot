import {FREE_SPINS,LINES,LINE_PAYS,SCATTER_PAY_X,UNITS_PER_BET,paylines,type SymbolId} from './config';
export type Grid=SymbolId[][];                    // grid[reel][row]
export type Mode='base'|'free';
export interface LineWin{line:number;symbol:SymbolId;count:number;units:number;wilds:number;amount:number}
export interface Evaluation{lineWins:LineWin[];scatterCount:number;scatterUnits:number;scatterAmount:number;lineUnits:number;totalUnits:number;totalMultiplier:number;capped:boolean}
/** Rules: wins are left→right from reel 1, min 3; WILD substitutes any symbol except SCATTER; the leading non-wild symbol defines the line;
 *  a line made only of WILD(s) followed by SCATTER or by nothing pays nothing; one win per line (the longest run); in free spins a winning line containing ≥1 WILD pays ×wildMultiplier.
 *  Scatter pays anywhere on the 15 cells, in addition to lines. Cap is applied by the engine (per round), not here. */
export function evaluate(grid:Grid,mode:Mode='base'):Evaluation{
 let scatterCount=0;for(const col of grid)for(const s of col)if(s==='SCATTER')scatterCount++;
 const lineWins:LineWin[]=[];let lineUnits=0;
 for(let l=0;l<LINES;l++){
  const line=paylines[l]!;const v:SymbolId[]=line.map((row,c)=>grid[c]![row]!);
  const lead=v.find(s=>s!=='WILD');if(lead===undefined||lead==='SCATTER')continue;
  let count=0,wilds=0;for(const s of v){if(s===lead||s==='WILD'){count++;if(s==='WILD')wilds++;}else break;}
  const pay=count>=3?LINE_PAYS[lead]![count-3]!:0;if(!pay)continue;
  const units=mode==='free'&&wilds>0?pay*FREE_SPINS.wildMultiplier:pay;lineUnits+=units;lineWins.push({line:l+1,symbol:lead,count,units,wilds,amount:units/UNITS_PER_BET});
 }
 const scatterUnits=scatterCount>=3?SCATTER_PAY_X[Math.min(scatterCount,5)-3]!*UNITS_PER_BET:0;
 const totalUnits=lineUnits+scatterUnits;
 return {lineWins,scatterCount,scatterUnits,scatterAmount:scatterUnits/UNITS_PER_BET,lineUnits,totalUnits,totalMultiplier:totalUnits/UNITS_PER_BET,capped:false};
}
