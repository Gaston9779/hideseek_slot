import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {BuyBonusAdapter} from '../engine/buyBonus';import {cue} from '../audio/cues';
/**
 * BUY BONUS entry point: the original 3D chest (same GLB as the bonus screen) standing on the lower-right plinth, outside the reels and every control.
 * UI only. All gating/pricing comes from the adapter; with the default (disabled) adapter nothing can be bought, no credits move and no RNG is touched.
 */
export interface BuyWidgetDeps{/** true only when a new round may start (idle, no feature/modal/cinematic in progress) */canOpen:()=>boolean,balance:()=>number,world:HTMLElement,dialogHost:HTMLElement,glbUrl:string,adapter:BuyBonusAdapter,bet:()=>number,money:(c:number)=>string,renderScale:()=>number,reduced:boolean}
const W=240,H=150;
export function createBuyBonusWidget(d:BuyWidgetDeps){
 const root=document.createElement('div');root.className='buy-widget';root.id='buy';
 root.innerHTML=`<button type="button" class="buy-hit" aria-haspopup="dialog"><span class="buy-title">BUY BONUS</span><span class="buy-glow"></span><canvas class="buy-canvas" width="${W}" height="${H}" aria-hidden="true"></canvas><span class="buy-price"></span></button>`;
 d.world.appendChild(root);
 const btn=root.querySelector<HTMLButtonElement>('.buy-hit')!,canvas=root.querySelector<HTMLCanvasElement>('canvas')!,priceEl=root.querySelector<HTMLElement>('.buy-price')!;
 // ---- confirmation dialog -----------------------------------------------------------------------
 const dlg=document.createElement('dialog');dlg.id='buy-dialog';dlg.className='skh-modal';dlg.setAttribute('aria-labelledby','bd-title');dlg.innerHTML=`<h1 id="bd-title">BUY BONUS</h1><h2 class="bd-sub">HIDE &amp; SEEK · CHEST BONUS</h2><p class="bd-desc">Tre casse, ne scegli una: contiene 12 Free Spins con moltiplicatore ×1, ×2 o ×5 sulle vincite monetarie dei dodici giri. Il premio è deciso prima della tua scelta.</p><dl class="bd-rows"><div><dt>COSTO</dt><dd class="bd-price"></dd></div><div><dt>PUNTATA</dt><dd class="bd-bet"></dd></div><div><dt>SALDO</dt><dd class="bd-bal"></dd></div></dl><p class="bd-note fine" role="alert"></p><div class="bd-actions"><button type="button" class="bd-cancel menu-action">ANNULLA</button><button type="button" class="bd-ok menu-action">COMPRA</button></div><small>Crediti virtuali · nessun denaro reale.</small>`;
 d.dialogHost.appendChild(dlg);
 const okBtn=dlg.querySelector<HTMLButtonElement>('.bd-ok')!,cancel=dlg.querySelector<HTMLButtonElement>('.bd-cancel')!;
 const qs=(k:string)=>dlg.querySelector<HTMLElement>(k)!;
 let submitting=false;
 /** Insufficient balance is checked here only to explain it; the engine still refuses the debit on its own. */
 function refresh(){const q=d.adapter.quote(d.bet());const locked=!d.canOpen()&&!dlg.open;
  btn.disabled=locked;btn.setAttribute('aria-disabled',String(locked));root.classList.toggle('locked',locked);if(locked&&document.activeElement===btn)btn.blur();
  qs('.bd-bet').textContent=d.money(d.bet());qs('.bd-bal').textContent=d.money(d.balance());
  if(q.available){const price=Math.round(q.priceX*d.bet()),short=price>d.balance();priceEl.textContent=`${q.priceX}× BET`;btn.setAttribute('aria-label',`Buy Bonus, ${q.priceX} volte la puntata`);qs('.bd-price').textContent=d.money(price);qs('.bd-note').textContent=short?'Saldo insufficiente: nessun credito verrà addebitato.':'';okBtn.disabled=short||submitting;root.classList.remove('unavailable');}
  else{priceEl.textContent='PROSSIMAMENTE';btn.setAttribute('aria-label','Buy Bonus, non disponibile');qs('.bd-price').textContent='NON DISPONIBILE';qs('.bd-note').textContent=q.reason+'. Nessun credito verrà addebitato.';okBtn.disabled=true;root.classList.add('unavailable');}
 }
 refresh();
 /** Focus after close: back to SPIN when a new round is possible, otherwise nothing keeps focus (a stale focus must never re-trigger Buy Bonus). */
 dlg.addEventListener('close',()=>{queueMicrotask(()=>{const a=document.activeElement as HTMLElement|null;if(d.canOpen())document.querySelector<HTMLElement>('#spin')?.focus({preventScroll:true});else a?.blur?.();refresh();});});
 dlg.addEventListener('cancel',e=>{if(submitting)e.preventDefault();});   // Escape is inert while a purchase is in flight
 btn.addEventListener('click',()=>{if(btn.disabled||dlg.open||submitting||!d.canOpen())return;refresh();dlg.showModal();cancel.focus();});
 cancel.addEventListener('click',()=>{if(!submitting)dlg.close();});
 okBtn.addEventListener('click',async()=>{if(okBtn.disabled||submitting||!d.canOpen())return;submitting=true;okBtn.disabled=true;cancel.disabled=true;let r;try{r=await d.adapter.purchase();}catch(e){r={ok:false as const,reason:e instanceof Error?e.message:'Acquisto non riuscito'};}
  if(!r.ok){cue.error();qs('.bd-note').textContent=r.reason;submitting=false;cancel.disabled=false;refresh();return;}
  dlg.close();try{await d.adapter.afterPurchase?.();}catch(e){console.error('[buy-bonus] accepted purchase follow-up failed',e);}finally{submitting=false;cancel.disabled=false;refresh();}});
 // ---- 3D chest ---------------------------------------------------------------------------------
 let renderer:T.WebGLRenderer|undefined,scene:T.Scene,cam:T.OrthographicCamera,model:T.Group,t=0,hover=0,hoverTarget=0,loadP:Promise<void>|undefined,visible=true;
 async function load(){
  const gl=new T.WebGLRenderer({canvas,antialias:true,alpha:true,premultipliedAlpha:true});gl.setClearColor(0,0);gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;gl.outputColorSpace=T.SRGBColorSpace;renderer=gl;
  scene=new T.Scene();const pm=new T.PMREMGenerator(gl);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.6;pm.dispose();
  scene.add(new T.HemisphereLight('#9a8cff','#4a3050',.9));const key=new T.DirectionalLight('#ffb36b',3);key.position.set(-300,500,700);const rim=new T.DirectionalLight('#7b5cff',2.6);rim.position.set(400,200,-400);const fill=new T.DirectionalLight('#ff8f4a',.9);fill.position.set(400,-100,600);scene.add(key,rim,fill);
  cam=new T.OrthographicCamera(-W/2,W/2,H/2,-H/2,-1000,1000);cam.position.set(0,0,500);
  const g=await new GLTFLoader().loadAsync(d.glbUrl);const m=g.scene;m.traverse(o=>{if((o as T.Mesh).isMesh)o.frustumCulled=false;});
  const b=new T.Box3().setFromObject(m),sz=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),k=118/sz.y;m.scale.multiplyScalar(k);m.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(k));
  model=new T.Group();model.add(m);model.position.y=-H/2+14;scene.add(model);resize();
 }
 function resize(){if(!renderer)return;const s=Math.max(1,Math.min(2,d.renderScale()*1.5));renderer.setPixelRatio(1);renderer.setSize(Math.round(W*s),Math.round(H*s),false);}
 btn.addEventListener('pointerenter',()=>{hoverTarget=1;});btn.addEventListener('pointerleave',()=>{hoverTarget=0;});btn.addEventListener('focus',()=>{hoverTarget=1;});btn.addEventListener('blur',()=>{hoverTarget=0;});
 return {
  root,refresh,
  ready(){return loadP??=load().catch(e=>{console.error('[buy-bonus] chest model unavailable',e);root.classList.add('no3d');});},
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
  dispose(){renderer?.dispose();root.remove();dlg.remove();},
 };
}
