import {ChestBonusController,type BonusPorts,type ChestBonusRound} from './controller';
import {PreviewAdapter,TestRoundProvider} from './provider';
import {createBonusScene,type BonusScene} from './bonusScene';
import {BONUS_IMG,LABEL_UP,PEDESTALS,SUMMARY_RECT} from './bonusLayout';

/** DOM glue + real ports for the chest bonus. Preview only: values are explicit TEST data and never reach the slot balance. */
export function createBonusOverlay(d:{root:HTMLElement,chestUrl:string,skullUrl:string,renderScale:()=>number,reduced:boolean,onClosed:()=>void,burst?:()=>void}){
 const $=<T extends HTMLElement>(s:string)=>d.root.querySelector<T>(s)!;
 const canvas=$('#bonus-canvas') as HTMLCanvasElement,prizesEl=$('#bonus-prizes'),banner=$('#bonus-banner'),summary=$('#bonus-summary'),live=$('#bonus-live'),loading=$('#bonus-loading');
 const provider=new TestRoundProvider(),adapter=new PreviewAdapter();
 let scene:BonusScene|undefined,controller:ChestBonusController|undefined,opening=false,timers=new Set<number>(),isOpen=false;
 const celebrateMs=Number(new URLSearchParams(location.search).get('bonusCelebrateMs'))||3200;   // QA only: lets screenshots catch the celebration
 const labels=PEDESTALS.map((p,i)=>{const el=document.createElement('div');el.className='bprize';el.style.left=`calc(${p.u}px*var(--k))`;el.style.top=`calc(${p.v-LABEL_UP}px*var(--k))`;el.dataset.index=String(i);el.innerHTML='<i></i><b></b><small></small>';prizesEl.appendChild(el);return el;});
 const track=(fn:()=>void,ms:number)=>{const id=window.setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return ()=>{clearTimeout(id);timers.delete(id);};};
 const clearAll=()=>{timers.forEach(clearTimeout);timers.clear();};
 const fmt=(n:number)=>String(n);
 function makePorts(round:ChestBonusRound):BonusPorts{
  const anim=d.reduced?0:520;
  return {
   setInteractive:on=>scene?.setInteractive(on),
   openChest:i=>{if(round.selectedIndex===i){scene!.setSelected(i);live.textContent='Opening your chest';}else scene!.setUnselected(i);return scene!.openChest(i);},
   showPrize:(i,kind,value)=>{const el=labels[i];el.className=`bprize ${kind}`;el.querySelector('i')!.textContent=kind==='selected'?'YOU WON':'NOT PICKED';el.querySelector('b')!.textContent=fmt(value);el.querySelector('small')!.textContent='TEST VALUE';
    void el.offsetWidth;el.classList.add('show');live.textContent=kind==='selected'?`You won ${fmt(value)} (test value)`:`Chest ${i+1} held ${fmt(value)}, not awarded`;
    return new Promise<void>(res=>{track(res,anim);});},     // resolves once the plaque has finished appearing → value is really visible
   celebrate:()=>{const sel=round.selectedIndex!;scene!.highlightBest(sel);scene!.skullAppear('bigwin');d.burst?.();banner.classList.remove('show');void banner.offsetWidth;banner.classList.add('show');live.textContent='Best pick!';
    return new Promise<void>(res=>{track(()=>{banner.classList.remove('show');scene?.skullHide();res();},d.reduced?1200:celebrateMs);});},
   showSummary:(r,best)=>{const others=r.prizes.map((p,i)=>({p,i})).filter(x=>x.i!==r.selectedIndex).map(x=>fmt(x.p)).join(' · ');
    summary.innerHTML=`<div class="sum-main">${best?'BEST PICK! ':''}YOU WON <b>${fmt(r.prizes[r.selectedIndex!])}</b></div><div class="sum-sub">Other chests: ${others} — not awarded</div><div class="sum-note">DEVELOPMENT PREVIEW · TEST VALUES · NO CREDITS ADDED</div><button id="bonus-done" class="sum-btn">BACK TO SLOT</button>`;
    summary.classList.add('show');summary.querySelector<HTMLButtonElement>('#bonus-done')!.onclick=()=>api.close();live.textContent=`Bonus complete. You won ${fmt(r.prizes[r.selectedIndex!])} (test value, not credited).`;},
   schedule:(ms,fn)=>track(fn,ms),
   dispose:()=>{},
   onError:e=>{console.error('[bonus]',e);live.textContent='The bonus preview hit a problem.';},
  };
 }
 function resetUi(){clearAll();labels.forEach(l=>{l.className='bprize';});banner.classList.remove('show');summary.classList.remove('show');summary.innerHTML='';}
 const api={
  adapter,provider,
  get isOpen(){return isOpen;},get controller(){return controller;},get scene(){return scene;},
  async open(){
   if(isOpen||opening)return;opening=true;resetUi();d.root.classList.add('show');isOpen=true;
   try{
    if(!scene){loading.hidden=false;scene=await createBonusScene({canvas,chestUrl:d.chestUrl,skullUrl:d.skullUrl,renderScale:d.renderScale,onPick:i=>{controller?.select(i);}});loading.hidden=true;}
    if(!isOpen){return;}                                 // closed while loading
    scene.reset();scene.resize();const round=provider.nextRound();controller=new ChestBonusController(round,makePorts(round),adapter);scene.start();live.textContent='Pick one of the three chests';
   }catch(e){console.error('[bonus] failed to start',e);loading.textContent='Could not load the bonus preview';}
   finally{opening=false;}
  },
  close(){if(!isOpen)return;isOpen=false;controller?.close();controller=undefined;resetUi();scene?.stop();scene?.reset();d.root.classList.remove('show');d.onClosed();},
  /** keyboard access: 1 / 2 / 3 */
  pick(i:number){return controller?.select(i)??false;},
  dispose(){api.close();scene?.dispose();scene=undefined;},
  inspect(){return {open:isOpen,status:controller?.status??null,round:controller?{...controller.round}:null,log:controller?.log??[],awards:[...adapter.awards],scene:scene?.inspect()??null,clips:scene?.skullClips??[]};},
 };
 return api;
}
export const BONUS_ASPECT=BONUS_IMG.h/BONUS_IMG.w,SUMMARY=SUMMARY_RECT;
