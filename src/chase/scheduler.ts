import {SeededRng,type Rng} from '../math/v2/rng';
import type {CHASE} from '../config/chase';
/**
 * Decides WHEN the cosmetic gag may run. Fully independent from the economic engine: own RNG instance (never the outcome RNG), no access to
 * outcomes, balance, bet, RTP or volatility — it only receives "a spin was completed" and "is the game idle?".
 */
export interface SchedulerDeps{cfg:typeof CHASE;isIdle:()=>boolean;isRunning:()=>boolean;start:()=>Promise<boolean>;abort:()=>void;now?:()=>number;rng?:Rng}
export function createChaseScheduler(d:SchedulerDeps){
 const now=d.now??(()=>performance.now());
 const rng=d.rng??new SeededRng(crypto.getRandomValues(new Uint32Array(1))[0]!);   // cosmetic-only generator
 const draw=()=>d.cfg.minSpins+rng.int(d.cfg.maxSpins-d.cfg.minSpins+1);
 let count=0,target=draw(),lastEnd=now(),idleSince:number|null=null,starting=false;
 function tick(){
  const idle=d.isIdle();
  if(d.isRunning()){if(!idle)d.abort();return;}                     // anything non-idle (spin, popup, dialog, bonus…) ends the gag in an orderly way
  if(!idle){idleSince=null;return;}
  idleSince??=now();
  if(!d.cfg.chaseEnabled||starting||count<target)return;            // not due yet → postponed to the next idle moment if it was due while busy
  if(now()-idleSince<d.cfg.settleMs||now()-lastEnd<d.cfg.cooldownMs)return;
  starting=true;d.start().then(ok=>{if(ok){count=0;target=draw();}lastEnd=now();}).finally(()=>{starting=false;});
 }
 const timer=setInterval(tick,300);
 return {onSpinCompleted(){count++;},tick,state:()=>({count,target,lastEnd}),forceDue(){count=target;lastEnd=-1e9;},dispose(){clearInterval(timer);}};
}
