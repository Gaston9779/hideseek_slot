import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { FEATURE_RULES, MAX_WIN_UNITS, SCATTER_FREE_SPINS } from '../../src/math/v4/config';
import { BASE_STRIPS } from '../../src/math/v4/strips';
import { specialDist } from './v4/exact';

const T = 96 ** 5;
const rows = readFileSync('05-docs/data/v5_1/feature-spin-outcomes.tsv', 'utf8').trim().split('\n').slice(1).map(x => { const [u,s,c,n] = x.split('\t').map(Number); return {u,s,c,n}; });
const logSum = (a:number[]) => { const m=Math.max(...a); return m+Math.log(a.reduce((v,x)=>v+Math.exp(x-m),0)); };
const momentsForCategory = (t:number,m:number) => Array.from({length:4},(_,k) => {
  let result=0; for (const r of rows) if ((r.s>=3?2:0)+(r.c>=3?1:0)===k) result += r.n/T*Math.exp(t*m*r.u); return result;
});

function stateMoments(t:number) {
  const cm={1:momentsForCategory(t,1),2:momentsForCategory(t,2),5:momentsForCategory(t,5)} as Record<number,number[]>;
  const chest=(mult:number) => {
    const memo=new Map<string,number>();
    const go=(played:number, awarded:number):number => {
      if (played>=awarded) return 0;
      const key=`${played}/${awarded}`, old=memo.get(key); if(old!==undefined)return old;
      const q:number[]=[];
      for(let cat=0;cat<4;cat++) { const sc=!!(cat&2), cb=!!(cat&1); q.push(Math.log(cm[mult]![cat]!)+go(played+1,Math.min(48,awarded+(sc?6:0)+(cb?12:0)))); }
      const v=logSum(q);memo.set(key,v);return v;
    }; return go(0,12);
  };
  const scatter=(initial:number) => {
    const memo=new Map<string,number>();
    const go=(played:number,awarded:number,mult:number,segment:number,queue:string,picks:number):number => {
      if(played>=awarded)return 0;
      const key=`${played}/${awarded}/${mult}/${segment}/${queue}/${picks}`,old=memo.get(key);if(old!==undefined)return old;
      const q:number[]=[];
      for(let cat=0;cat<4;cat++) {
        const sc=!!(cat&2),cb=!!(cat&1); let m=mult, seg=segment-1, queued=queue?queue.split(',').map(Number):[],a=awarded,p=picks;
        if(seg<=0&&queued.length){m=queued.shift()!;seg=12;}
        if(sc){const add=Math.min(SCATTER_FREE_SPINS.retrigger[3]!,Math.max(0,SCATTER_FREE_SPINS.maxAwardedPerFeature-a+p*FEATURE_RULES.scatter.chestExtraSpins));a+=add;seg+=add;}
        if(cb&&p<3){p++;a+=12;for(const pick of [1,2,5]){let m2=m,s2=seg,q2=[...queued,pick];if(s2<=0){m2=q2.shift()!;s2=12;}q.push(Math.log(cm[mult]![cat]!/3)+go(played+1,a,m2,s2,q2.join(','),p));}}
        else q.push(Math.log(cm[mult]![cat]!)+go(played+1,a,m,seg,queued.join(','),p));
      }
      const v=logSum(q);memo.set(key,v);return v;
    }; return go(0,initial,1,initial,'',0);
  };
  return {chest1:chest(1),chest2:chest(2),chest5:chest(5),scatter3:scatter(12),scatter4:scatter(15),scatter5:scatter(20)};
}
const d=specialDist(BASE_STRIPS), baseUpper=22700, normalThreshold=MAX_WIN_UNITS-baseUpper;
const excess=(logM:number,threshold:number,t:number)=>Math.exp(logM-t*threshold-Math.log(t));
let bestNormal:any, bestBuy:any;
for(let t=.00001;t<=.0003;t+=.000002){
  const x=stateMoments(t), chest=logSum([x.chest1,x.chest2,x.chest5].map(v=>v-Math.log(3))); let n=0;
  for(let sc=0;sc<d.length;sc++)for(let cb=0;cb<d[sc]!.length;cb++){const p=Number(d[sc]![cb]!)/T;if(sc>=3)n+=p*excess(sc===3?x.scatter3:sc===4?x.scatter4:x.scatter5,normalThreshold,t);if(cb>=3)n+=p*excess(chest,normalThreshold,t);}
  if(!bestNormal||n<bestNormal.expectedLossUnits)bestNormal={t,expectedLossUnits:n,rtpFraction:n/20,logMoments:x};
  const b=excess(chest,MAX_WIN_UNITS,t);if(!bestBuy||b<bestBuy.expectedLossUnits)bestBuy={t,expectedLossUnits:b,rtpFraction:b/(134*20),logMoments:x};
}
const report={schema:'skull-hunt-v5_1-state-exact-chernoff-cap-bound-1',method:'exhaustive 96^5 feature-spin outcome distribution plus exact finite V5 feature-state moment recursion and Chernoff excess-loss inequality',normal:{baseUpperUnits:baseUpper,thresholdUnits:normalThreshold,...bestNormal},buy:{thresholdUnits:MAX_WIN_UNITS,...bestBuy},note:'Rigorous upper bounds, not point estimates; base dual is deliberately counted twice in normal bound.'};
mkdirSync('05-docs/data/v5_1',{recursive:true});writeFileSync('05-docs/data/v5_1/cap-state-bound.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
