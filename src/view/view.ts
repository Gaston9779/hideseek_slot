import type {SymbolId} from '../config/game';
import type {Outcome} from '../math/slot';
import type {WinTier} from '../config/presentation';
import {createBonusOverlay} from '../bonus/bonusOverlay';import {BONUS_IMG} from '../bonus/bonusLayout';
import {BG,DESIGN,FRAME,HUD,LOGO,OVERLAY,PANEL,SKULL,CELLS,PLAY_AREA} from '../layout';
import {loadImage,loadSymbolImages,urls} from './assets';
import {Reels} from './reels';
import {Particles} from './particles';
import {createSkull} from './skull';import {createChase,type Chase} from '../chase/director';
import type {SkullState} from '../animation/mascot';

const INITIAL:SymbolId[][]=[['TOMB','CHEST','LANTERN'],['WILD','GHOST','SKULL'],['LANTERN','KEY','SCATTER'],['CHEST','POTION','MAUSOLEUM'],['POTION','SCATTER','GARGOYLE']];
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const place=(el:HTMLElement,x:number,y:number,w?:number,h?:number)=>{el.style.left=`${x}px`;el.style.top=`${y}px`;if(w!==undefined)el.style.width=`${w}px`;if(h!==undefined)el.style.height=`${h}px`;};
const circle=(el:HTMLElement,c:{cx:number,cy:number,r:number})=>place(el,c.cx-c.r,c.cy-c.r,c.r*2,c.r*2);
const box=(el:HTMLElement,c:{cx:number,cy:number,w:number,h:number})=>place(el,c.cx-c.w/2,c.cy-c.h/2,c.w,c.h);

export async function createView(onProgress:(s:string)=>void){
 const world=$('#world'),stage=$('#stage');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // ---- static layers from layout
 onProgress('Lighting the lanterns…');
 const [bgImg,frameImg,panelImg,logoImg,symbols]=await Promise.all([loadImage(urls.bg),loadImage(urls.frame),loadImage(urls.panel),loadImage(urls.logo),loadSymbolImages()]);
 const bg=$<HTMLImageElement>('#bg');bg.src=bgImg.src;place(bg,BG.x,BG.y,BG.src[0]*BG.scale,BG.src[1]*BG.scale);
 const frame=$<HTMLImageElement>('#frame');frame.src=frameImg.src;place(frame,FRAME.x,FRAME.y,FRAME.src[0]*FRAME.scale,FRAME.src[1]*FRAME.scale);
 const panel=$<HTMLImageElement>('#panel');panel.src=panelImg.src;place(panel,PANEL.x,PANEL.y,PANEL.src[0]*PANEL.scale,PANEL.src[1]*PANEL.scale);
 const logo=$<HTMLImageElement>('#logo');logo.src=logoImg.src;place(logo,LOGO.cx-LOGO.w/2,LOGO.top,LOGO.w);
 box($('#balance-field'),HUD.balance);box($('#bet-field'),HUD.bet);box($('#win-field'),HUD.win);
 circle($('#spin'),HUD.spin);circle($('#info'),HUD.info);circle($('#bet-down'),HUD.minus);circle($('#bet-up'),HUD.plus);circle($('#menu'),HUD.menu);circle($('#quick'),HUD.quick);
 for(const [id,s] of [['balance-field',.62],['bet-field',.56],['win-field',.66]] as const)$(`#${id}`).style.fontSize=`${HUD[id.split('-')[0] as 'balance'].h*s}px`;
 // ---- scaling
 const hitBase=new Map<HTMLElement,{x:number,y:number,w:number}>();let scale=1;const canvases=[...document.querySelectorAll<HTMLCanvasElement>('canvas.layer')];
 const rs=()=>Math.max(.6,Math.min(2,scale*(window.devicePixelRatio||1)));
 const ctxs=new Map<HTMLCanvasElement,CanvasRenderingContext2D>();
 function fit(){const vw=stage.clientWidth,vh=stage.clientHeight;scale=Math.min(vw/DESIGN.w,vh/DESIGN.h);world.style.transform=`translate(${(vw-DESIGN.w*scale)/2}px,${(vh-DESIGN.h*scale)/2}px) scale(${scale})`;
  for(const c of canvases){if(c.id==='skull')continue;const r=rs();c.width=Math.round(DESIGN.w*r);c.height=Math.round(DESIGN.h*r);const x=c.getContext('2d')!;x.setTransform(r,0,0,r,0,0);ctxs.set(c,x);}
  const MIN=46;document.querySelectorAll<HTMLElement>('.hit').forEach(h=>{const b=hitBase.get(h)??(()=>{const o={x:parseFloat(h.style.left),y:parseFloat(h.style.top),w:parseFloat(h.style.width)};hitBase.set(h,o);return o;})();const size=Math.max(b.w,MIN/scale);h.style.left=`${b.x+b.w/2-size/2}px`;h.style.top=`${b.y+b.w/2-size/2}px`;h.style.width=h.style.height=`${size}px`;});
  skull?.resize();chase?.resize();}
 const frameHooks:((dt:number)=>void)[]=[];let chase:Chase|undefined;let skull:Awaited<ReturnType<typeof createSkull>>|undefined;
 const sk=$<HTMLCanvasElement>('#skull');place(sk,SKULL.x,SKULL.y,SKULL.w,SKULL.h);
 fit();addEventListener('resize',fit);
 const reelsCtx=ctxs.get($('#reels'))!,fxCtx=ctxs.get($('#fx'))!,atmoCtx=ctxs.get($('#atmo'))!;
 const reels=new Reels(reelsCtx,symbols,INITIAL);const fx=new Particles(240);
 // ---- real 3D skull
 onProgress('Waking the Skull…');
 skull=await createSkull(sk,`${import.meta.env.BASE_URL}assets/scenery/Skull_Horned_Creature_Rigged.glb`,rs);fit();
 reels.onAnticipate=on=>{if(on&&skull!.controller.state!=='anticipation')skull!.set('anticipation');};
 // ---- atmosphere: lantern flicker glows over the art + fireflies + slow mist (all subtle)
 const bgPt=(x:number,y:number)=>({x:BG.x+x*BG.scale,y:BG.y+y*BG.scale});
 const LAMPS=[[225,250,150],[495,395,95],[1160,395,95],[1450,420,120],[190,590,70],[1495,640,70]].map(([x,y,r])=>({...bgPt(x,y),r:r*BG.scale}));
 const flies=Array.from({length:26},(_,i)=>({x:Math.random()*DESIGN.w,y:300+Math.random()*600,p:Math.random()*6.28,s:.3+Math.random()*.7,i}));
 let clock=performance.now(),elapsed=0,raf=0;
 function atmo(){const c=atmoCtx;c.clearRect(0,0,DESIGN.w,DESIGN.h);c.save();c.globalCompositeOperation='lighter';
  LAMPS.forEach((l,i)=>{const k=reduced?1:1+.12*Math.sin(elapsed*9+i*2)*Math.sin(elapsed*3.1+i)+.05*Math.sin(elapsed*17+i);const g=c.createRadialGradient(l.x,l.y,2,l.x,l.y,l.r*2.2);g.addColorStop(0,`rgba(255,160,50,${.22*k})`);g.addColorStop(1,'rgba(255,140,40,0)');c.fillStyle=g;c.fillRect(l.x-l.r*2.2,l.y-l.r*2.2,l.r*4.4,l.r*4.4);});
  if(!reduced)for(const f of flies){const x=f.x+Math.sin(elapsed*.25*f.s+f.p)*70,y=f.y+Math.cos(elapsed*.31*f.s+f.p*2)*38;const a=.35+.35*Math.sin(elapsed*1.6*f.s+f.p);const g=c.createRadialGradient(x,y,0,x,y,9);g.addColorStop(0,`rgba(255,226,130,${a})`);g.addColorStop(1,'rgba(255,200,90,0)');c.fillStyle=g;c.fillRect(x-9,y-9,18,18);}
  c.restore();}
 function frameLoop(now:number){raf=requestAnimationFrame(frameLoop);if(document.hidden){clock=now;return;}const dt=Math.min((now-clock)/1000,.05);clock=now;elapsed+=dt;
  chase?.update(dt);for(const h of frameHooks){try{h(dt);}catch(e){console.error('[frame hook]',e);}}reels.update(dt);reelsCtx.clearRect(0,0,DESIGN.w,DESIGN.h);reels.draw();atmo();
  fx.update(dt);fxCtx.clearRect(0,0,DESIGN.w,DESIGN.h);fx.draw(fxCtx);
  if(shower>0&&!reduced){shower-=dt;if(Math.random()<.9){fx.emit(300+Math.random()*1300,-10,Math.random()<.5?'#ffd36a':'#ff9ae8',1,40,34,{gravity:520,spread:.4});}}}
 let shower=0;raf=requestAnimationFrame(frameLoop);
 // ---- overlays
 const backdrop=$('#backdrop'),fsOverlay=$('#fs-overlay'),bonusOverlay=$('#bonus-overlay'),banner=$('#bigwin'),flash=$('#flash');
 const fsImg=$<HTMLImageElement>('#fs-img');fsImg.src=urls.freeSpins;{const w=OVERLAY.freeSpins.w,h=w*941/1672;place(fsOverlay,OVERLAY.freeSpins.cx-w/2,OVERLAY.freeSpins.cy-h/2,w,h);}
 const bonusImg=$<HTMLImageElement>('#bonus-img');bonusImg.src=urls.bonus;{const w=OVERLAY.bonus.w,h=w*BONUS_IMG.h/BONUS_IMG.w;place(bonusOverlay,OVERLAY.bonus.cx-w/2,OVERLAY.bonus.cy-h/2,w,h);bonusOverlay.style.setProperty('--k',String(w/BONUS_IMG.w));}
 const bonus=createBonusOverlay({celebration:b=>celebHook?.(b)??0,root:bonusOverlay,chestUrl:`${import.meta.env.BASE_URL}bonus-chest/bonus-chest-animated.glb`,skullUrl:`${import.meta.env.BASE_URL}assets/scenery/Skull_Horned_Creature_Rigged.glb`,renderScale:()=>rs()*OVERLAY.bonus.w/BONUS_IMG.w,reduced,onClosed:()=>{backdrop.classList.remove('on');skull!.set('idle');const r=chestClosed;chestClosed=undefined;r?.();},burst:()=>{if(!reduced)fx.emit(DESIGN.w/2,420,'#ffd36a',40,420,40,{gravity:120});}});
 chase=createChase({world,skullCanvas:sk,renderScale:rs,skullTemplate:()=>skull!.template(),frameImg,panelImg,seekerUrl:`${import.meta.env.BASE_URL}assets/scenery/Skull_Seeker.glb`,crateUrl:`${import.meta.env.BASE_URL}bonus-chest/bonus-chest-animated.glb`,skullHeight:SKULL.height});
 let celebHook:((b:HTMLElement)=>number)|undefined;let chestClosed:(()=>void)|undefined;let bannerTimer=0,fsResolve:(()=>void)|undefined;
 const api={
  reels,skull:skull!,chase:chase!,onFrame(cb:(dt:number)=>void){frameHooks.push(cb);},
  /** hooks for the bonus cinematic controller (presentation only) */
  emitFx:(x:number,y:number,color:string,n:number,speed?:number,size?:number,opt?:{up?:number,gravity?:number,star?:boolean,spread?:number})=>fx.emit(x,y,color,n,speed,size,opt),
  setCelebrationHook(f:((b:HTMLElement)=>number)|undefined){celebHook=f;},
  skullReact(e:'WIN'|'BIG_WIN'|'BONUS_TRIGGER'|'BEST_CHEST_PICK'){skull!.dispatch(e);},
  async spin(outcome:Outcome,quick=false){hideBanner();skull!.set('watch');await reels.spin(outcome,quick);},
  /** Present the (already known) result: highlights, particles, skull reaction and the tiered celebration. */
  present(outcome:Outcome,tier:WinTier,cents:number,fmt:(c:number)=>string,opts:{banner?:boolean}={}){
   reels.present(outcome,tier);
   const scatterFeature=outcome.evaluation.scatterCount>=3;
   if(scatterFeature)skull!.dispatch('BONUS_TRIGGER');else if(tier==='none')skull!.dispatch('SPIN_LOSS',{freeSpin:outcome.mode==='free'});else if(tier==='small')skull!.dispatch('IDLE');   // positive return ≤ bet is a net loss: no celebration
   else if(tier==='medium')skull!.dispatch('WIN');else skull!.dispatch('BIG_WIN');
   if(tier==='medium'||tier==='big'||tier==='mega'||tier==='max'){burst(tier);}
   if((tier==='big'||tier==='mega'||tier==='max')&&opts.banner!==false)showBanner(tier,cents,fmt);
  },
  /** Strong Free Spins intro. Count comes from the engine; resolves when dismissed (auto or click/Space). */
  freeSpinsIntro(count:number,retrigger:boolean){
   return new Promise<void>(resolve=>{fsResolve=resolve;const patch=$('#fs-patch');patch.hidden=count===10&&!retrigger;$('#fs-count').textContent=(retrigger?'+':'')+count;$('#fs-sub').textContent=retrigger?'MORE SPINS':'FREE SPINS';
    fsOverlay.classList.remove('out');fsOverlay.classList.add('show');backdrop.classList.add('on');skull!.set('bonus');
    if(!reduced){fx.emit(DESIGN.w/2,OVERLAY.freeSpins.cy,'#ffd36a',40,420,40,{gravity:80});fx.emit(DESIGN.w/2,OVERLAY.freeSpins.cy,'#c06cff',26,360,36,{gravity:60});}
    const close=()=>{removeEventListener('keydown',key);fsOverlay.removeEventListener('pointerdown',close);clearTimeout(t);fsOverlay.classList.add('out');backdrop.classList.remove('on');setTimeout(()=>{fsOverlay.classList.remove('show','out');fsResolve=undefined;resolve();},reduced?0:350);};
    const key=(e:KeyboardEvent)=>{if(e.code==='Space'||e.code==='Enter'||e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}};
    const t=setTimeout(close,reduced?1500:2900);addEventListener('keydown',key,true);fsOverlay.addEventListener('pointerdown',close);});
  },
  showBonusPreview(){bonus.usePreview();backdrop.classList.add('on');void bonus.open();},
  /** Real chest round from the math engine. Resolves when the player has picked, the reveal finished and the overlay was closed. */
  playChestBonus(provider:{nextRound():import('../bonus/controller').ChestBonusRound},adapter:{award(id:string,prize:number):boolean}){bonus.useReal(provider,adapter);backdrop.classList.add('on');return new Promise<void>(res=>{chestClosed=res;void bonus.open();});},
  hideBonusPreview(){bonus.close();},
  bonus,
  inspect(){return {skull:skull!.inspect(),grid:reels.grid,spinning:reels.isSpinning,scale,renderScale:rs(),fxParticles:fx.count,winCells:reels.activeWinCells};},
  dispose(){cancelAnimationFrame(raf);skull!.dispose();},
 };
 function burst(tier:WinTier){const big=tier!=='medium';if(reduced)return;const cx=(PLAY_AREA.x+PLAY_AREA.w/2),cy=PLAY_AREA.y+PLAY_AREA.h/2;fx.emit(cx,cy,'#ffd36a',big?34:16,big?520:300,big?44:30,{gravity:120});if(big)fx.emit(cx,cy,'#fff0b0',16,300,56,{gravity:0,star:true});if(tier==='mega'||tier==='max'){shower=tier==='max'?4:2.6;fx.emit(cx,cy,'#ff9ae8',30,600,40);}
  flash.classList.remove('go');void flash.offsetWidth;flash.classList.add('go');}
 function hideBanner(){clearTimeout(bannerTimer);banner.classList.remove('show');banner.style.animation='';banner.style.opacity='';banner.style.scale='';shower=0;}
 function showBanner(tier:WinTier,cents:number,fmt:(c:number)=>string){const title={big:'BIG WIN',mega:'MEGA WIN',max:'MAX WIN'}[tier as 'big']!;banner.dataset.tier=tier;banner.querySelector('h2')!.textContent=title;const p=banner.querySelector<HTMLElement>('p')!;const ms=reduced?0:1500;const t0=performance.now();const step=(now:number)=>{const k=ms?Math.min(1,(now-t0)/ms):1;p.textContent=fmt(Math.round(cents*(1-Math.pow(1-k,3))));if(k<1&&banner.classList.contains('show'))requestAnimationFrame(step);};
  banner.classList.remove('show');void banner.offsetWidth;banner.classList.add('show');requestAnimationFrame(step);if(!new URLSearchParams(location.search).has('hold'))bannerTimer=window.setTimeout(()=>banner.classList.remove('show'),tier==='big'?2800:tier==='mega'?3400:4200);else banner.style.animation='none',banner.style.opacity='1',banner.style.scale='1';}
 $('#bonus-close').onclick=()=>{if(!bonus.isReal)bonus.close();};
 addEventListener('keydown',e=>{if(!bonus.isOpen)return;if(e.code==='Escape'){if(!bonus.isReal)bonus.close();}else if(['Digit1','Digit2','Digit3'].includes(e.code))bonus.pick(+e.code.slice(-1)-1);});
 return api;
}
export type View=Awaited<ReturnType<typeof createView>>;
