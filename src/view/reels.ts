import type {SymbolId} from '../config/game';
import {paylines} from '../config/game';
import type {Outcome} from '../math/slot';
import {CELLS,COL_CENTERS,ROW_CENTER0,ROW_PITCH,SYMBOL_SIZE,PLAY_AREA,type Rect} from '../layout';
import {REEL_ANIM} from '../config/reelAnim';
import {SYMBOL_ART} from '../config/presentation';
import {Particles} from './particles';

/**
 * Reel presentation.
 *  displayedGrid = this.cells (what is on screen; changes ONLY when a reel has stopped)
 *  targetGrid    = outcome.grid (already decided by the engine; read only to build the strip that the reel will decelerate onto)
 *  reelAnimationState = Strip{plan,pos,speed} (continuous vertical translation of a symbol strip)
 * The strip of a reel is: [displayed column] → cosmetic ordinary symbols → [target column]. Because the displayed column is the first part of the strip,
 * the first animated frame is the continuation of the last static frame; the target column is reached by decelerating, never by swapping images.
 */
const ORDINARY:SymbolId[]=['TOMB','LANTERN','CHEST','POTION','KEY','GHOST','MAGIC_BOOK','BLASTER','SKULL','GARGOYLE','TOMB','LANTERN','CHEST','POTION','KEY','GHOST'];   // cosmetic blur symbols: never WILD/SCATTER/CHEST_BONUS (no fake bonus hints)
const hash=(n:number)=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
const easeBack=(q:number)=>{const c1=1.15,c3=c1+1;return 1+c3*Math.pow(q-1,3)+c1*Math.pow(q-1,2);};
const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
const rrect=(c:CanvasRenderingContext2D,r:Rect,rad:number)=>{c.beginPath();c.roundRect(r.x,r.y,r.w,r.h,rad);};
const EB0=3*2.15-2*1.15;   // easeBack'(0) = 4.15 → settle distance = v0·T/EB0 gives continuous velocity

interface Plan{N:number;end:number;at(tt:number):{pos:number;speed:number}}
interface Strip{N:number,done:boolean,anticipate:boolean,pos:number,speed:number,start:number,plan?:Plan,kind:{s:boolean,c:boolean}}
interface Cell{id:SymbolId,landed:number,win:0|1|2|3}
type Wins={cells:Set<string>,scatter:Set<string>,bonus:Set<string>,lines:{pts:{x:number,y:number}[]}[],t0:number,tier:string}
export type SuspenseKind='scatter'|'chest';
export interface SuspenseEvent{phase:'start'|'resolve'|'miss';kind:SuspenseKind;col:number;active:{scatter:boolean;chest:boolean}}

export class Reels{
 grid:SymbolId[][];cells:Cell[][];strips:Strip[]=[];
 private spinning?:{start:number,outcome:Outcome,displayed:SymbolId[][],resolve:()=>void,finish?:number,landedCount:number,quick:boolean,stag:number,V:number};
 private win?:Wins;private time=0;private reduced=false;readonly particles=new Particles(260);
 /** 0..1 energy added on big wins (glow intensity of outlines/lines) */
 energy=0;energyTarget=0;
 onLand:(col:number,anyScatter:boolean)=>void=()=>{};onAnticipate:(on:boolean)=>void=()=>{};onSuspense:(e:SuspenseEvent)=>void=()=>{};
 private susp={s:0,c:0};private suspT={s:0,c:0};private suspActive={s:false,c:false};private resolveFx={s:-9,c:-9};private sweep?:{t0:number,tone:string};
 constructor(private ctx:CanvasRenderingContext2D,private images:Record<SymbolId,HTMLImageElement>,initial:SymbolId[][]){
  this.grid=initial.map(c=>[...c]);this.cells=initial.map(c=>c.map(id=>({id,landed:-9,win:0 as const})));
  this.strips=Array.from({length:5},()=>({N:0,done:true,anticipate:false,pos:0,speed:0,start:0,kind:{s:false,c:false}}));
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 }
 get isSpinning(){return !!this.spinning;}
 get activeWinCells(){return this.win?.cells.size??0;}
 center(c:number,r:number){return {x:COL_CENTERS[c],y:ROW_CENTER0+r*ROW_PITCH};}
 clearWin(){this.win=undefined;for(const col of this.cells)for(const cell of col)cell.win=0;this.energyTarget=0;}
 // ---------------------------------------------------------------------------------------------------------------- plans
 private normalPlan(N:number,V:number,SET:number):Plan{const A=REEL_ANIM.accelSec,t0=(N-2.2)/V+A/2;
  return {N,end:t0+SET,at(tt){if(tt<A)return {pos:V*tt*tt/(2*A),speed:V*tt/A};if(tt<t0)return {pos:V*(tt-A/2),speed:V};const q=Math.min((tt-t0)/SET,1);return {pos:N-2.2+2.2*easeBack(q),speed:q<1?V*(1-q):0};}};}
 /** Suspense reel: same continuous motion, but the final deceleration is stretched (V → crawl → soft settle). Total distance is an exact integer so the reel stops on the target rows. */
 private anticPlan(V:number,tc0:number,quick:boolean,idx:number):Plan{
  const a=REEL_ANIM.anticipation,A=REEL_ANIM.accelSec,k=(quick?a.quickScale:1)*(a.reelScale[Math.min(idx,a.reelScale.length-1)]??1),Vs=a.crawlRowsPerSec,Td=a.decelSec*k,Tc0=a.crawlSec*k,SA=a.settleSec*(quick?.6:1);
  const tc=Math.max(tc0,A+.05),p1=V*(tc-A/2),d2=(V+Vs)/2*Td,ds=Vs*SA/EB0,N=Math.ceil(p1+d2+Vs*Tc0+ds),d3=N-p1-d2-ds,Tc=d3/Vs,t2=tc+Td,t3=t2+Tc;
  return {N,end:t3+SA,at(tt){
   if(tt<A)return {pos:V*tt*tt/(2*A),speed:V*tt/A};
   if(tt<tc)return {pos:V*(tt-A/2),speed:V};
   if(tt<t2){const u=tt-tc;return {pos:p1+V*u+(Vs-V)*u*u/(2*Td),speed:V+(Vs-V)*u/Td};}
   if(tt<t3)return {pos:p1+d2+Vs*(tt-t2),speed:Vs};
   const q=Math.min((tt-t3)/SA,1);return {pos:N-ds+ds*easeBack(q),speed:q<1?Vs*(1-q):0};}};
 }
 /** Which reels get a suspense phase. Looks ONLY at reels that are already revealed (columns < c) — never at column c itself. */
 private planSuspense(o:Outcome){
  const out:{s:boolean,c:boolean}[]=[];let S=0,C=0,used=0;const a=REEL_ANIM.anticipation;
  for(let c=0;c<5;c++){
   let s=a.enabled&&!this.reduced&&S===2,ch=a.enabled&&!this.reduced&&o.mode==='base'&&C===2;     // exactly 2 shown → a 3rd can still arrive; chest bonus exists only in the base game
   if((s||ch)&&used>=a.maxAnticipatedReels){s=false;ch=false;}if(s||ch)used++;
   out.push({s,c:ch});
   for(const id of o.grid[c]){if(id==='SCATTER')S++;else if(id==='CHEST_BONUS')C++;}
  }
  return out;
 }
 spin(outcome:Outcome,quick=false){
  if(this.spinning)throw new Error('Reels already spinning');
  // NOTE: nothing visible is touched here (no clearWin, no particle reset, no symbol swap): the grid on screen is the first part of every strip.
  const cfg=REEL_ANIM,V=cfg.rowsPerSec*(this.reduced?1.5:1)*(quick?cfg.quick.speed:1),stag=quick?cfg.quick.staggerSec:cfg.staggerSec,SET=quick?cfg.quick.settleSec:cfg.settleSec;
  const ant=this.planSuspense(outcome);let prevEnd=0;
  this.strips.forEach((st,c)=>{
   const baseRows=quick?cfg.quick.baseRows(c):cfg.baseRows(c);let plan:Plan,anticipate=ant[c].s||ant[c].c;
   if(anticipate)plan=this.anticPlan(V,prevEnd-c*stag,quick,ant.slice(0,c).filter(x=>x.s||x.c).length);else{plan=this.normalPlan(baseRows,V,SET);
    const endAbs=plan.end+c*stag;if(endAbs<prevEnd+.12)plan=this.normalPlan(baseRows+Math.ceil((prevEnd+.12-endAbs)*V),V,SET);}   // reels always stop left→right
   prevEnd=plan.end+c*stag;st.plan=plan;st.N=plan.N;st.anticipate=anticipate;st.kind=ant[c];st.done=false;st.pos=0;st.speed=0;
  });
  const displayed=this.cells.map(col=>col.map(c=>c.id));
  return new Promise<void>(resolve=>{this.spinning={start:this.time,outcome,displayed,resolve,landedCount:0,quick,stag,V};});
 }
 /** Highlight outcome wins (called after the reels land) */
 present(outcome:Outcome,tier:string){
  const cells=new Set<string>(),scatter=new Set<string>(),bonus=new Set<string>(),lines:{pts:{x:number,y:number}[]}[]=[];
  for(const w of outcome.evaluation.lineWins){const pts:{x:number,y:number}[]=[];for(let c=0;c<w.count;c++){const r=paylines[w.line-1][c];cells.add(`${c},${r}`);pts.push(this.center(c,r));}lines.push({pts});}
  if(outcome.evaluation.scatterAmount>0||outcome.evaluation.scatterCount>=3)this.cells.forEach((col,c)=>col.forEach((cell,r)=>{if(cell.id==='SCATTER'){cells.add(`${c},${r}`);scatter.add(`${c},${r}`);}}));
  if(outcome.evaluation.chestBonusCount>=3)this.cells.forEach((col,c)=>col.forEach((cell,r)=>{if(cell.id==='CHEST_BONUS'){cells.add(`${c},${r}`);bonus.add(`${c},${r}`);}}));
  this.cells.forEach((col,c)=>col.forEach((cell,r)=>{const k=`${c},${r}`;cell.win=cells.has(k)?(scatter.has(k)?2:bonus.has(k)?3:1):0;}));
  this.win={cells,scatter,bonus,lines,t0:this.time,tier};
  if(!this.reduced)for(const k of cells){const[c,r]=k.split(',').map(Number);const p=this.center(c,r);this.particles.emit(p.x,p.y,scatter.has(k)?'#d58cff':'#ffd36a',tier==='small'?8:16,170,30);}
  this.energyTarget=tier==='none'||tier==='small'?.15:tier==='medium'?.4:tier==='big'?.7:1;
 }
 // ------------------------------------------------------------------------------------------------------- suspense state
 private countVisible(id:SymbolId){let n=0;this.strips.forEach((st,c)=>{if(st.done)for(const cell of this.cells[c])if(cell.id===id)n++;});return n;}
 private afterLand(c:number){
  const nxt=c<4?this.strips[c+1]:undefined,now={s:!!nxt&&nxt.anticipate&&nxt.kind.s,c:!!nxt&&nxt.anticipate&&nxt.kind.c},was=this.suspActive,cnt={s:this.countVisible('SCATTER'),c:this.countVisible('CHEST_BONUS')};
  for(const k of ['s','c'] as const){
   const kind:SuspenseKind=k==='s'?'scatter':'chest';
   if(!was[k]&&now[k]){this.onSuspense({phase:'start',kind,col:c+1,active:{scatter:now.s,chest:now.c}});this.sweep={t0:this.time,tone:k==='s'?'purple':'gold'};}
   if(was[k]&&!now[k]){const hit=cnt[k]>=3;if(hit)this.resolveFx[k]=this.time;this.onSuspense({phase:hit?'resolve':'miss',kind,col:c,active:{scatter:now.s,chest:now.c}});
    if(hit&&!this.reduced)this.cells.forEach((col,cc)=>col.forEach((cell,r)=>{if(cell.id===(k==='s'?'SCATTER':'CHEST_BONUS')){const p=this.center(cc,r);this.particles.emit(p.x,p.y,k==='s'?'#c06cff':'#ffd36a',12,240,22);}}));}
   this.suspT[k]=now[k]?1:0;
  }
  this.suspActive=now;
 }
 private fade(col:number){const sp=this.spinning;if(!sp)return 1;const st=this.strips[col];if(st.done)return 0;return 1-clamp01((this.time-sp.start-col*sp.stag)/REEL_ANIM.carryFadeSec);}
 update(dt:number){
  this.time+=dt;this.energy+=(this.energyTarget-this.energy)*Math.min(1,dt*4);this.particles.update(dt);
  const A=REEL_ANIM.anticipation;for(const k of ['s','c'] as const){const up=1/A.glowRampSec,dn=1/A.fadeSec;this.susp[k]+=Math.max(-dt*dn,Math.min(dt*up,this.suspT[k]-this.susp[k]));}
  const sp=this.spinning;
  if(sp){const t=this.time-sp.start;let allDone=true;
   this.strips.forEach((st,c)=>{if(st.done)return;allDone=false;const tt=t-c*sp.stag;
    if(tt<=0){st.pos=0;st.speed=0;return;}
    const p=st.plan!.at(tt);st.pos=p.pos;st.speed=p.speed;
    if(tt>=st.plan!.end){st.done=true;st.pos=st.N;st.speed=0;sp.landedCount++;let sc=false;for(let r=0;r<3;r++){const id=sp.outcome.grid[c][r];const cell=this.cells[c][r];cell.id=id;cell.win=0;cell.landed=this.time;this.grid[c][r]=id;if(id==='SCATTER')sc=true;if(!this.reduced&&(id==='WILD'||id==='SCATTER')){const q=this.center(c,r);this.particles.emit(q.x,q.y,id==='WILD'?'#ffc844':'#d58cff',14,190,34);}}this.onLand(c,sc);this.afterLand(c);}
   });
   if(this.win&&t>REEL_ANIM.carryFadeSec+4*sp.stag+.05){this.win=undefined;this.energyTarget=0;}      // previous round's highlights are fully faded by now
   this.onAnticipate(this.suspActive.s||this.suspActive.c);
   if(allDone&&sp.finish===undefined)sp.finish=this.time+.3;
   if(sp.finish!==undefined&&this.time>=sp.finish){this.spinning=undefined;this.onAnticipate(false);sp.resolve();}
  }
 }
 private img(id:SymbolId){return this.images[id];}
 private drawSymbol(id:SymbolId,x:number,y:number,sx=1,sy=1,alpha=1){const s=SYMBOL_SIZE;const c=this.ctx;c.save();c.globalAlpha=alpha;c.translate(x,y);c.scale(sx,sy);c.drawImage(this.img(id),-s/2,-s/2,s,s);c.restore();}
 /** One cell with all its decoration. `fw`/`fa` fade the win-related / ambient decoration (1 = fully shown). `mv` = carried by a moving reel. */
 private drawCell(col:number,r:number,x:number,y:number,fw:number,fa:number,mv?:{sx:number,sy:number,alpha:number}){
  const c=this.ctx,t=this.time,cell=this.cells[col][r],r0=CELLS[col][r],dy0=y-this.center(col,r).y,rect={x:r0.x,y:r0.y+dy0,w:r0.w,h:r0.h};
  let sx=mv?.sx??1,sy=mv?.sy??1,dy=0,dx=0;
  if(!mv){const k=(t-cell.landed)/.34;if(k>=0&&k<1){const s=Math.sin(k*Math.PI);sy=1-.09*s;sx=1+.05*s;dy=4*s;}}
  const special=cell.id==='WILD'||cell.id==='SCATTER',isChest=cell.id==='CHEST_BONUS';
  const sS=cell.id==='SCATTER'?this.susp.s:0,sC=isChest?this.susp.c:0,hotS=cell.id==='SCATTER'?clamp01(1-(t-this.resolveFx.s)/REEL_ANIM.anticipation.flashSec):0,hotC=isChest?clamp01(1-(t-this.resolveFx.c)/REEL_ANIM.anticipation.flashSec):0;
  c.save();rrect(c,{x:rect.x-3,y:rect.y-3,w:rect.w+6,h:rect.h+6},16);c.clip();
  if((special||isChest)&&!this.reduced&&fa>0){const p=Math.sin(t*3+col*1.7);const col1=cell.id==='WILD'?'255,176,40':isChest?'255,92,34':'176,76,255';const g=c.createRadialGradient(x,y,6,x,y,rect.w*.62);g.addColorStop(0,`rgba(${col1},${(.45+.18*p)*fa})`);g.addColorStop(1,`rgba(${col1},0)`);c.fillStyle=g;c.fillRect(rect.x,rect.y,rect.w,rect.h);if(!mv){sx*=1+.03*p;sy*=1+.03*p;}}
  // suspense: progressive energy on the symbols that are waiting for their third (strength follows the real reveal state)
  if(sS>0||sC>0||hotS>0||hotC>0){const s=Math.max(sS,sC,hotS,hotC),pl=.78+.22*Math.sin(t*(this.reduced?2:8)+col),rgb=(sS>0||hotS>0)?'190,100,255':'255,200,70';
   const g=c.createRadialGradient(x,y,4,x,y,rect.w*.75);g.addColorStop(0,`rgba(${rgb},${Math.min(.95,(.55*s+.5*Math.max(hotS,hotC))*pl)})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(rect.x,rect.y,rect.w,rect.h);
   if(!this.reduced){sx*=1+.05*s*pl+.08*Math.max(hotS,hotC);sy*=1+.05*s*pl+.08*Math.max(hotS,hotC);if(sC>0)dx=Math.sin(t*62+col*2+r)*1.8*sC;}}
  let pulse=0;
  if(cell.win&&this.win&&fw>0){pulse=Math.sin((t-this.win.t0)*6.5);if(!this.reduced){sx*=1+(.05+.035*pulse)*fw;sy*=1+(.05+.035*pulse)*fw;}
   const g=c.createRadialGradient(x,y,6,x,y,rect.w*.7);const rgb=cell.win===2?'190,90,255':cell.win===3?'255,74,38':'255,190,60';g.addColorStop(0,`rgba(${rgb},${(.5+.25*pulse+.2*this.energy)*fw})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(rect.x,rect.y,rect.w,rect.h);}
  this.drawSymbol(cell.id,x+dx,y+dy,sx,sy,mv?.alpha??1);
  // Magic Book (ordinary CHEST id) taking part in a REAL winning line: refined sweep of light + violet/gold bloom
  if(SYMBOL_ART[cell.id]?.file==='magic-book'&&cell.win===1&&this.win&&fw>0&&!this.reduced){const ph=((t-this.win.t0)*.85)%1.7,gx=rect.x-rect.w*.4+ph*rect.w*1.4;const g=c.createLinearGradient(gx,rect.y,gx+rect.w*.45,rect.y+rect.h);g.addColorStop(0,'rgba(255,240,190,0)');g.addColorStop(.5,`rgba(255,236,170,${.42*fw})`);g.addColorStop(1,'rgba(255,240,190,0)');c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(rect.x,rect.y,rect.w,rect.h);c.restore();
   const g2=c.createRadialGradient(x,y,10,x,y,rect.w*.72);g2.addColorStop(0,`rgba(210,120,255,${.28*fw*(.7+.3*pulse)})`);g2.addColorStop(1,'rgba(210,120,255,0)');c.fillStyle=g2;c.fillRect(rect.x,rect.y,rect.w,rect.h);
   if(Math.random()<.06)this.particles.emit(x+(Math.random()-.5)*rect.w*.7,y+(Math.random()-.5)*rect.h*.7,Math.random()<.5?'#ffe08a':'#e0a8ff',1,40,18,{up:40,gravity:-20,star:true});}
  if(this.win&&this.win.cells.size&&!cell.win&&fw>0){c.fillStyle=`rgba(10,3,24,${.5*fw})`;c.fillRect(rect.x,rect.y,rect.w,rect.h);}
  c.restore();
  // outlines: animated gold (or violet) frame with glow
  const sus=Math.max(sS,sC,hotS,hotC);
  if(cell.win||special||isChest||sus>0){
   const rgb=(cell.win===2||cell.id==='SCATTER')?'#c06cff':(cell.win===3||isChest)?(sC>0||hotC>0?'#ffc83a':'#ff5c31'):'#ffbe2e';const hi=(cell.win===2||cell.id==='SCATTER')?'#f2d4ff':'#fff2b0';
   const a=(cell.win?(.8+.2*pulse)*fw:(.45+.25*Math.sin(t*3+col*1.7))*fa)+.55*sus;
   c.save();rrect(c,{x:rect.x+3+dx,y:rect.y+3,w:rect.w-6,h:rect.h-6},14);c.shadowColor=rgb;c.shadowBlur=14+12*this.energy+22*sus;c.globalAlpha=Math.max(0,Math.min(1,a));c.lineWidth=cell.win?5:3+3*sus;c.strokeStyle=rgb;c.stroke();c.shadowBlur=0;c.lineWidth=1.6+1.4*sus;c.strokeStyle=hi;c.stroke();c.restore();}
 }
 draw(){
  const c=this.ctx,t=this.time;
  const sp=this.spinning,top=CELLS[0][0].y,bottom=CELLS[0][2].y+CELLS[0][2].h;
  for(let col=0;col<5;col++){
   const st=this.strips[col],win=CELLS[col][0];
   if(sp&&!st.done&&st.pos>0){
    // ---- moving reel: continuous strip = displayed column → cosmetic → target column
    c.save();c.beginPath();c.rect(win.x,top,win.w,bottom-top);c.clip();
    const base=Math.floor(st.pos),frac=st.pos-base,stretch=1+Math.min(.16,st.speed/130),fw=this.fade(col);
    const tint=st.anticipate?(st.kind.s&&st.kind.c?'dual':st.kind.s?'purple':'gold'):'';
    if(tint){const sA=Math.max(this.susp.s,this.susp.c);if(sA>0){const a=(.2+.1*Math.sin(t*(this.reduced?2:9)))*sA,g=c.createLinearGradient(0,top,0,bottom);
      if(tint==='purple'){g.addColorStop(0,`rgba(200,90,255,${a})`);g.addColorStop(1,`rgba(120,40,200,${a})`);}else if(tint==='gold'){g.addColorStop(0,`rgba(255,214,90,${a})`);g.addColorStop(1,`rgba(255,140,30,${a})`);}else{g.addColorStop(0,`rgba(200,90,255,${a})`);g.addColorStop(1,`rgba(255,190,60,${a})`);}
      c.fillStyle=g;c.fillRect(win.x,top,win.w,bottom-top);}}
    for(let i=0;i<5;i++){const r=i-1,n=base-r,y=ROW_CENTER0+(r+frac)*ROW_PITCH,sxv=1-Math.min(.05,st.speed/420),alpha=st.speed>12?.92:1;
     if(n<=0&&n>-3)this.drawCell(col,-n,COL_CENTERS[col],y,fw,fw,{sx:sxv,sy:stretch,alpha});                      // carried: the grid that was on screen at SPIN time
     else{const id=(n<=st.N&&n>st.N-3)?sp.outcome.grid[col][st.N-n]:ORDINARY[Math.floor(hash(n*13.7+col*5.3+sp.outcome.stops[col])*ORDINARY.length)]!;
      this.drawSymbol(id,COL_CENTERS[col],y,sxv,stretch,alpha);}}
    c.restore();
    if(st.anticipate&&!this.reduced&&Math.random()<.5){const sA=Math.max(this.susp.s,this.susp.c);if(sA>.2){const purple=st.kind.s&&(!st.kind.c||Math.random()<.5);this.particles.emit(COL_CENTERS[col]+(Math.random()-.5)*win.w*.7,bottom-Math.random()*(bottom-top),purple?'#c690ff':'#ffd36a',1,50,24,{up:90,gravity:-60});}}
    continue;
   }
   // ---- settled cells (also: a reel that has not started moving yet shows exactly what was on screen)
   const fw=this.fade(col);
   for(let r=0;r<3;r++){const {x,y}=this.center(col,r);this.drawCell(col,r,x,y,sp?fw:1,sp?Math.max(fw,0):1);}
  }
  // ---- suspense sweep: a band of light crossing the reels when the suspense starts
  if(this.sweep&&!this.reduced){const k=(t-this.sweep.t0)/.55;if(k>=0&&k<1){const x0=PLAY_AREA.x-120+k*(PLAY_AREA.w+240),g=c.createLinearGradient(x0-110,0,x0+110,0),rgb=this.sweep.tone==='purple'?'190,100,255':'255,200,80',a=.34*Math.sin(Math.PI*k);g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(.5,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);c.save();c.beginPath();c.rect(PLAY_AREA.x,PLAY_AREA.y,PLAY_AREA.w,PLAY_AREA.h);c.clip();c.fillStyle=g;c.fillRect(x0-110,PLAY_AREA.y,220,PLAY_AREA.h);c.restore();}else if(k>=1)this.sweep=undefined;}
  // ---- payline indication (draw-in, one line at a time; glow scales with win energy). Fades out over the first frames of the next spin.
  const lineFade=sp?1-clamp01((t-sp.start)/REEL_ANIM.carryFadeSec):1;
  if(this.win&&this.win.lines.length&&lineFade>0){const w=this.win,ts=t-w.t0,per=1.15,show=w.lines.length===1?0:Math.floor(ts/per)%w.lines.length,p=Math.min(1,(ts%per)/.5);
   const line=w.lines[w.lines.length===1?0:show];const pts=line.pts;
   c.save();c.globalAlpha=lineFade;c.beginPath();c.rect(PLAY_AREA.x,PLAY_AREA.y,PLAY_AREA.w,PLAY_AREA.h);c.clip();c.lineCap='round';c.lineJoin='round';
   const total=pts.slice(1).reduce((s,q,i)=>s+Math.hypot(q.x-pts[i].x,q.y-pts[i].y),0);let remain=total*(w.lines.length===1?Math.min(1,ts/.5):p);
   const path=new Path2D();path.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length&&remain>0;i++){const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y),f=Math.min(1,remain/d);path.lineTo(pts[i-1].x+(pts[i].x-pts[i-1].x)*f,pts[i-1].y+(pts[i].y-pts[i-1].y)*f);remain-=d;}
   c.shadowColor='#ff9a1e';c.shadowBlur=18+14*this.energy;c.strokeStyle='rgba(255,150,30,.55)';c.lineWidth=14;c.stroke(path);c.shadowBlur=8;c.strokeStyle='#fff3bd';c.lineWidth=5;c.stroke(path);c.restore();
   if(!sp&&!this.reduced&&Math.random()<.35){const q=pts[Math.floor(Math.random()*pts.length)];this.particles.emit(q.x,q.y,'#ffd36a',1,60,22,{up:60,gravity:-30});}
  }
  // particles clipped to the play area
  c.save();c.beginPath();c.rect(PLAY_AREA.x-30,PLAY_AREA.y-30,PLAY_AREA.w+60,PLAY_AREA.h+60);c.clip();this.particles.draw(c);c.restore();
 }
}
