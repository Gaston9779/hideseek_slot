import type {SymbolId} from '../config/game';
import {paylines} from '../config/game';
import type {Outcome} from '../math/slot';
import {CELLS,COL_CENTERS,ROW_CENTER0,ROW_PITCH,SYMBOL_SIZE,PLAY_AREA,type Rect} from '../layout';
import {Particles} from './particles';

const FILLER:SymbolId[]=['TOMB','LANTERN','CHEST','POTION','KEY','GHOST','MAUSOLEUM','BLASTER','SKULL','GARGOYLE','WILD','SCATTER','CHEST_BONUS','TOMB','LANTERN','CHEST','POTION','KEY','GHOST'];
const hash=(n:number)=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
const easeBack=(q:number)=>{const c1=1.15,c3=c1+1;return 1+c3*Math.pow(q-1,3)+c1*Math.pow(q-1,2);};
const rrect=(c:CanvasRenderingContext2D,r:Rect,rad:number)=>{c.beginPath();c.roundRect(r.x,r.y,r.w,r.h,rad);};
const REEL_V=19; // rows per second at full speed

interface Strip{N:number,done:boolean,anticipate:boolean,pos:number,speed:number,start:number}
interface Cell{id:SymbolId,landed:number,win:0|1|2|3}
type Wins={cells:Set<string>,scatter:Set<string>,bonus:Set<string>,lines:{pts:{x:number,y:number}[]}[],t0:number,tier:string}

export class Reels{
 grid:SymbolId[][];cells:Cell[][];strips:Strip[]=[];
 private spinning?:{start:number,outcome:Outcome,resolve:()=>void,finish?:number,landedCount:number,quick?:boolean};
 private win?:Wins;private time=0;private reduced=false;readonly particles=new Particles(220);
 /** 0..1 energy added on big wins (glow intensity of outlines/lines) */
 energy=0;energyTarget=0;onLand:(col:number,anyScatter:boolean)=>void=()=>{};onAnticipate:(on:boolean)=>void=()=>{};
 constructor(private ctx:CanvasRenderingContext2D,private images:Record<SymbolId,HTMLImageElement>,initial:SymbolId[][]){
  this.grid=initial.map(c=>[...c]);this.cells=initial.map(c=>c.map(id=>({id,landed:-9,win:0 as const})));
  this.strips=Array.from({length:5},()=>({N:0,done:true,anticipate:false,pos:0,speed:0,start:0}));
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 }
 get isSpinning(){return !!this.spinning;}
 get activeWinCells(){return this.win?.cells.size??0;}
 center(c:number,r:number){return {x:COL_CENTERS[c],y:ROW_CENTER0+r*ROW_PITCH};}
 clearWin(){this.win=undefined;for(const col of this.cells)for(const cell of col)cell.win=0;this.energyTarget=0;}
 spin(outcome:Outcome,quick=false){
  if(this.spinning)throw new Error('Reels already spinning');this.clearWin();this.particles.clear();
  // anticipation: with 2+ scatters on the stopped reels, later reels spin longer (presentation only)
  let sc=0,extra=0;
  this.strips.forEach((st,c)=>{const ant=c>=2&&sc>=2;if(ant)extra+=9;st.anticipate=ant;st.N=quick?8+c*2+Math.round(extra*.4):15+c*4+extra;st.done=false;st.pos=0;st.speed=0;sc+=outcome.grid[c].filter(x=>x==='SCATTER').length;});
  return new Promise<void>(resolve=>{this.spinning={start:this.time,outcome,resolve,landedCount:0,quick};});
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
 update(dt:number){
  this.time+=dt;this.energy+=(this.energyTarget-this.energy)*Math.min(1,dt*4);this.particles.update(dt);
  const sp=this.spinning;
  if(sp){const t=this.time-sp.start;const V=REEL_V*(this.reduced?1.5:1)*(sp.quick?1.7:1),SET=sp.quick?.3:.5,STAG=sp.quick?.03:.07;let allDone=true;
   this.strips.forEach((st,c)=>{if(st.done)return;allDone=false;const tt=t-c*STAG;
    if(tt<=0){st.pos=0;st.speed=0;return;}
    const t0=(st.N-2.2)/V+.09;
    if(tt<.18){st.pos=V*tt*tt/(2*.18);st.speed=V*tt/.18;}
    else if(tt<t0){st.pos=V*(tt-.09);st.speed=V;}
    else{const q=Math.min((tt-t0)/SET,1);st.pos=st.N-2.2+2.2*easeBack(q);st.speed=q<1?V*(1-q):0;}
    if(tt>=t0+SET){st.done=true;st.pos=st.N;st.speed=0;sp.landedCount++;let sc=false;for(let r=0;r<3;r++){const id=sp.outcome.grid[c][r];this.cells[c][r].id=id;this.cells[c][r].landed=this.time;this.grid[c][r]=id;if(id==='SCATTER')sc=true;if(!this.reduced&&(id==='WILD'||id==='SCATTER')){const p=this.center(c,r);this.particles.emit(p.x,p.y,id==='WILD'?'#ffc844':'#d58cff',14,190,34);}}this.onLand(c,sc);}
   });
   this.onAnticipate(this.strips.some(s=>!s.done&&s.anticipate&&t>1));
   if(allDone&&sp.finish===undefined)sp.finish=this.time+.3;
   if(sp.finish!==undefined&&this.time>=sp.finish){this.spinning=undefined;this.onAnticipate(false);sp.resolve();}
  }
 }
 private img(id:SymbolId){return this.images[id];}
 private drawSymbol(id:SymbolId,x:number,y:number,sx=1,sy=1,alpha=1){const s=SYMBOL_SIZE;const c=this.ctx;c.save();c.globalAlpha=alpha;c.translate(x,y);c.scale(sx,sy);c.drawImage(this.img(id),-s/2,-s/2,s,s);c.restore();}
 draw(){
  const c=this.ctx,t=this.time;
  // ---- spinning strips (clipped to each column window)
  const sp=this.spinning;
  for(let col=0;col<5;col++){
   const st=this.strips[col],win=CELLS[col][0];
   if(sp&&!st.done){
    c.save();c.beginPath();c.rect(win.x,CELLS[0][0].y,win.w,CELLS[0][2].y+CELLS[0][2].h-CELLS[0][0].y);c.clip();
    if(st.anticipate&&this.time-sp.start>1){const g=c.createLinearGradient(0,CELLS[0][0].y,0,CELLS[0][2].y+CELLS[0][2].h);const a=.22+.12*Math.sin(t*10);g.addColorStop(0,`rgba(200,90,255,${a})`);g.addColorStop(1,`rgba(120,40,200,${a})`);c.fillStyle=g;c.fillRect(win.x,CELLS[0][0].y,win.w,900);}
    const base=Math.floor(st.pos),frac=st.pos-base;const stretch=1+Math.min(.16,st.speed/130);
    for(let i=0;i<5;i++){const r=i-1,n=base-r;const id=(n<=st.N&&n>st.N-3)?sp.outcome.grid[col][st.N-n]:FILLER[Math.floor(hash(n*13.7+col*5.3+sp.outcome.stops[col])*FILLER.length)];
     this.drawSymbol(id,COL_CENTERS[col],ROW_CENTER0+(r+frac)*ROW_PITCH,1-Math.min(.05,st.speed/420),stretch,st.speed>12?.92:1);}
    c.restore();
    continue;
   }
   // ---- settled cells
   for(let r=0;r<3;r++){
    const cell=this.cells[col][r],rect=CELLS[col][r],{x,y}=this.center(col,r);
    let sx=1,sy=1,dy=0;const k=(t-cell.landed)/.34;if(k>=0&&k<1){const s=Math.sin(k*Math.PI);sy=1-.09*s;sx=1+.05*s;dy=4*s;}
    const special=cell.id==='WILD'||cell.id==='SCATTER';
    c.save();rrect(c,{x:rect.x-3,y:rect.y-3,w:rect.w+6,h:rect.h+6},16);c.clip();
    if((special||cell.id==='CHEST_BONUS')&&!this.reduced){const p=Math.sin(t*3+col*1.7);const col1=cell.id==='WILD'?'255,176,40':cell.id==='CHEST_BONUS'?'255,92,34':'176,76,255';const g=c.createRadialGradient(x,y,6,x,y,rect.w*.62);g.addColorStop(0,`rgba(${col1},${.45+.18*p})`);g.addColorStop(1,`rgba(${col1},0)`);c.fillStyle=g;c.fillRect(rect.x,rect.y,rect.w,rect.h);sx*=1+.03*p;sy*=1+.03*p;}
    let pulse=0;if(cell.win&&this.win){pulse=Math.sin((t-this.win.t0)*6.5);if(!this.reduced){sx*=1.05+.035*pulse;sy*=1.05+.035*pulse;}
     const g=c.createRadialGradient(x,y,6,x,y,rect.w*.7);const rgb=cell.win===2?'190,90,255':cell.win===3?'255,74,38':'255,190,60';g.addColorStop(0,`rgba(${rgb},${.5+.25*pulse+.2*this.energy})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(rect.x,rect.y,rect.w,rect.h);}
    this.drawSymbol(cell.id,x,y+dy,sx,sy);
    if(this.win&&this.win.cells.size&&!cell.win){c.fillStyle='rgba(10,3,24,.5)';c.fillRect(rect.x,rect.y,rect.w,rect.h);}
    c.restore();
    // outlines: animated gold (or violet) frame with glow
    if(cell.win||special||cell.id==='CHEST_BONUS'){
     const rgb=(cell.win===2||cell.id==='SCATTER')?'#c06cff':(cell.win===3||cell.id==='CHEST_BONUS')?'#ff5c31':'#ffbe2e';const hi=(cell.win===2||cell.id==='SCATTER')?'#f2d4ff':'#fff2b0';
     const a=cell.win?.8+.2*pulse:.45+.25*Math.sin(t*3+col*1.7);
     c.save();rrect(c,{x:rect.x+3,y:rect.y+3,w:rect.w-6,h:rect.h-6},14);c.shadowColor=rgb;c.shadowBlur=14+12*this.energy;c.globalAlpha=Math.max(0,a);c.lineWidth=cell.win?5:3;c.strokeStyle=rgb;c.stroke();c.shadowBlur=0;c.lineWidth=1.6;c.strokeStyle=hi;c.stroke();c.restore();}
   }
  }
  // ---- payline indication (draw-in, one line at a time; glow scales with win energy)
  if(this.win&&this.win.lines.length&&!sp){const w=this.win,ts=t-w.t0,per=1.15,show=w.lines.length===1?0:Math.floor(ts/per)%w.lines.length,p=Math.min(1,(ts%per)/.5);
   const line=w.lines[w.lines.length===1?0:show];const pts=line.pts;
   c.save();c.beginPath();c.rect(PLAY_AREA.x,PLAY_AREA.y,PLAY_AREA.w,PLAY_AREA.h);c.clip();c.lineCap='round';c.lineJoin='round';
   const total=pts.slice(1).reduce((s,q,i)=>s+Math.hypot(q.x-pts[i].x,q.y-pts[i].y),0);let remain=total*(w.lines.length===1?Math.min(1,ts/.5):p);
   const path=new Path2D();path.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length&&remain>0;i++){const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y),f=Math.min(1,remain/d);path.lineTo(pts[i-1].x+(pts[i].x-pts[i-1].x)*f,pts[i-1].y+(pts[i].y-pts[i-1].y)*f);remain-=d;}
   c.shadowColor='#ff9a1e';c.shadowBlur=18+14*this.energy;c.strokeStyle='rgba(255,150,30,.55)';c.lineWidth=14;c.stroke(path);c.shadowBlur=8;c.strokeStyle='#fff3bd';c.lineWidth=5;c.stroke(path);c.restore();
   if(!this.reduced&&Math.random()<.35){const q=pts[Math.floor(Math.random()*pts.length)];this.particles.emit(q.x,q.y,'#ffd36a',1,60,22,{up:60,gravity:-30});}
  }
  // particles clipped to the play area
  c.save();c.beginPath();c.rect(PLAY_AREA.x-30,PLAY_AREA.y-30,PLAY_AREA.w+60,PLAY_AREA.h+60);c.clip();this.particles.draw(c);c.restore();
 }
}
