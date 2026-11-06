/** Reproducible Monte Carlo through the production V3 SlotGame engine.
 * Usage: node --import tsx tools/math/v3/simulate.ts <paid-rounds> <seed> [workers]
 * A paid round includes its complete Chest Bonus and Free Spins sequence.
 */
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {mkdirSync,writeFileSync} from 'node:fs';import {cpus} from 'node:os';
import {SlotGame} from '../../../src/engine/game';import {SeededRng} from '../../../src/math/v2/rng';
const BET=100, THRESHOLDS=[1,10,20,50,100,250,500,1000,2000,5000] as const;
interface Acc{rounds:number;sumX:number;sumSqX:number;baseX:number;freeX:number;chestX:number;baseHits:number;fsTriggers:number;chestTriggers:number;simultaneousTriggers:number;fsSpins:number;capHits:number;selected5000:number;maxX:number;allSpins:number;chestPrizeX:number;conservationFailures:number;tail:number[];hist:number[]}
function blank():Acc{return {rounds:0,sumX:0,sumSqX:0,baseX:0,freeX:0,chestX:0,baseHits:0,fsTriggers:0,chestTriggers:0,simultaneousTriggers:0,fsSpins:0,capHits:0,selected5000:0,maxX:0,allSpins:0,chestPrizeX:0,conservationFailures:0,tail:THRESHOLDS.map(()=>0),hist:Array(100001).fill(0)};}
function runChunk(rounds:number,seed:number):Acc{
 const g=new SlotGame(new SeededRng(seed),Math.floor(Number.MAX_SAFE_INTEGER/4));g.betIndex=2;const a=blank();
 for(let r=0;r<rounds;r++){
  const paid0=g.ledger.paid;let baseWin=0,freeWin=0,chestWin=0;
  do{
   const o=g.spin(),w=g.settle();a.allSpins++;
   if(o.mode==='base'){baseWin+=w;if(w>0)a.baseHits++;const fs=o.evaluation.scatterCount>=3,ch=!!o.chest;if(fs)a.fsTriggers++;if(ch)a.chestTriggers++;if(fs&&ch)a.simultaneousTriggers++;}
   else{freeWin+=w;a.fsSpins++;}
   if(g.phase==='chest'){
    // The committed prizes are uniformly shuffled, so a balanced fixed-position policy is unbiased and consumes no outcome RNG.
    const pk=g.pickChest(r%3)!;chestWin+=pk.credited;a.chestPrizeX+=pk.prize;if(pk.prize===5000)a.selected5000++;g.closeChest();
   }
  }while(g.phase==='free-spins');
  g.drainEvents();const x=(g.ledger.paid-paid0)/BET;a.rounds++;a.sumX+=x;a.sumSqX+=x*x;a.baseX+=baseWin/BET;a.freeX+=freeWin/BET;a.chestX+=chestWin/BET;a.maxX=Math.max(a.maxX,x);a.hist[Math.round(x*20)]!++;if(g.capReached)a.capHits++;THRESHOLDS.forEach((t,i)=>{if(x>=t)a.tail[i]!++;});if(!g.conserved)a.conservationFailures++;
 }
 return a;
}
function merge(xs:Acc[]){const a=blank();for(const x of xs){for(const k of Object.keys(a) as (keyof Acc)[]){if(k==='tail'||k==='hist')continue;if(k==='maxX'){a.maxX=Math.max(a.maxX,x.maxX);continue;}(a as any)[k]+=(x as any)[k];}x.tail.forEach((v,i)=>a.tail[i]!+=v);x.hist.forEach((v,i)=>a.hist[i]!+=v);}return a;}
if(isMainThread){
 const N=Number(process.argv[2]??1_000_000),seed=Number(process.argv[3]??20261116),W=Number(process.argv[4]??Math.max(1,Math.min(8,cpus().length-1))),t0=Date.now(),per=Math.floor(N/W);
 const parts=await Promise.all(Array.from({length:W},(_,k)=>new Promise<Acc>((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{rounds:per+(k===0?N-per*W:0),seed:seed+k*1_000_003},execArgv:process.execArgv});w.on('message',resolve);w.on('error',reject);})));
 const a=merge(parts),mean=a.sumX/N,variance=Math.max(0,a.sumSqX/N-mean*mean),sd=Math.sqrt(variance),se=sd/Math.sqrt(N);
 const quantile=(q:number)=>{let c=0,target=Math.ceil(q*N);for(let i=0;i<a.hist.length;i++){c+=a.hist[i]!;if(c>=target)return i/20;}return 5000;};
 const below=a.hist.slice(0,20).reduce((s,n)=>s+n,0),equal=a.hist[20]!,above=N-below-equal;
 const report={schema:'skull-hunt-math-v3-simulation-1',mathVersion:'3.0.0',engine:'src/engine/game.ts',basePaidRounds:N,seed,workers:W,seconds:(Date.now()-t0)/1000,rtp:mean,rtpPercent:mean*100,rtpCI95:[mean-1.96*se,mean+1.96*se],rtpCI99_9:[mean-3.290526731*se,mean+3.290526731*se],variancePerRound:variance,standardError:se,standardDeviationPerRound:sd,components:{base:a.baseX/N,freeSpins:a.freeX/N,chestBonus:a.chestX/N},baseHitFrequency:a.baseHits/N,roundReturnVsBet:{below:{count:below,probability:below/N},equal:{count:equal,probability:equal/N},above:{count:above,probability:above/N}},triggers:{freeSpins:{count:a.fsTriggers,probability:a.fsTriggers/N,oneIn:a.fsTriggers?N/a.fsTriggers:null},chestBonus:{count:a.chestTriggers,probability:a.chestTriggers/N,oneIn:a.chestTriggers?N/a.chestTriggers:null},simultaneous:{count:a.simultaneousTriggers,probability:a.simultaneousTriggers/N,oneIn:a.simultaneousTriggers?N/a.simultaneousTriggers:null}},averageFreeSpinsPerTrigger:a.fsTriggers?a.fsSpins/a.fsTriggers:null,averageFreeSpinsWinX:a.fsTriggers?a.freeX/a.fsTriggers:null,averageSelectedChestPrizeX:a.chestTriggers?a.chestPrizeX/a.chestTriggers:null,averageCreditedChestWinX:a.chestTriggers?a.chestX/a.chestTriggers:null,totalPhysicalSpins:a.allSpins,selected5000Count:a.selected5000,capHitCount:a.capHits,maxRoundWinX:a.maxX,percentilesX:Object.fromEntries([.5,.75,.9,.95,.99,.999,.9999].map(q=>[`${q*100}%`,quantile(q)])),roundTailProbability:Object.fromEntries(THRESHOLDS.map((t,i)=>[`${t}x`,a.tail[i]!/N])),roundTailCounts:Object.fromEntries(THRESHOLDS.map((t,i)=>[`${t}x`,a.tail[i]!])),conservationFailures:a.conservationFailures};
 mkdirSync('05-docs/data/v3',{recursive:true});const file=`05-docs/data/v3/simulation-${N}-seed${seed}.json`;writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,rtp:report.rtp,ci95:report.rtpCI95,seconds:report.seconds,selected5000:a.selected5000,maxX:a.maxX}));
}else parentPort!.postMessage(runChunk(workerData.rounds,workerData.seed));
