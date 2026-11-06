/** Exhaustive enumeration of every stop combination (Π reel lengths) with the PRODUCTION evaluate(). Output: exact integer sums + win histogram. */
import {writeFileSync} from 'node:fs';
import {BASE_STRIPS,FS_STRIPS} from '../../src/math/v2/strips';
import {windowAt} from '../../src/math/v2/spin';
import {evaluate} from '../../src/math/v2/evaluate';
import {refEvaluate} from './ref';
import type {SymbolId} from '../../src/math/v2/config';
function run(mode:'base'|'free'){
 const strips=mode==='base'?BASE_STRIPS:FS_STRIPS;const W=strips.map(s=>s.map((_,i)=>windowAt(s,i)));
 const hist=new Map<number,number>();const scat=Array(16).fill(0);let sumUnits=0n,sumLine=0n,sumScat=0n,sumSq=0n,n=0,hits=0,maxU=0,refMismatch=0;
 const grid:SymbolId[][]=[W[0]![0]!,W[1]![0]!,W[2]![0]!,W[3]![0]!,W[4]![0]!];
 for(let a=0;a<W[0]!.length;a++){grid[0]=W[0]![a]!;for(let b=0;b<W[1]!.length;b++){grid[1]=W[1]![b]!;for(let c=0;c<W[2]!.length;c++){grid[2]=W[2]![c]!;for(let d=0;d<W[3]!.length;d++){grid[3]=W[3]![d]!;for(let e=0;e<W[4]!.length;e++){grid[4]=W[4]![e]!;
  const ev=evaluate(grid,mode);const u=ev.totalUnits;n++;sumUnits+=BigInt(u);sumLine+=BigInt(ev.lineUnits);sumScat+=BigInt(ev.scatterUnits);sumSq+=BigInt(u)*BigInt(u);if(u>0)hits++;if(u>maxU)maxU=u;scat[ev.scatterCount]++;hist.set(u,(hist.get(u)??0)+1);
  if((n&1023)===0){const r=refEvaluate(grid,mode);if(r.totalUnits!==u)refMismatch++;}
 }}}}}
 return {mode,combinations:n,sumUnits:sumUnits.toString(),sumLineUnits:sumLine.toString(),sumScatterUnits:sumScat.toString(),sumSquares:sumSq.toString(),hits,maxUnits:maxU,scatterCounts:scat.slice(0,8),refSampleMismatches:refMismatch,hist:[...hist.entries()].sort((x,y)=>x[0]-y[0])};
}
const t0=Date.now();const out={base:run('base'),free:run('free'),seconds:0};out.seconds=(Date.now()-t0)/1000;
writeFileSync('05-docs/data/enumeration.json',JSON.stringify(out));console.log('done',out.seconds,'s',out.base.combinations,out.free.combinations);
