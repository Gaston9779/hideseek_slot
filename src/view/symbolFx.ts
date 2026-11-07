import {SYMBOL_SIZE} from '../layout';
import type {Particles} from './particles';

/**
 * Symbol animation for WILD / SCATTER / CHEST_BONUS — presentation only.
 * The reel symbols are drawn on the reels canvas, so the animation lives where the real symbol is drawn: the original PNG is always drawn first (never modified),
 * then derived layers (assets-2d/symbols/layers, same 512px grid) are composed on top with additive light, a head overlay (WILD) and transforms.
 * Reels tells this module the state of each landed cell (idle / anticipation / trigger); nothing here reads the engine, the outcome or the RNG.
 */
export type FxState='off'|'idle'|'anticipation'|'trigger';
export type FxSym='WILD'|'SCATTER'|'CHEST_BONUS';
export const isFxSymbol=(id:string):id is FxSym=>id==='WILD'||id==='SCATTER'||id==='CHEST_BONUS';
export const LAYER_FILES={wildHead:'wild-head',wildEyes:'wild-eyes',wildGold:'wild-gold',scDoor:'scatter-door',scFlames:'scatter-flames',chGold:'chest-gold'} as const;
export type FxLayers=Record<keyof typeof LAYER_FILES,CanvasImageSource>;
export interface CellFx{st:FxState;id:string;t0:number}

const K=SYMBOL_SIZE/512,TAU=Math.PI*2;
const cl=(x:number)=>Math.max(0,Math.min(1,x)),ease=(x:number)=>x*x*(3-2*x),pw=(x:number,p:number)=>Math.pow(Math.max(0,x),p);
/** Trigger lasts ~1.35 s, then the symbol keeps a calm "hot" look for as long as the win highlight stays. */
export const TRIGGER_SEC=1.35;
export const trigEnv=(tt:number)=>tt<.35?ease(tt/.35):tt<.85?1:1-.65*ease(cl((tt-.85)/.5));

// ---------------------------------------------------------------------------------------------------------------- poses (pure, unit-tested)
export interface WildPose{scale:number;rot:number;dy:number;eyes:number;aura:number;ring:number;sheen:number;flash:number}
/** `tt` = seconds in the current state, `T` = global clock (phase-shifted per cell by the caller). Head scale never drops below 1.03 (it always covers the original head underneath). */
export function wildPose(st:FxState,tt:number,T:number):WildPose{
 const e=st==='trigger'?trigEnv(tt):0,a=st==='anticipation'?1:0;
 return {
  scale:1.036+.012*Math.sin(T*1.7)+.09*e+.02*a,rot:.016*Math.sin(T*1.15)+.02*e*Math.sin(tt*16),dy:-1.4*(.5+.5*Math.sin(T*1.15+.6))-2.4*e,
  eyes:Math.min(1,.12+.88*pw(Math.sin(T*1.25),10)+.6*a+(st==='trigger'?.25+.75*e:0)),
  aura:.32+.14*Math.sin(T*2)+.5*e+.25*a,
  ring:st==='trigger'&&tt>.3&&tt<1.2?(tt-.3)/.9:a?(T*.9)%1:-1,
  sheen:((T*.42)%1.7)-.35,flash:st==='trigger'?pw(1-Math.abs(tt-.32)/.2,1):0};
}
export interface ScatterPose{breath:number;door:number;flames:[number,number];mist:number;ring:number;flash:number;spark:number}
export function scatterPose(st:FxState,tt:number,T:number):ScatterPose{
 const e=st==='trigger'?trigEnv(tt):0,a=st==='anticipation'?1:0,ramp=a?.55+.45*cl(tt/.8):0;
 const fl=(i:number)=>.55+.3*Math.sin(T*7+i*1.9)+.15*Math.sin(T*13+i*3.1);
 return {
  breath:1+.012*Math.sin(T*1.4)+a*.05*ramp*Math.sin(T*8)+.05*e,
  door:Math.min(1.25,.5+.2*Math.sin(T*2.3)+.12*Math.sin(T*5.7+1)+.08*Math.sin(T*11.3)+a*(.35*ramp+.2*Math.sin(T*9))+.7*e),
  flames:[fl(0)+.3*a+.4*e,fl(1)+.3*a+.4*e],mist:.35+.45*a*ramp+.4*e,
  ring:st==='trigger'&&tt<1.1?tt/1.1:a?(T*1.3)%1:-1,flash:st==='trigger'?pw(1-tt/.55,1.4):0,spark:st==='trigger'?(tt<.6?26:6):a?14:3.5};
}
export interface ChestPose{dx:number;rot:number;dy:number;sy:number;seam:number;sweep:number;beam:number;flash:number;spark:number;ring:number}
export function chestPose(st:FxState,tt:number,T:number):ChestPose{
 const a=st==='anticipation'?1:0,ramp=a?cl(tt/1.2):0,ph=(T*.31)%1,idleBurst=st==='idle'&&ph<.14?Math.sin(ph/.14*Math.PI):0;
 const shake=idleBurst*1+a*(.55+.45*ramp);let dy=0,sy=1,beam=0,flash=0,e=0;
 if(st==='trigger'){e=trigEnv(tt);
  if(tt<.12){sy=1-.1*ease(tt/.12);}else if(tt<.5){const u=(tt-.12)/.38;dy=-17*Math.sin(Math.PI*u);sy=.9+.1*ease(Math.min(1,u*2))+.06*Math.sin(Math.PI*u);}
  else if(tt<.68){sy=.94+.06*ease((tt-.5)/.18);}
  beam=tt>.12?cl((tt-.12)/.2)*(1-ease(cl((tt-.9)/.45)))*1:0;flash=pw(1-Math.abs(tt-.16)/.22,1);}
 return {
  dx:Math.sin(T*72)*(1.3*shake+(st==='trigger'&&tt<.9?1.6*(1-tt/.9):0)),rot:Math.sin(T*61)*.014*shake,dy,sy,
  seam:Math.min(1.25,.35+.22*Math.sin(T*2.1)+a*(.35*ramp+.2*Math.sin(T*10))+.75*e),
  sweep:((T*.38)%1.6)-.3,beam,flash,spark:st==='trigger'?(tt<.8?30:8):a?12:2.2,ring:st==='trigger'&&tt>.12&&tt<1?(tt-.12)/.88:a?(T*1.1)%1:-1};
}

// ---------------------------------------------------------------------------------------------------------------- renderer
type Ctx=CanvasRenderingContext2D;
interface Queued{x:number;y:number;id:FxSym;fx:CellFx;T:number;pose:ChestPose|ScatterPose|WildPose}
export class SymbolAnimator{
 private oc:HTMLCanvasElement;private o:Ctx;private q:Queued[]=[];private last=new Map<string,number>();private fired=new Map<string,number>();private acc=new Map<string,number>();
 constructor(private L:FxLayers,private parts:Particles,private reduced=false){this.oc=document.createElement('canvas');this.oc.width=this.oc.height=256;this.o=this.oc.getContext('2d')!;}
 begin(){this.q.length=0;}
 /** Mask layer tinted + composed additively. Art space (origin = symbol centre, unit = 1 art px). `src` limits the mask to a sub-rectangle (individual flames). */
 private mask(c:Ctx,m:CanvasImageSource,a:number,paint:(o:Ctx)=>void,src?:[number,number,number,number]){
  if(a<=.01)return;const o=this.o;o.globalCompositeOperation='source-over';o.clearRect(0,0,256,256);
  if(src)o.drawImage(m,src[0],src[1],src[2],src[3],src[0]/2,src[1]/2,src[2]/2,src[3]/2);else o.drawImage(m,0,0,256,256);
  o.globalCompositeOperation='source-in';paint(o);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,a);c.drawImage(this.oc,-256,-256,512,512);c.restore();
 }
 private glow(c:Ctx,cx:number,cy:number,r:number,rgb:string,a:number){if(a<=.01)return;const g=c.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(${rgb},${Math.min(1,a)})`);g.addColorStop(1,`rgba(${rgb},0)`);c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(cx-r,cy-r,r*2,r*2);c.restore();}
 private emit(key:string,T:number,rate:number,x:number,y:number,ax:number,ay:number,jx:number,color:string,opt:{up?:number;gravity?:number;size?:number;speed?:number}={}){
  const dt=Math.min(.05,T-(this.last.get('e'+key)??T));this.last.set('e'+key,T);if(this.parts.count>190)return;
  let n=(this.acc.get(key)??0)+rate*dt;const whole=Math.floor(n);this.acc.set(key,n-whole);
  for(let i=0;i<whole;i++)this.parts.emit(x+(ax-256+(Math.random()-.5)*jx)*K,y+(ay-256)*K,color,1,opt.speed??34,opt.size??15,{up:opt.up??55,gravity:opt.gravity??-30,star:true});
 }
 private burstOnce(key:string,fx:CellFx,at:number,tt:number,fn:()=>void){if(tt>=at&&this.fired.get(key)!==fx.t0){this.fired.set(key,fx.t0);fn();}}
 /** Draw one animated symbol at (x,y) with the transform the reel already computed. */
 draw(c:Ctx,id:FxSym,img:CanvasImageSource,x:number,y:number,sx:number,sy:number,alpha:number,fx:CellFx,T:number,key:string){
  const tt=Math.max(0,T-fx.t0),Tc=T+(key.charCodeAt(0)+key.charCodeAt(2))*.9,L=this.L;
  c.save();c.globalAlpha=alpha;c.translate(x,y);
  if(id==='WILD'){
   const p=wildPose(fx.st,tt,Tc);
   c.save();c.scale(sx*K,sy*K);                                   // energy passing behind the skull: rotating rays + violet/gold halo
   c.save();c.globalCompositeOperation='lighter';c.rotate(T*.45);for(let i=0;i<3;i++){c.rotate(TAU/3);const g=c.createLinearGradient(0,0,0,-250);g.addColorStop(0,`rgba(190,110,255,${.34*p.aura})`);g.addColorStop(1,'rgba(255,200,90,0)');c.fillStyle=g;c.beginPath();c.moveTo(-34,0);c.lineTo(34,0);c.lineTo(10,-250);c.lineTo(-10,-250);c.fill();}c.restore();
   this.glow(c,0,-30,230,'190,110,255',.45*p.aura);this.glow(c,0,-40,150,'255,196,80',.25*p.aura);c.restore();
   c.scale(sx*K,sy*K);c.drawImage(img,-256,-256,512,512);
   this.mask(c,L.wildGold,fx.st==='idle'?.55:.75,o=>{const g=o.createLinearGradient(p.sheen*256/1.2-40,0,p.sheen*256/1.2+40,0);g.addColorStop(0,'rgba(255,240,180,0)');g.addColorStop(.5,'rgba(255,252,225,1)');g.addColorStop(1,'rgba(255,240,180,0)');o.fillStyle=g;o.fillRect(0,0,256,256);});
   c.save();c.translate(0,70);c.rotate(p.rot);c.scale(p.scale,p.scale);c.translate(0,p.dy-70);   // head: independent motion, pivot on the chin line (y=326 of 512)
   c.drawImage(L.wildHead,-256,-256,512,512);
   this.mask(c,L.wildEyes,p.eyes*1.25,o=>{const g=o.createRadialGradient(128,125,0,128,125,70);g.addColorStop(0,'#fff6d0');g.addColorStop(.45,'#ffb938');g.addColorStop(1,'#b45cff');o.fillStyle=g;o.fillRect(0,0,256,256);});
   this.glow(c,-74,-6,60,'255,170,60',.5*p.eyes);this.glow(c,66,-6,60,'255,170,60',.5*p.eyes);c.restore();
   c.restore();
   this.sparksWild(key,T,x,y,fx,tt);
   this.q.push({x,y,id,fx,T,pose:p});
   return;
  }
  if(id==='SCATTER'){
   const p=scatterPose(fx.st,tt,Tc);
   this.glow(c,0,5,120,fx.st==='anticipation'?'190,100,255':'255,150,50',.2+.3*p.mist);
   c.scale(sx*K*p.breath,sy*K*p.breath);c.drawImage(img,-256,-256,512,512);
   this.glow(c,0,34,130,'255,170,60',.55*p.door);                                       // warm light spilling from the entrance
   this.mask(c,L.scDoor,p.door,o=>{o.fillStyle='#ffe2a0';o.fillRect(0,0,256,256);});
   this.mask(c,L.scFlames,p.flames[0],o=>{o.fillStyle='#ffd070';o.fillRect(0,0,256,256);},[40,240,100,110]);
   this.mask(c,L.scFlames,p.flames[1],o=>{o.fillStyle='#ffd070';o.fillRect(0,0,256,256);},[400,240,80,110]);
   this.glow(c,-171,37,34,'255,160,50',.5*p.flames[0]);this.glow(c,164,37,34,'255,160,50',.5*p.flames[1]);
   c.save();c.globalCompositeOperation='lighter';for(let i=0;i<2;i++){const ph=Math.sin(Tc*(.5+i*.23)+i*2.4);const g=c.createRadialGradient(ph*70,150+i*10,0,ph*70,150+i*10,130);g.addColorStop(0,`rgba(170,90,255,${.3*p.mist})`);g.addColorStop(1,'rgba(170,90,255,0)');c.fillStyle=g;c.fillRect(-256,40,512,200);}c.restore();   // violet mist
   if(p.flash>0)this.glow(c,0,34,260,'255,224,150',.85*p.flash);
   c.restore();
   this.emit(key+'m',T,p.spark,x,y,256,300,60,fx.st==='anticipation'?'#c690ff':'#ffd89a',{up:62,gravity:-40});
   this.burstOnce('b'+key,fx,0,tt,()=>{if(fx.st==='trigger'){this.parts.emit(x,y+8,'#ffd36a',16,260,30,{up:120,gravity:-60,star:true});this.parts.emit(x,y+8,'#c06cff',12,220,28,{up:90,gravity:-40,star:true});}});
   this.q.push({x,y,id,fx,T,pose:p});return;
  }
  const p=chestPose(fx.st,tt,Tc);
  c.translate(p.dx,p.dy);c.rotate(p.rot);c.scale(sx*K,sy*K*p.sy);
  this.glow(c,0,-9,230,'255,170,40',.3*p.seam);
  c.drawImage(img,-256,-256,512,512);
  this.glow(c,0,-9,210,'255,196,70',.42*p.seam);
  c.save();c.globalCompositeOperation='lighter';{const g=c.createLinearGradient(-200,0,200,0);g.addColorStop(0,'rgba(255,190,60,0)');g.addColorStop(.5,`rgba(255,240,170,${Math.min(1,.85*p.seam)})`);g.addColorStop(1,'rgba(255,190,60,0)');c.fillStyle=g;c.beginPath();c.ellipse(0,-9,205,11+10*p.seam,0,0,TAU);c.fill();}c.restore();   // light escaping along the lid seam
  this.mask(c,L.chGold,.35+.4*p.seam*.6,o=>{const bx=p.sweep*256/1.4-20;const g=o.createLinearGradient(bx-50,bx-50,bx+50,bx+50);g.addColorStop(0,'rgba(255,230,150,.15)');g.addColorStop(.5,'rgba(255,255,235,1)');g.addColorStop(1,'rgba(255,230,150,.15)');o.fillStyle=g;o.fillRect(0,0,256,256);});
  if(p.flash>0)this.glow(c,0,-9,250,'255,236,170',.9*p.flash);
  c.restore();
  this.emit(key+'s',T,p.spark,x,y,256,246,120,'#ffd86a',{up:70,gravity:-30});
  this.burstOnce('b'+key,fx,.12,tt,()=>{if(fx.st==='trigger')this.parts.emit(x,y-8,'#ffd36a',30,320,30,{up:160,gravity:-20,star:true});});
  this.q.push({x,y,id,fx,T,pose:p});
 }
 private sparksWild(key:string,T:number,x:number,y:number,fx:CellFx,tt:number){
  const r=fx.st==='trigger'?(tt<1.2?22:6):fx.st==='anticipation'?14:3.2;
  this.emit(key+'w1',T,r/2,x,y,130,62,26,'#c690ff',{up:50,gravity:-30});this.emit(key+'w2',T,r/2,x,y,390,62,26,'#ffd36a',{up:50,gravity:-30});
  this.burstOnce('b'+key,fx,.3,tt,()=>{if(fx.st==='trigger'){this.parts.emit(x,y-14,'#ffd36a',18,300,28,{up:60,gravity:20,star:true});this.parts.emit(x,y-14,'#c06cff',16,260,26,{up:40,gravity:20,star:true});}});
 }
 /** Rings / beam / light bursts are drawn after every cell (so a neighbour never covers them), clipped to the reel area by the caller. */
 flush(c:Ctx){
  for(const e of this.q){const{x,y,id,fx,pose}=e,tt=Math.max(0,e.T-fx.t0);c.save();c.globalCompositeOperation='lighter';
   const ring=(k:number,rgb:string,r0:number,r1:number)=>{if(k<0||k>1)return;c.globalAlpha=(1-k)*.85;c.lineWidth=4+5*(1-k);c.strokeStyle=`rgb(${rgb})`;c.beginPath();c.arc(x,y,r0+(r1-r0)*ease(k),0,TAU);c.stroke();};
   if(id==='WILD'){const p=pose as WildPose;ring(p.ring,'200,130,255',46,128);if(fx.st==='trigger')ring(p.ring-.18,'255,206,110',40,112);if(p.flash>0){c.globalAlpha=p.flash;const g=c.createRadialGradient(x,y,0,x,y,120);g.addColorStop(0,'rgba(255,240,190,.9)');g.addColorStop(1,'rgba(190,110,255,0)');c.fillStyle=g;c.fillRect(x-120,y-120,240,240);}}
   else if(id==='SCATTER'){const p=pose as ScatterPose;ring(p.ring,'200,120,255',44,120);if(fx.st==='trigger'){ring(p.ring-.2,'255,210,120',36,100);c.globalAlpha=Math.max(0,1-tt/.9)*.85;const g=c.createRadialGradient(x,y+10,0,x,y+10,150*ease(cl(tt/.5))+10);g.addColorStop(0,'rgba(255,236,170,.9)');g.addColorStop(.5,'rgba(255,170,70,.45)');g.addColorStop(1,'rgba(190,100,255,0)');c.fillStyle=g;c.fillRect(x-170,y-150,340,320);}}
   else{const p=pose as ChestPose;ring(p.ring,'255,206,90',44,118);if(p.beam>0){c.globalAlpha=p.beam*.9;const g=c.createLinearGradient(0,y-8,0,y-8-190);g.addColorStop(0,'rgba(255,236,160,.95)');g.addColorStop(.6,'rgba(255,190,70,.45)');g.addColorStop(1,'rgba(255,170,50,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-40,y-6);c.lineTo(x+40,y-6);c.lineTo(x+78,y-8-190);c.lineTo(x-78,y-8-190);c.fill();}}
   c.restore();}
 }
}
