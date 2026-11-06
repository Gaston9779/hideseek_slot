/** V5 audit Monte Carlo: production SlotGame, real Buy API and independently seeded chest-position RNG.
 * Usage: node --import tsx tools/math/v5-simulate.ts normal|buy <rounds> <engineSeed> <choiceSeed>
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {SlotGame} from '../../src/engine/game';import {SeededRng} from '../../src/math/v2/rng';import {BUY_BONUS,MATH_VERSION} from '../../src/math/v4/config';
type Mode='normal'|'buy';type Chest={n:number;base:number;gross:number;credited:number;sumSq:number;wins:number;tails:number[];max:number};
const mode=(process.argv[2]??'normal') as Mode,N=Number(process.argv[3]??1_000_000),engineSeed=Number(process.argv[4]??2026110701),choiceSeed=Number(process.argv[5]??2026110702),BET=100,TH=[100,250,500,1000,5000];
if(!['normal','buy'].includes(mode)||!Number.isInteger(N)||N<1)throw new Error('usage: normal|buy rounds engineSeed choiceSeed');
const g=new SlotGame(new SeededRng(engineSeed),1_000_000_000_000),choice=new SeededRng(choiceSeed);g.betIndex=2;
const blank=():Chest=>({n:0,base:0,gross:0,credited:0,sumSq:0,wins:0,tails:TH.map(()=>0),max:0});const chest:Record<string,Chest>={'1x':blank(),'2x':blank(),'5x':blank()};
let sum=0,sumSq=0,hits=0,below=0,equal=0,above=0,scatter=0,chestTrigger=0,dual=0,caps=0,max=0,physical=0,accountingFailures=0;const selections=[0,0,0],permutations:Record<string,number>={},eventCounts:Record<string,number>={};const t0=Date.now();
for(let r=0;r<N;r++){
 const paid0=g.ledger.paid;let selected:string|null=null,initialChest=false;
 if(mode==='buy'){g.buyChestBonus();initialChest=true;} 
 do{
  if(g.phase==='ready'||g.phase==='free-spins'){const o=g.spin();g.settle();physical++;if(o.featureType===null){if(o.evaluation.totalUnits>0)hits++;if(o.evaluation.scatterCount>=3)scatter++;if(o.chest){chestTrigger++;if(o.evaluation.scatterCount>=3)dual++;}}}
  if(g.phase==='chest'){const c=g.chest!,pos=choice.int(3),m=c.multipliers[pos]!,key=c.multipliers.join(',');selections[pos]++;permutations[key]=(permutations[key]??0)+1;g.pickChest(pos);g.closeChest();if(!c.inFeature){selected=`${m}x`;initialChest=true;}}
  for(const e of g.drainEvents())eventCounts[e.type]=(eventCounts[e.type]??0)+1;
 }while(g.phase==='free-spins'||g.phase==='chest');
 const x=(g.ledger.paid-paid0)/(mode==='buy'?g.buyPriceCents():BET);sum+=x;sumSq+=x*x;max=Math.max(max,x);if(x<1)below++;else if(x===1)equal++;else above++;if(g.capReached)caps++;if(!g.conserved)accountingFailures++;
 if(initialChest&&selected){const f=g.lastCompletedChestFeature;if(f){const z=chest[selected]!;const base=f.baseBonusWinUnits*g.unitCents/BET,gross=f.grossMultipliedBonusWinUnits*g.unitCents/BET,credited=f.creditedBonusWinUnits*g.unitCents/BET;z.n++;z.base+=base;z.gross+=gross;z.credited+=credited;z.sumSq+=credited*credited;if(credited>0)z.wins++;z.max=Math.max(z.max,credited);TH.forEach((t,i)=>{if(credited>=t)z.tails[i]!++;});}}
}
const variance=Math.max(0,sumSq/N-(sum/N)**2),sd=Math.sqrt(variance),se=sd/Math.sqrt(N),summarize=(z:Chest)=>({selections:z.n,selectionFrequency:z.n/N,averageBase:z.n?z.base/z.n:null,averageGross:z.n?z.gross/z.n:null,averageCredited:z.n?z.credited/z.n:null,standardDeviation:z.n?Math.sqrt(Math.max(0,z.sumSq/z.n-(z.credited/z.n)**2)):null,winFrequency:z.n?z.wins/z.n:null,tailProbability:Object.fromEntries(TH.map((t,i)=>[`${t}x`,z.n?z.tails[i]!/z.n:null])),max:z.max});
const report={schema:'skull-hunt-v5-production-engine-monte-carlo-1',mathVersion:MATH_VERSION,mode,rounds:N,engineSeed,choiceSeed,engine:'src/engine/game.ts',buyPriceX:BUY_BONUS.priceX,denominator:mode==='buy'?'actual buy cost':'base stake',seconds:(Date.now()-t0)/1000,rtp:sum/N,rtpPercent:100*sum/N,standardDeviation:sd,standardError:se,ci95:[sum/N-1.96*se,sum/N+1.96*se],ci999:[sum/N-3.290526731*se,sum/N+3.290526731*se],hitFrequency:hits/N,returnVsDenominator:{below:below/N,equal:equal/N,above:above/N},triggers:{scatter:scatter/N,chest:chestTrigger/N,dual:dual/N},chestSelections:{positions:selections,positionFrequency:selections.map(x=>x/N),permutations,byMultiplier:Object.fromEntries(Object.entries(chest).map(([k,v])=>[k,summarize(v)]))},eventCounts,physicalSpins:physical,capHits:caps,maxReturnX:max,accountingFailures};
mkdirSync('05-docs/data/v5',{recursive:true});const out=`05-docs/data/v5/${mode}-${N}-e${engineSeed}-c${choiceSeed}.json`;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,rtp:report.rtp,ci95:report.ci95,seconds:report.seconds,caps,max,accountingFailures,selections}));
