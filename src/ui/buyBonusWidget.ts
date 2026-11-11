import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {symbolUrl,artUrl} from '../view/assets';import {safe} from '../platform/safeMode';import {applyEnvironment,createGlRenderer,isMobile} from '../view/quality';
import type {BuyBonusAdapter} from '../engine/buyBonus';import {cue} from '../audio/cues';import {BONUS_UI} from './bonusAssets';import {artAttr,deferSrc,loadDeferredArt} from './deferredArt';import {BUY_FRAME as F,pctRect,pctDisc,medalImgStyle} from './bonusAnchors';import {createBabySkullPortrait} from './babySkullPortrait';
/**
 * BUY BONUS entry point: the original 3D chest (same GLB as the bonus screen) standing on the lower-right plinth, outside the reels and every control.
 * UI only. All gating/pricing comes from the adapter; with the default (disabled) adapter nothing can be bought, no credits move and no RNG is touched.
 */
export interface BuyWidgetDeps{/** original rigged Baby Skull GLB (already loaded for the in-slot Skull) */skullTemplate?:()=>{scene:import('three').Object3D;animations:import('three').AnimationClip[]}|null,/** change the stake from inside the modal (only honoured when a new round may start) */changeBet:(delta:-1|1)=>void,betBounds:()=>{min:boolean;max:boolean},/** true only when a new round may start (idle, no feature/modal/cinematic in progress) */canOpen:()=>boolean,balance:()=>number,world:HTMLElement,dialogHost:HTMLElement,glbUrl:string,adapter:BuyBonusAdapter,bet:()=>number,money:(c:number)=>string,renderScale:()=>number,reduced:boolean}
const W=240,H=150;
export function createBuyBonusWidget(d:BuyWidgetDeps){
 const root=document.createElement('div');root.className='buy-widget';root.id='buy';
 root.innerHTML=`<button type="button" class="buy-hit" aria-haspopup="dialog" aria-label="Buy Bonus"><span class="buy-title">BUY BONUS</span><span class="buy-glow"></span><canvas class="buy-canvas" width="${W}" height="${H}" aria-hidden="true"></canvas><span class="buy-price"></span></button>`;
 d.world.appendChild(root);
 const btn=root.querySelector<HTMLButtonElement>('.buy-hit')!,canvas=root.querySelector<HTMLCanvasElement>('canvas')!,priceEl=root.querySelector<HTMLElement>('.buy-price')!;
 // ---- confirmation dialog -----------------------------------------------------------------------
 const dlg=document.createElement('dialog');dlg.id='buy-dialog';dlg.className='buy-modal';dlg.setAttribute('aria-labelledby','bd-title');
 const R=(r:import('./bonusAnchors').Rect)=>pctRect(r,F),D=(c:import('./bonusAnchors').Disc)=>pctDisc(c,F);
 dlg.innerHTML=`<div class="bm"><img class="bm-frame" ${artAttr(BONUS_UI.buyFrame)} alt="" draggable="false">
  <h1 id="bd-title" class="bm-title" style="${R(F.title)}">BUY BONUS</h1>
  <div class="bm-intro" style="${R(F.intro)}"><p class="bd-desc">Choose one of three chests to receive <b>12 Free Spins</b> with a win multiplier.</p><p class="bd-note" role="alert"></p></div>
  <canvas class="bm-skull" aria-hidden="true" style="${R(F.skullCanvas)}"></canvas>
  ${[1,2,5].map((m,i)=>`<img class="bm-medal" data-mult="${m}" ${artAttr(BONUS_UI.medals[m])} alt="Possible prize ×${m}" draggable="false" style="${medalImgStyle(F.medals[i]!,F)}">`).join('')}
  <button type="button" class="bm-step bd-minus" aria-label="Decrease bet" style="${D(F.minus)}"></button>
  <output class="bd-bet" aria-live="polite" aria-label="Bet" style="${R(F.stake)}"></output>
  <button type="button" class="bm-step bd-plus" aria-label="Increase bet" style="${D(F.plus)}"></button>
  <dl class="bm-box bm-cost" style="${R(F.cost)}"><dt>BONUS COST</dt><dd class="bd-price"></dd></dl>
  <dl class="bm-box" style="${R(F.balance)}"><dt>BALANCE</dt><dd class="bd-bal"></dd></dl>
  <button type="button" class="bd-ok" style="${R(F.cta)}"><span class="bd-ok-main">PLAY</span><span class="bd-ok-price"></span></button>
  <button type="button" class="bd-cancel" style="${R(F.cancel)}">CANCEL</button>
  <button type="button" class="bm-close" aria-label="Close" style="${D(F.close)}">×</button></div>`;
 d.dialogHost.appendChild(dlg);
 const okBtn=dlg.querySelector<HTMLButtonElement>('.bd-ok')!,cancel=dlg.querySelector<HTMLButtonElement>('.bd-cancel')!;
 const portrait=createBabySkullPortrait({canvas:dlg.querySelector<HTMLCanvasElement>('canvas.bm-skull')!,template:()=>d.skullTemplate?.()??null,reduced:d.reduced});
 const qs=(k:string)=>dlg.querySelector<HTMLElement>(k)!;
 let submitting=false;
 /** Insufficient balance is checked here only to explain it; the engine still refuses the debit on its own. */
 function refresh(){const q=d.adapter.quote(d.bet());const locked=!d.canOpen()&&!dlg.open;
  btn.disabled=locked;btn.setAttribute('aria-disabled',String(locked));root.classList.toggle('locked',locked);if(locked&&document.activeElement===btn)btn.blur();
  qs('.bd-bet').textContent=d.money(d.bet());qs('.bd-bal').textContent=d.money(d.balance());{const bb=d.betBounds();qs('.bd-minus').toggleAttribute('disabled',bb.min||submitting);qs('.bd-plus').toggleAttribute('disabled',bb.max||submitting);}
  if(q.available){const price=Math.round(q.priceX*d.bet()),short=price>d.balance();priceEl.textContent=`${q.priceX}× BET`;btn.setAttribute('aria-label',`Buy Bonus, ${q.priceX} times the bet`);qs('.bd-price').textContent=d.money(price);qs('.bd-ok-price').textContent=d.money(price);qs('.bd-note').textContent=short?'Insufficient balance for this bet. Reduce your bet; no credits will be deducted.':'';okBtn.disabled=short||submitting;root.classList.remove('unavailable');}
  else{priceEl.textContent='COMING SOON';btn.setAttribute('aria-label','Buy Bonus, unavailable');qs('.bd-price').textContent='UNAVAILABLE';qs('.bd-ok-price').textContent='';qs('.bd-note').textContent=q.reason+'. No credits will be deducted.';okBtn.disabled=true;root.classList.add('unavailable');}
 dlg.querySelector('.bm')!.classList.toggle('has-note',!!qs('.bd-note').textContent);
 }
 refresh();
 /** Focus after close: back to SPIN when a new round is possible, otherwise nothing keeps focus (a stale focus must never re-trigger Buy Bonus). */
 dlg.addEventListener('close',()=>{portrait.stop();queueMicrotask(()=>{const a=document.activeElement as HTMLElement|null;if(d.canOpen())document.querySelector<HTMLElement>('#spin')?.focus({preventScroll:true});else a?.blur?.();refresh();});});
 dlg.addEventListener('cancel',e=>{if(submitting)e.preventDefault();});   // Escape is inert while a purchase is in flight
 btn.addEventListener('click',()=>{if(btn.disabled||dlg.open||submitting||!d.canOpen())return;void ready();void loadDeferredArt();refresh();dlg.showModal();if(safe.bonus3d)portrait.start();else void flatPortrait();cancel.focus();});
 cancel.addEventListener('click',()=>{if(!submitting)dlg.close();});qs('.bm-close').addEventListener('click',()=>{if(!submitting)dlg.close();});
 for(const [sel,delta] of [['.bd-minus',-1],['.bd-plus',1]] as const)qs(sel).addEventListener('click',()=>{if(submitting||!d.canOpen())return;d.changeBet(delta);refresh();});
 okBtn.addEventListener('click',async()=>{if(okBtn.disabled||submitting||!d.canOpen())return;submitting=true;okBtn.disabled=true;cancel.disabled=true;let r;try{r=await d.adapter.purchase();}catch(e){r={ok:false as const,reason:e instanceof Error?e.message:'Purchase could not be completed'};}
  if(!r.ok){cue.error();qs('.bd-note').textContent=r.reason;submitting=false;cancel.disabled=false;refresh();return;}
  dlg.close();try{await d.adapter.afterPurchase?.();}catch(e){console.error('[buy-bonus] accepted purchase follow-up failed',e);}finally{submitting=false;cancel.disabled=false;refresh();}});
 // ---- 3D chest ---------------------------------------------------------------------------------
 let renderer:T.WebGLRenderer|undefined,scene:T.Scene,cam:T.OrthographicCamera,model:T.Group,t=0,hover=0,hoverTarget=0,loadP:Promise<void>|undefined,visible=true;
 async function load(){
  const gl=createGlRenderer('buy',canvas);renderer=gl;
  scene=new T.Scene();applyEnvironment(scene,gl,.6);
  scene.add(new T.HemisphereLight('#9a8cff','#4a3050',.9));const key=new T.DirectionalLight('#ffb36b',3);key.position.set(-300,500,700);const rim=new T.DirectionalLight('#7b5cff',2.6);rim.position.set(400,200,-400);const fill=new T.DirectionalLight('#ff8f4a',.9);fill.position.set(400,-100,600);scene.add(key,rim,fill);
  cam=new T.OrthographicCamera(-W/2,W/2,H/2,-H/2,-1000,1000);cam.position.set(0,0,500);
  const g=await new GLTFLoader().loadAsync(d.glbUrl);const m=g.scene;m.traverse(o=>{if((o as T.Mesh).isMesh)o.frustumCulled=false;});
  const b=new T.Box3().setFromObject(m),sz=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),k=118/sz.y;m.scale.multiplyScalar(k);m.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(k));
  model=new T.Group();model.add(m);model.position.y=-H/2+14;scene.add(model);resize();
 }
 function resize(){if(!renderer)return;const s=Math.max(1,Math.min(2,d.renderScale()*1.5));renderer.setPixelRatio(1);renderer.setSize(Math.round(W*s),Math.round(H*s),false);}
 // Phones: the Baby Skull portrait is the static render of the model (one 2D draw, no WebGL).
 let flatDone=false;async function flatPortrait(){if(flatDone)return;const cv=dlg.querySelector<HTMLCanvasElement>('canvas.bm-skull');if(!cv)return;const im=new Image();im.decoding='async';im.src=artUrl('skull-static');try{await im.decode();}catch{return;}const dpr=Math.min(2,devicePixelRatio||1),w=Math.max(2,Math.round(cv.clientWidth*dpr)),h=Math.max(2,Math.round(cv.clientHeight*dpr)),c=cv.getContext('2d');if(!c)return;cv.width=w;cv.height=h;const k=im.naturalWidth/600,sx=165*k,sy=262*k,sw=270*k,sh=sw*h/w;c.drawImage(im,sx,sy,sw,sh,0,0,w,h);flatDone=true;}
 // Safe mode: the same chest as the reel symbol, drawn once on a 2D canvas (no WebGL context, no GLB, no PMREM).
 async function flat(){const i=new Image();i.decoding='async';i.src=symbolUrl('CHEST_BONUS');try{await i.decode();}catch{return;}const c=canvas.getContext('2d');if(!c)return;const s=Math.min(W/i.naturalWidth,H/i.naturalHeight)*.95;c.drawImage(i,(W-i.naturalWidth*s)/2,H-i.naturalHeight*s-6,i.naturalWidth*s,i.naturalHeight*s);}
 const ready=()=>loadP??=(safe.buy3d?load():flat()).catch(e=>{console.error('[buy-bonus] chest model unavailable',e);root.classList.add('no3d');});
 // The chest is the Buy Bonus affordance and stays visible. On phones its WebGL context + GLB are created once the game is already playable (not inside the boot peak).
 if(isMobile())window.setTimeout(()=>void ready(),2500);else void ready();
 btn.addEventListener('pointerenter',()=>{hoverTarget=1;void ready();});btn.addEventListener('pointerleave',()=>{hoverTarget=0;});btn.addEventListener('focus',()=>{hoverTarget=1;void ready();});btn.addEventListener('blur',()=>{hoverTarget=0;});
 return {
  root,refresh,
  ready,
  /** hide while a cinematic runs (no overlap with the Seeker / crate) */
  setVisible(v:boolean){visible=v;root.classList.toggle('away',!v);},
  setEnabledByMarket(on:boolean){root.hidden=!on;},
  update(dt:number){
   if(!renderer||!model||!visible||root.hidden||document.hidden)return;t+=dt;hover+=(hoverTarget-hover)*Math.min(1,dt*8);
   const s=1+.07*hover;model.scale.setScalar(s);
   model.position.y=-H/2+14+(d.reduced?0:Math.sin(t*1.8)*3);          // small idle bob
   model.rotation.y=d.reduced?0:Math.sin(t*.9)*.12;                    // gentle sway, always roughly frontal
   root.style.setProperty('--hover',String(hover));renderer.render(scene,cam);
  },
  resize,
  dispose(){portrait.dispose();renderer?.dispose();root.remove();dlg.remove();},
 };
}
