import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {BuyBonusAdapter} from '../engine/buyBonus';
/**
 * BUY BONUS entry point: the original 3D chest (same GLB as the bonus screen) standing on the lower-right plinth, outside the reels and every control.
 * UI only. All gating/pricing comes from the adapter; with the default (disabled) adapter nothing can be bought, no credits move and no RNG is touched.
 */
export interface BuyWidgetDeps{world:HTMLElement,dialogHost:HTMLElement,glbUrl:string,adapter:BuyBonusAdapter,bet:()=>number,money:(c:number)=>string,renderScale:()=>number,reduced:boolean}
const W=240,H=150;
export function createBuyBonusWidget(d:BuyWidgetDeps){
 const root=document.createElement('div');root.className='buy-widget';root.id='buy';
 root.innerHTML=`<button type="button" class="buy-hit" aria-haspopup="dialog"><span class="buy-title">BUY BONUS</span><span class="buy-glow"></span><canvas class="buy-canvas" width="${W}" height="${H}" aria-hidden="true"></canvas><span class="buy-price"></span></button>`;
 d.world.appendChild(root);
 const btn=root.querySelector<HTMLButtonElement>('.buy-hit')!,canvas=root.querySelector<HTMLCanvasElement>('canvas')!,priceEl=root.querySelector<HTMLElement>('.buy-price')!;
 // ---- confirmation dialog -----------------------------------------------------------------------
 const dlg=document.createElement('dialog');dlg.id='buy-dialog';dlg.innerHTML=`<h1>BUY BONUS · HIDE &amp; SEEK</h1><p>Acquisto diretto del <b>Chest Bonus</b>: tre casse, ne scegli una e ricevi il premio già deciso prima della scelta.</p><p class="bd-price"></p><p class="bd-note fine"></p><div class="bd-actions"><button type="button" class="bd-ok menu-action">CONFERMA</button><button type="button" class="bd-cancel menu-action">ANNULLA</button></div><small>Crediti virtuali · nessun denaro reale.</small>`;
 d.dialogHost.appendChild(dlg);
 const okBtn=dlg.querySelector<HTMLButtonElement>('.bd-ok')!,cancel=dlg.querySelector<HTMLButtonElement>('.bd-cancel')!;
 function refresh(){const q=d.adapter.quote(d.bet());
  if(q.available){priceEl.textContent=`${q.priceX}× BET`;btn.setAttribute('aria-label',`Buy Bonus, ${q.priceX} volte la puntata`);dlg.querySelector('.bd-price')!.innerHTML=`Prezzo: <b>${q.priceX}× BET</b> = ${d.money(Math.round(q.priceX*d.bet()))} crediti virtuali`;dlg.querySelector('.bd-note')!.textContent='';okBtn.disabled=false;root.classList.remove('unavailable');}
  else{priceEl.textContent='PROSSIMAMENTE';btn.setAttribute('aria-label','Buy Bonus, non disponibile');dlg.querySelector('.bd-price')!.innerHTML='Prezzo: <b>NON DISPONIBILE</b>';dlg.querySelector('.bd-note')!.textContent=q.reason+'. Nessun credito verrà addebitato.';okBtn.disabled=true;root.classList.add('unavailable');}
 }
 refresh();
 btn.addEventListener('click',()=>{if(btn.disabled||dlg.open)return;refresh();dlg.showModal();cancel.focus();});
 cancel.addEventListener('click',()=>dlg.close());
 let submitting=false;
 okBtn.addEventListener('click',async()=>{if(okBtn.disabled||submitting)return;submitting=true;okBtn.disabled=true;cancel.disabled=true;const r=await d.adapter.purchase();if(!r.ok){dlg.querySelector('.bd-note')!.textContent=r.reason;submitting=false;cancel.disabled=false;refresh();return;}dlg.close();try{await d.adapter.afterPurchase?.();}catch(e){console.error('[buy-bonus] accepted purchase follow-up failed',e);}finally{submitting=false;cancel.disabled=false;}});
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
