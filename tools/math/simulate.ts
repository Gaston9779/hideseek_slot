/**
 * Monte Carlo through the REAL engine (SlotGame: spin → settle → chest → free spins, with cap and accounting).
 * usage: tsx tools/math/simulate.ts <baseSpins> <seed> [workers]   — a "spin" here = one paid base spin (= one round incl. its bonus features).
 * Seeds are reproducible (sfc32/splitmix32). Worker k uses seed+k·1_000_003 and plays baseSpins/workers rounds.
 */
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync} from 'node:fs';
import {SlotGame} from '../../src/engine/game';import {SeededRng} from '../../src/math/v2/rng';
const BET=100;
interface Acc{rounds:number;sum:number;sumSq:number;baseWin:number;fsWin:number;chestWin:number;hitSpins:number;fsTriggers:number;chestTriggers:number;fsSpins:number;capHits:number;maxX:number;allSpinsPaid:number;allSpins:number;buckets:number[];chestPrizeSum:number;conservationFailures:number;
 hit1:number;thresholds:number[]}
const EDGES=[0,1,2,5,10,20,50,100,200,500,1000,2000,5000]; // lower edges of round return buckets (×bet): bucket i = [EDGES[i],EDGES[i+1])
function runChunk(rounds:number,seed:number):Acc{
 const g=new SlotGame(new SeededRng(seed),Math.floor(Number.MAX_SAFE_INTEGER/4));g.betIndex=2;
 const a:Acc={rounds:0,sum:0,sumSq:0,baseWin:0,fsWin:0,chestWin:0,hitSpins:0,fsTriggers:0,chestTriggers:0,fsSpins:0,capHits:0,maxX:0,allSpinsPaid:0,allSpins:0,buckets:Array(EDGES.length+1).fill(0),chestPrizeSum:0,conservationFailures:0,hit1:0,thresholds:[]};
 for(let r=0;r<rounds;r++){
  const paid0=g.ledger.paid;let first=true;
  do{
   const o=g.spin();const w=g.settle();a.allSpins++;
   if(o.mode==='base'){a.baseWin+=w;if(w>0)a.hitSpins++;if(o.evaluation.scatterCount>=3)a.fsTriggers++;if(o.chest)a.chestTriggers++;}else{a.fsWin+=w;a.fsSpins++;}
   if(g.phase==='chest'){const pk=g.pickChest(r%3)!;a.chestWin+=pk.credited;a.chestPrizeSum+=pk.prize;g.closeChest();}
   first=false;
  }while(g.phase==='free-spins');
  void first;
  const win=g.ledger.paid-paid0;const x=win/BET;a.rounds++;a.sum+=win;a.sumSq+=x*x;if(x>a.maxX)a.maxX=x;if(g.capReached)a.capHits++;

  const idx=x===0?0:1+EDGES.slice(1).filter(e=>x>=e).length;a.buckets[idx]++;if(x>=1)a.hit1++;
  if(!g.conserved)a.conservationFailures++;
 }
 return a;
}
function merge(xs:Acc[]):Acc{const o=structuredClone(xs[0]!);for(const k of Object.keys(o) as (keyof Acc)[]){if(k==='buckets'||k==='thresholds')continue;if(k==='maxX'){o.maxX=Math.max(...xs.map(x=>x.maxX));continue;}(o as any)[k]=xs.reduce((s,x)=>s+(x as any)[k],0);}o.buckets=xs[0]!.buckets.map((_,i)=>xs.reduce((s,x)=>s+x.buckets[i]!,0));return o;}
if(isMainThread){
 const N=Number(process.argv[2]??1000000),seed=Number(process.argv[3]??20261106),W=Number(process.argv[4]??Math.max(1,Math.min(8,(await import('node:os')).cpus().length-1)));
 const t0=Date.now();const per=Math.floor(N/W);
 const parts=await Promise.all(Array.from({length:W},(_,k)=>new Promise<Acc>((res,rej)=>{const w=new Worker(new URL(import.meta.url),{workerData:{rounds:per+(k===0?N-per*W:0),seed:seed+k*1000003},execArgv:process.execArgv});w.on('message',res);w.on('error',rej);})));
 const a=merge(parts);const n=a.rounds;const mean=a.sum/BET/n;const varr=a.sumSq/n-mean*mean;const sd=Math.sqrt(varr);const se=sd/Math.sqrt(n);
 const rep={mathVersion:'2.0.0',baseSpins:N,seed,workers:W,seconds:(Date.now()-t0)/1000,rtp:mean,rtpCI95:[mean-1.96*se,mean+1.96*se],rtpCI99_9:[mean-3.29*se,mean+3.29*se],stdErr:se,stdDevPerRound:sd,
  components:{base:a.baseWin/BET/n,freeSpins:a.fsWin/BET/n,chest:a.chestWin/BET/n},baseHitFrequency:a.hitSpins/n,roundReturnAtLeastBet:a.hit1/n,fsTriggerFreq:a.fsTriggers/n,fsTriggerOneIn:n/a.fsTriggers,chestTriggerFreq:a.chestTriggers/n,chestOneIn:a.chestTriggers?n/a.chestTriggers:null,
  avgFsSpinsPerTrigger:a.fsTriggers?a.fsSpins/a.fsTriggers:null,avgChestPrizeX:a.chestTriggers?a.chestPrizeSum/a.chestTriggers:null,totalSpinsPlayed:a.allSpins,capHits:a.capHits,maxRoundWinX:a.maxX,conservationFailures:a.conservationFailures,
  bucketsEdgesX:EDGES,buckets:a.buckets,bucketProbabilities:a.buckets.map(b=>b/n),
  pRoundAtLeast:Object.fromEntries([10,20,50,100,200,500,1000].map(x=>[`${x}x`,null as number|null]))};
 // tail probabilities from buckets
 const cum=(from:number)=>{let s=0;a.buckets.forEach((b,i)=>{const lo=i===0?-1:i===1?0:EDGES[i-1]!;if(lo>=from)s+=b;});return s/n;};
 for(const x of [10,20,50,100,200,500,1000])(rep.pRoundAtLeast as any)[`${x}x`]=cum(x);
 const file=`05-docs/data/sim-${N}-seed${seed}.json`;writeFileSync(file,JSON.stringify(rep,null,1));console.log(JSON.stringify({file,rtp:rep.rtp,ci95:rep.rtpCI95,seconds:rep.seconds,sd:sd},null,0));
}else{parentPort!.postMessage(runChunk(workerData.rounds,workerData.seed));}
