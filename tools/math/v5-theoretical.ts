/** V5 pre-cap normal model: independent reference payout EV + finite-state Markov reward DP.
 * It does not import production evaluate() or SlotGame. Floating DP uses exact reel-count
 * transition probabilities; the error source is only IEEE-754 summation, not simulation. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {CHEST_PACKAGES,FEATURE_RULES,SCATTER_FREE_SPINS} from '../../src/math/v4/config';
import {BASE_STRIPS,FS_STRIPS} from '../../src/math/v4/strips';
import {specialDist,lineEv} from './v4/exact';import {refScatter} from './v4/ref';

type Vec={spins:number;one:number;two:number;five:number};const zero=():Vec=>({spins:0,one:0,two:0,five:0});const add=(a:Vec,b:Vec)=>({spins:a.spins+b.spins,one:a.one+b.one,two:a.two+b.two,five:a.five+b.five});const plusSpin=(m:number,v:Vec):Vec=>({spins:v.spins+1,one:v.one+(m===1?1:0),two:v.two+(m===2?1:0),five:v.five+(m===5?1:0)});const scale=(p:number,v:Vec):Vec=>({spins:p*v.spins,one:p*v.one,two:p*v.two,five:p*v.five});
const DB=96**5,DF=96**5,distB=specialDist(BASE_STRIPS),distF=specialDist(FS_STRIPS);
const pb=distB.map(r=>r.map(n=>Number(n)/DB)),pf=distF.map(r=>r.map(n=>Number(n)/DF));
const symbolCounts=(ss:readonly (readonly string[])[])=>ss.map(s=>{const r:Record<string,number>={};for(const x of s)r[x]=(r[x]??0)+1;return r;});
const lineEV=(ss:readonly (readonly string[])[],mode:'base'|'feature')=>Number(lineEv(ss as any,mode))/ (ss[0]!.length**5);
let fsScatterEV=0,baseScatterEV=0,pChest=0,pScatter=0,pDual=0;
for(let sc=0;sc<pb.length;sc++)for(let ch=0;ch<pb[sc]!.length;ch++){const p=pb[sc]![ch]!;baseScatterEV+=p*(refScatter(sc)/20);if(sc>=3)pScatter+=p;if(ch>=3)pChest+=p;if(sc>=3&&ch>=3)pDual+=p;}
for(let sc=0;sc<pf.length;sc++)for(let ch=0;ch<pf[sc]!.length;ch++)fsScatterEV+=pf[sc]![ch]!*(refScatter(sc)/20);
/* `lineEv` is one-line raw units; 20 equiprobable paylines / 20 units-per-bet cancel. */
const fsSpinEV=lineEV(FS_STRIPS,'feature')+fsScatterEV;const baseLineEV=lineEV(BASE_STRIPS,'base');

/** Chest has a fixed multiplier, but 3+ Scatter/+6 and 3+ Chest/+12 can extend to 48. */
function chestVec(m:number){const memo=new Map<string,Vec>();const go=(played:number,awarded:number):Vec=>{if(played>=awarded)return zero();const key=`${played}/${awarded}`,old=memo.get(key);if(old)return old;let out=zero();for(let sc=0;sc<pf.length;sc++)for(let cb=0;cb<pf[sc]!.length;cb++){const p=pf[sc]![cb]!;if(!p)continue;let inc=0;if(sc>=3)inc+=FEATURE_RULES.chest.scatterExtraSpins;if(cb>=3)inc+=FEATURE_RULES.chest.chestExtraSpins;out=add(out,scale(p,go(played+1,Math.min(FEATURE_RULES.chest.maxAwardedSpins,awarded+inc))));}out=plusSpin(m,out);memo.set(key,out);return out;};return go(0,12);}

/** Scatter preserves its currently running segment; in-feature Chest picks append a random 12-spin 1/2/5 segment. */
function scatterVec(initial:number){const memo=new Map<string,Vec>();const go=(played:number,awarded:number,m:number,segment:number,queue:string,picks:number):Vec=>{if(played>=awarded)return zero();const key=`${played}/${awarded}/${m}/${segment}/${queue}/${picks}`,old=memo.get(key);if(old)return old;let out=zero();for(let sc=0;sc<pf.length;sc++)for(let cb=0;cb<pf[sc]!.length;cb++){const p=pf[sc]![cb]!;if(!p)continue;let mm=m,seg=segment-1,q=queue?queue.split(',').map(Number):[],aa=awarded,pp=picks;
  if(seg<=0&&q.length){const n=q.shift()!;mm=n;seg=12;}
  if(sc>=3){const extra=Math.min(SCATTER_FREE_SPINS.retrigger[Math.min(sc,5)]!,Math.max(0,SCATTER_FREE_SPINS.maxAwardedPerFeature-aa+pp*FEATURE_RULES.scatter.chestExtraSpins));aa+=extra;seg+=extra;}
  if(cb>=3&&pp<FEATURE_RULES.scatter.maxChestPicks){pp++;aa+=FEATURE_RULES.scatter.chestExtraSpins;for(const pick of [1,2,5]){let qm=mm,qs=seg,qq=[...q,pick];if(qs<=0){qm=qq.shift()!;qs=12;}out=add(out,scale(p/3,go(played+1,aa,qm,qs,qq.join(','),pp)));}continue;}
  out=add(out,scale(p,go(played+1,aa,mm,seg,q.join(','),pp)));
 }out=plusSpin(m,out);memo.set(key,out);return out;};return go(0,initial,1,initial,'',0);}
const c1=chestVec(1),c2=chestVec(2),c5=chestVec(5),s3=scatterVec(12),s4=scatterVec(15),s5=scatterVec(20);const value=(v:Vec)=>fsSpinEV*(v.one+2*v.two+5*v.five);
let scatterFeature=0;for(let sc=3;sc<pb.length;sc++)for(let cb=0;cb<pb[sc]!.length;cb++){const v=sc===3?s3:sc===4?s4:s5;scatterFeature+=pb[sc]![cb]!*value(v);}const chestAverage=(value(c1)+value(c2)+value(c5))/3,chestFeature=pChest*chestAverage,total=baseLineEV+baseScatterEV+scatterFeature+chestFeature;
const report={schema:'skull-hunt-v5-theoretical-precap-1',mathVersion:'4.1.0',method:'exact reel-count enumeration for per-spin EV/trigger probabilities plus finite acyclic Markov reward DP for V5 feature state; numerical DP only (no Monte Carlo)',assumption:'round cap excluded',perSpin:{baseLineEV,baseScatterEV,featureLineEV:lineEV(FS_STRIPS,'feature'),featureScatterEV:fsScatterEV,featureEV:fsSpinEV},triggers:{scatter:pScatter,chest:pChest,dual:pDual},features:{scatter:{initial12:s3,value:value(s3),initial15:s4,value15:value(s4),initial20:s5,value20:value(s5)},chest:{x1:c1,value1:value(c1),x2:c2,value2:value(c2),x5:c5,value5:value(c5),averageValue:chestAverage}},rtp:{baseLines:baseLineEV,baseScatter:baseScatterEV,scatterFeature, chestFeature,totalPreCap:total}};
mkdirSync('05-docs/data/v5/theoretical',{recursive:true});writeFileSync('05-docs/data/v5/theoretical/v5-precap.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
