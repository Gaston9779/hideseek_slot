/** INDEPENDENT reference evaluator (different algorithm from src/math/v2/evaluate.ts): per candidate symbol, regex run-length on an encoded line string. */
import {FREE_SPINS,LINE_PAYS,SCATTER_PAY_X,paylines,type SymbolId} from '../../src/math/v2/config';
export function refLine(syms:readonly SymbolId[],mode:'base'|'free'):number{
 let best=0;
 for(const c of Object.keys(LINE_PAYS)){
  const enc=syms.map(s=>s===c?'c':s==='WILD'?'w':'x').join('');
  const m=/^[cw]+/.exec(enc);if(!m)continue;const run=m[0];if(!run.includes('c')||run.length<3)continue;
  const base=LINE_PAYS[c]![run.length-3]!;const pay=mode==='free'&&run.includes('w')?base*FREE_SPINS.wildMultiplier:base;
  if(pay>best)best=pay;
 }
 return best;
}
export function refEvaluate(grid:SymbolId[][],mode:'base'|'free'){
 let lines=0;for(const l of paylines)lines+=refLine(l.map((r,c)=>grid[c]![r]!),mode);
 const sc=grid.flat().filter(s=>s==='SCATTER').length;const scU=sc>=3?SCATTER_PAY_X[Math.min(sc,5)-3]!*20:0;
 return {lineUnits:lines,scatterCount:sc,scatterUnits:scU,totalUnits:lines+scU};
}
