import {urls} from '../view/assets';import {medalFor} from './bonusAssets';import {keys} from './keyboard';
import type {Chase} from '../chase/director';
/**
 * CHEST BONUS COMPLETATO — final reveal inside the stone portal (the approved Hide & Seek arch art, no brown panel):
 * VINCITA BASE → multiplier medal → the number transforms into VINCITA TOTALE. Presentation only: every figure is handed in from the engine's
 * FeatureState / ledger; nothing is multiplied or credited here. For ×5 the original Skull and the Seeker (blaster at rest) cheer on the portal steps.
 */
export interface FinaleData{baseCents:number;multiplier:number;/** effective (post-cap) credited total from the engine */totalCents:number;/** engine reached the 5,000× round cap */capped:boolean;spins:number}
export type FinaleLevel='x1'|'x2'|'x5'|'max';
export function finaleLevel(d:FinaleData):FinaleLevel{return d.capped?'max':d.multiplier>=5?'x5':d.multiplier>=2?'x2':'x1';}
/** Timeline (ms from the start). Exported for tests. */
export const FINALE_T={title:250,baseIn:700,baseCount:900,mult:1900,transform:3000,transformMs:2100,settle:5300};
export function createChestFinale(d:{host:HTMLElement;sizeFrom:HTMLElement;money:(c:number)=>string;reduced:boolean;chase:Chase;/** called exactly when the multiplied total is revealed (balance catches up) */onReveal:()=>void}){
 const root=document.createElement('div');root.className='cf';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Chest Bonus completato');
 root.innerHTML=`<img class="cf-art" alt="" draggable="false"><div class="cf-vignette"></div><div class="cf-rays"></div><canvas class="cf-fx" aria-hidden="true"></canvas>
  <div class="cf-title"><span data-k="title">CHEST BONUS COMPLETATO</span></div>
  <div class="cf-stack"><div class="cf-label" data-k="label">VINCITA BASE</div><div class="cf-num" data-k="num">0.00</div><div class="cf-sub" data-k="sub"></div></div>
  <div class="cf-mult" data-k="mult"><img data-k="multimg" alt="" draggable="false"></div>
  <div class="cf-hint" aria-hidden="true">TOCCA PER CONTINUARE</div>`;
 root.querySelector<HTMLImageElement>('.cf-art')!.src=urls.bonus;d.host.appendChild(root);
 const q=<T extends HTMLElement>(k:string)=>root.querySelector<T>(`[data-k="${k}"]`)!;
 const fx=root.querySelector<HTMLCanvasElement>('.cf-fx')!,ctx=fx.getContext('2d')!;
 let tapOff=()=>{};let timers:number[]=[],raf=0,fxRaf=0,open=false,settled=false;
 const T=(fn:()=>void,ms:number)=>{timers.push(window.setTimeout(fn,ms));};
 const clearAll=()=>{timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);cancelAnimationFrame(fxRaf);};
 const tween=(from:number,to:number,ms:number,step:(v:number)=>void,ease=(k:number)=>1-Math.pow(1-k,3))=>{const t0=performance.now();cancelAnimationFrame(raf);const f=(now:number)=>{const k=ms?Math.min(1,(now-t0)/ms):1;step(from+(to-from)*ease(k));if(k<1&&open)raf=requestAnimationFrame(f);};raf=requestAnimationFrame(f);};
 // ---- confetti (≤140 sprites, 2D, stops by itself; never covers the number: spawned from the portal sides and top) ----
 type P={x:number;y:number;vx:number;vy:number;r:number;vr:number;w:number;h:number;c:string;life:number};
 let parts:P[]=[];
 function burst(n:number,power:number){const W=fx.width,H=fx.height;const cols=['#ffd36a','#fff0b0','#c06cff','#8a4bff','#ffb02a'];
  for(let i=0;i<n;i++){const side=i%3,x=side===0?W*.12:side===1?W*.88:W*(.3+Math.random()*.4),y=side===2?-10:H*.5;const a=side===0?-1.1+Math.random()*.7:side===1?-2.05-Math.random()*.7:Math.PI/2+(Math.random()-.5);
   const v=(260+Math.random()*420)*power;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:Math.random()*6,vr:(Math.random()-.5)*14,w:6+Math.random()*8,h:4+Math.random()*7,c:cols[(Math.random()*cols.length)|0]!,life:2.6+Math.random()*1.4});}
  if(parts.length>180)parts=parts.slice(-180);if(!fxRaf)loop();}
 let last=0;function loop(){last=performance.now();const f=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;ctx.clearRect(0,0,fx.width,fx.height);
   for(const p of parts){p.life-=dt;p.vy+=520*dt;p.vx*=.995;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();}
   parts=parts.filter(p=>p.life>0&&p.y<fx.height+40);if(parts.length&&open)fxRaf=requestAnimationFrame(f);else{fxRaf=0;ctx.clearRect(0,0,fx.width,fx.height);}};fxRaf=requestAnimationFrame(f);}
 function layout(){const s=d.sizeFrom;root.style.cssText=s.style.cssText;root.style.display='';fx.width=Math.max(320,Math.round(s.offsetWidth/2));fx.height=Math.max(240,Math.round(s.offsetHeight/2));}
 function feetPositions(){const s=d.sizeFrom,k=parseFloat(root.style.getPropertyValue('--k'))||1,L=s.offsetLeft,Tp=s.offsetTop;return {skull:{x:L+150*k,y:Tp+990*k},seeker:{x:L+1300*k,y:Tp+990*k}};}
 return {
  get open(){return open;},
  show(data:FinaleData):Promise<void>{
   if(open)return Promise.resolve();open=true;settled=false;parts=[];const level=finaleLevel(data),m=d.money;
   layout();root.hidden=false;root.dataset.level=level;root.classList.remove('on','settled','mult-in','xform','ready');(document.activeElement as HTMLElement|null)?.blur?.();void root.offsetWidth;root.classList.add('on');
   q('title').textContent=level==='max'?'MAX WIN · CHEST BONUS':'CHEST BONUS COMPLETATO';q('label').textContent='VINCITA BASE';q('num').textContent=m(0);{const mi=q<HTMLImageElement>('multimg'),src=medalFor(data.multiplier);if(src){mi.src=src;mi.alt=`Moltiplicatore ×${data.multiplier}`;}else mi.removeAttribute('src');}q('sub').textContent='';
   const noWin=data.baseCents<=0,R=d.reduced;
   const finish=()=>{if(settled)return;settled=true;clearAll();q('label').textContent=noWin?'NESSUNA VINCITA':'VINCITA TOTALE';q('num').textContent=m(data.totalCents);root.classList.add('mult-in','xform','settled');
    q('sub').textContent=data.capped?'LIMITE MAX WIN RAGGIUNTO · IMPORTO EFFETTIVO':'';if(!noWin)d.onReveal();root.classList.add('ready');armedAt=performance.now();};
   let armedAt=Infinity;
   const t=FINALE_T;
   if(R||noWin){T(finish,R?200:900);}
   else{
    T(()=>tween(0,data.baseCents,t.baseCount,v=>{q('num').textContent=m(Math.round(v));}),t.baseIn);
    T(()=>root.classList.add('mult-in'),t.mult);
    T(()=>{root.classList.add('xform');q('label').textContent='VINCITA TOTALE';d.onReveal();tween(data.baseCents,data.totalCents,t.transformMs,v=>{q('num').textContent=m(Math.round(v));},k=>k*k*(3-2*k));
     burst(level==='x1'?18:level==='x2'?46:level==='x5'?90:140,level==='max'?1.25:1);},t.transform);
    T(()=>{if(level==='x5'||level==='max'){void d.chase.celebrate(feetPositions());burst(level==='max'?100:60,1.1);}},t.transform+t.transformMs-350);
    if(level==='max')T(()=>burst(90,1.2),t.transform+t.transformMs+700);
    T(finish,t.settle);
   }
   return new Promise<void>(res=>{let release=()=>{};
    const end=()=>{if(!open)return;if(!settled){finish();return;}if(performance.now()-armedAt<600)return;open=false;tapOff();release();clearAll();d.chase.stopCelebrate();root.classList.remove('on');root.hidden=true;ctx.clearRect(0,0,fx.width,fx.height);window.setTimeout(res,d.reduced?0:200);};
    // Enter/Space first fast-forward the reveal, then (after 0.6 s) continue. Auto-repeat never counts.
    release=keys.push({id:'chest-finale',root,handle:e=>{if((e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Space')&&!e.repeat){end();return true;}}});
    // Tap/click ANYWHERE continues (no button). Captured so the click never reaches SPIN/Buy underneath; ignored while a native dialog is open and during the first 0.45 s
    // (the click that opened the summary can never close it). Before the reveal has settled a tap only fast-forwards it; `end` is idempotent (no double transition).
    const shownAt=performance.now();
    function onTap(e:Event){if(!open)return;e.preventDefault();e.stopPropagation();if(performance.now()-shownAt<450)return;end();}
    document.addEventListener('click',onTap,true);tapOff=()=>document.removeEventListener('click',onTap,true);});
  },
  /** hard close (tab/state recovery): never leaves an overlay or a celebrating Skull behind */
  abort(){if(!open)return;open=false;tapOff();clearAll();d.chase.stopCelebrate();root.classList.remove('on');root.hidden=true;},
 };
}
