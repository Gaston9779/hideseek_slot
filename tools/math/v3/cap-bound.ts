/** Rigorous Chernoff upper bound for cap hits that do not select the explicit 5,000x prize.
 * Free-spin payout law is exactly V2's (V3 repeats the same strips); V3 base replaces a low
 * symbol by a non-paying trigger and therefore cannot exceed V2's enumerated 2,140-unit max.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const enumeration=JSON.parse(readFileSync('05-docs/data/enumeration.json','utf8')) as {base:{maxUnits:number},free:{combinations:number,hist:[number,number][]}};
const maxBaseUnits=enumeration.base.maxUnits,maxNonJackpotChestUnits=500*20,threshold=100000-maxBaseUnits-maxNonJackpotChestUnits,n=30,D=enumeration.free.combinations,h=enumeration.free.hist;
const logM=(t:number)=>{const terms=h.map(([u,c])=>Math.log(c)+t*u),m=Math.max(...terms);return m+Math.log(terms.reduce((s,x)=>s+Math.exp(x-m),0))-Math.log(D);};
const objective=(t:number)=>-t*threshold+n*logM(t);let lo=0,hi=.1;for(let i=0;i<160;i++){const a=(2*lo+hi)/3,b=(lo+2*hi)/3;if(objective(a)<objective(b))hi=b;else lo=a;}const t=(lo+hi)/2,logBound=objective(t),probabilityBound=Math.exp(logBound);
const report={schema:'skull-hunt-math-v3-cap-bound-1',method:'Chernoff bound over 30 iid potential Free Spins, using exhaustive per-spin histogram',maxBaseUnits,maxNonJackpotChestUnits,freeSpinsPadded:30,requiredFreeSpinUnits:threshold,optimizingT:t,naturalLogProbabilityBound:logBound,probabilityBound,rtpEffectUpperBound:probabilityBound*5000};
writeFileSync('05-docs/data/v3/non-jackpot-cap-bound.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
