/**
 * EXACT RTP computation (rational arithmetic) for math model v2.
 * 1. Line EV by exact enumeration of the 12^5 symbol tuples of ONE line weighted by reel symbol counts (rows are marginally uniform, lines identical in law).
 * 2. Scatter count distribution by exact convolution of per-reel window scatter counts.
 * 3. Free-spin expected spin count by exact DP over (played, awarded) with cap and retriggers; payout by Wald's identity (spin i is played iff decided by spins < i).
 * 4. Chest EV from the weight table.
 * Cross-check: tools/math/enumerate.ts enumerates every stop combination with the PRODUCTION evaluate() and must match to the unit.
 */
import {CHEST,FREE_SPINS,SCATTER_PAY_X,SYMBOLS,type SymbolId} from '../../src/math/v2/config';
import {BASE_STRIPS,FS_STRIPS} from '../../src/math/v2/strips';
import {freeSpinsInitial,freeSpinsRetrigger,windowAt} from '../../src/math/v2/spin';
import {refLine} from './ref';import {Q} from './rational';
export type Strips=readonly (readonly SymbolId[])[];
const prod=(a:number[])=>a.reduce((x,y)=>x*y,1);
export function symbolCounts(strips:Strips){return strips.map(s=>{const m:Record<string,number>={};for(const x of s)m[x]=(m[x]??0)+1;return m;});}
/** numerator of expected line units (per line) over denominator ΠL */
export function lineEvNumerator(strips:Strips,mode:'base'|'free'):bigint{
 const cnt=symbolCounts(strips);let total=0n;const idx=[0,0,0,0,0];const n=SYMBOLS.length;
 const rec=(r:number,w:bigint,syms:SymbolId[])=>{
  if(r===5){const u=refLine(syms,mode);if(u)total+=w*BigInt(u);return;}
  for(let i=0;i<n;i++){const s=SYMBOLS[i]!;const c=cnt[r]![s]??0;if(!c)continue;idx[r]=i;rec(r+1,w*BigInt(c),[...syms,s]);}
 };rec(0,1n,[]);return total;
}
export function scatterDist(strips:Strips):bigint[]{ // counts over ΠL for 0..15 scatters (windows are rows of strip; stops uniform)
 let d:bigint[]=[1n];
 for(const strip of strips){const per=Array(4).fill(0n) as bigint[];for(let s=0;s<strip.length;s++)per[windowAt(strip,s).filter(x=>x==='SCATTER').length]!++;
  const nd=Array(d.length+3).fill(0n) as bigint[];d.forEach((v,i)=>per.forEach((c,k)=>{nd[i+k]+=v*c;}));d=nd;}
 return d;
}
export function expectedSpins(init:number,pk:Q[]):Q{ // pk[k] = P(k scatters in a free spin)
 const memo=new Map<string,Q>();
 const f=(played:number,awarded:number):Q=>{if(played>=awarded)return Q.of(0);const key=`${played},${awarded}`;const m=memo.get(key);if(m)return m;
  let e=Q.of(1);pk.forEach((p,k)=>{if(!p.n)return;const add=k>=3?Math.min(freeSpinsRetrigger(k),Math.max(0,FREE_SPINS.maxAwardedPerFeature-awarded)):0;e=e.add(p.mul(f(played+1,awarded+add)));});memo.set(key,e);return e;};
 return f(0,init);
}
export function chestEv():Q{const wt=CHEST.sets.reduce((a,s)=>a+s.w,0);let num=Q.of(0);for(const s of CHEST.sets)num=num.add(Q.of(s.w*(s.p[0]+s.p[1]+s.p[2]),3));return num.div(Q.of(wt));}
export function exactModel(){
 const DB=BigInt(prod(BASE_STRIPS.map(s=>s.length))),DF=BigInt(prod(FS_STRIPS.map(s=>s.length)));
 const baseLines=new Q(lineEvNumerator(BASE_STRIPS,'base'),DB);        // = RTP share (× total bet); 20 lines × EV/20 units
 const fsLines=new Q(lineEvNumerator(FS_STRIPS,'free'),DF);            // expected × total bet per FS spin (lines only)
 const sB=scatterDist(BASE_STRIPS).map(c=>new Q(c,DB)),sF=scatterDist(FS_STRIPS).map(c=>new Q(c,DF));
 const scPay=(k:number)=>k>=3?Q.of(SCATTER_PAY_X[Math.min(k,5)-3]!):Q.of(0);
 const baseScatter=sB.reduce((a,p,k)=>a.add(p.mul(scPay(k))),Q.of(0));
 const fsScatter=sF.reduce((a,p,k)=>a.add(p.mul(scPay(k))),Q.of(0));
 const fsSpinEv=fsLines.add(fsScatter);
 const pTrig=sB.reduce((a,p,k)=>k>=3?a.add(p):a,Q.of(0));const pChest=sB.reduce((a,p,k)=>k>=CHEST.triggerScatters?a.add(p):a,Q.of(0));
 let fsRtp=Q.of(0),eSpinsAvg=Q.of(0);const perTrigger:Record<number,string>={};
 sB.forEach((p,k)=>{if(k<3||!p.n)return;const en=expectedSpins(freeSpinsInitial(k),sF);perTrigger[k]=en.toString(6);fsRtp=fsRtp.add(p.mul(en).mul(fsSpinEv));eSpinsAvg=eSpinsAvg.add(p.mul(en));});
 const chestRtp=pChest.mul(chestEv());
 const total=baseLines.add(baseScatter).add(fsRtp).add(chestRtp);
 return {baseLines,baseScatter,fsLines,fsScatter,fsSpinEv,pTrig,pChest,fsRtp,chestRtp,total,eSpinsGivenTrigger:eSpinsAvg.div(pTrig),perTrigger,avgFsFeatureWin:fsRtp.div(pTrig),avgChestPrize:chestEv(),sB,sF,DB,DF};
}
if(process.argv[1]?.endsWith('exact.ts')){const m=exactModel();console.log(JSON.stringify({total:m.total.toString(8),baseLines:m.baseLines.toString(8),baseScatter:m.baseScatter.toString(8),fsRtp:m.fsRtp.toString(8),chestRtp:m.chestRtp.toString(8),trigOneIn:Q.of(1).div(m.pTrig).toString(2),chestOneIn:Q.of(1).div(m.pChest).toString(1),fsSpinEv:m.fsSpinEv.toString(4),avgSpins:m.eSpinsGivenTrigger.toString(3),avgFeature:m.avgFsFeatureWin.toString(2)},null,1));}
