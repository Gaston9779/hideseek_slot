import {cue} from '../audio/cues';import {medalFor} from '../ui/bonusAssets';import {ChestBonusController,type BonusPorts,type ChestBonusRound} from './controller';
import {PreviewAdapter,TestRoundProvider} from './provider';
import {createBonusScene,type BonusScene} from './bonusScene';
import {BONUS_IMG,LABEL_UP,PEDESTALS,SUMMARY_RECT} from './bonusLayout';

/** DOM glue for both the production engine-backed chest round and the explicit no-credit visual preview. */
export function createBonusOverlay(d:{celebration?:(banner:HTMLElement)=>number,root:HTMLElement,chestUrl:string,skullUrl:string,renderScale:()=>number,reduced:boolean,onClosed:()=>void,burst?:()=>void}){
 const $=<T extends HTMLElement>(s:string)=>d.root.querySelector<T>(s)!;
 const canvas=$('#bonus-canvas') as HTMLCanvasElement,prizesEl=$('#bonus-prizes'),banner=$('#bonus-banner'),summary=$('#bonus-summary'),live=$('#bonus-live'),loading=$('#bonus-loading');
 const previewProvider=new TestRoundProvider(),previewAdapter=new PreviewAdapter();let provider:{nextRound():ChestBonusRound}=previewProvider,adapter:{award(id:string,prize:number):boolean;awards?:{roundId:string,prize:number}[]}=previewAdapter;let real=false;
 let scene:BonusScene|undefined,controller:ChestBonusController|undefined,opening=false,timers=new Set<number>(),isOpen=false;
 const celebrateMs=(import.meta.env.DEV&&Number(new URLSearchParams(location.search).get('bonusCelebrateMs')))||3200;   // QA only: lets screenshots catch the celebration
 const labels=PEDESTALS.map((p,i)=>{const el=document.createElement('div');el.className='bprize';el.style.left=`calc(${p.u}px*var(--k))`;el.style.top=`calc(${p.v-LABEL_UP}px*var(--k))`;el.dataset.index=String(i);el.innerHTML='<img alt="" draggable="false" hidden><b></b><i></i><small></small>';prizesEl.appendChild(el);return el;});
 const track=(fn:()=>void,ms:number)=>{const id=window.setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return ()=>{clearTimeout(id);timers.delete(id);};};
 const clearAll=()=>{timers.forEach(clearTimeout);timers.clear();};
 const fmt=(n:number)=>real?`×${n}`:String(n);
 const spinsLine=(n:number)=>n>1?`12 FREE SPINS ×${n}`:'12 FREE SPINS';   // exact text of the awarded package
 const titleEl=$('#bonus-title');let summaryShownAt=0;
 function makePorts(round:ChestBonusRound):BonusPorts{
  const anim=d.reduced?0:520;
  return {
   setInteractive:on=>{scene?.setInteractive(on);titleEl.classList.toggle('picked',!on);},
   openChest:i=>{cue.chestOpen();if(round.selectedIndex===i){scene!.setSelected(i);live.textContent='Opening your chest';}else scene!.setUnselected(i);return scene!.openChest(i);},
   showPrize:(i,kind,value)=>{if(real&&kind==='selected')cue.chestReveal(value);const el=labels[i];el.className=`bprize ${kind} x${value}`;el.querySelector('i')!.textContent=real?(kind==='selected'?'12 FREE SPINS':'NON SCELTA'):(kind==='selected'?'YOU WON':'NOT PICKED');{const img=el.querySelector<HTMLImageElement>('img')!,src=real?medalFor(value):null;if(src){img.src=src;img.alt=`Premio ×${value}`;img.hidden=false;el.querySelector('b')!.textContent='';}else{img.hidden=true;el.querySelector('b')!.textContent=fmt(value);}}el.querySelector('small')!.textContent=real?(kind==='selected'?'MOLTIPLICATORE VINCITE':'12 FREE SPINS'):'TEST VALUE';
    void el.offsetWidth;el.classList.add('show');live.textContent=real?(kind==='selected'?`Hai vinto ${spinsLine(value)}`:`La cassa ${i+1} conteneva ${spinsLine(value)}, non assegnata`):(kind==='selected'?`You won ${fmt(value)} (test)`:`Chest ${i+1} held ${fmt(value)}, not awarded`);
    return new Promise<void>(res=>{track(res,anim);});},     // resolves once the plaque has finished appearing → value is really visible
   celebrate:()=>{cue.voice('win');const sel=round.selectedIndex!;scene!.highlightBest(sel);scene!.skullAppear('bigwin');d.burst?.();const extra=d.celebration?.(banner)??0;banner.style.animationDuration=extra?`${extra}ms`:'';banner.classList.remove('show');void banner.offsetWidth;banner.classList.add('show');live.textContent=extra?'Max win!':'Best pick!';
    return new Promise<void>(res=>{track(()=>{banner.classList.remove('show');scene?.skullHide();res();},d.reduced?1200:Math.max(real?2000:celebrateMs,extra));});},
   showSummary:(r,best)=>{const won=r.prizes[r.selectedIndex!];
    if(real){                                  // production flow: no button, no click — a readable pause, then the scene closes by itself
     live.textContent=`Bonus pronto: ${won>1?`12 FREE SPINS ×${won}`:'12 FREE SPINS'}.`;track(()=>api.close(),d.reduced?900:1900);return;}
    const others=r.prizes.map((p,i)=>({p,i})).filter(x=>x.i!==r.selectedIndex).map(x=>fmt(x.p)).join(' · ');
    summary.innerHTML=`<div class="sum-main">${best?'BEST PICK! ':''}YOU WON <b>${fmt(won)}</b></div><div class="sum-sub">Other chests: ${others} — not awarded</div><div class="sum-note">DEVELOPMENT PREVIEW · TEST VALUES · NO CREDITS ADDED</div><button id="bonus-done" class="sum-btn">BACK TO SLOT</button>`;
    summary.classList.add('show');summaryShownAt=performance.now();summary.querySelector<HTMLButtonElement>('#bonus-done')!.onclick=()=>api.close();live.textContent=`Bonus complete. You won ${fmt(won)} (test value, not credited).`;},
   schedule:(ms,fn)=>track(fn,ms),
   dispose:()=>{},
   onError:e=>{console.error('[bonus]',e);live.textContent='The bonus preview hit a problem.';},
  };
 }
 function resetUi(){summaryShownAt=0;titleEl.classList.remove('picked');clearAll();labels.forEach(l=>{l.className='bprize';});banner.classList.remove('show');summary.classList.remove('show');summary.innerHTML='';}
 const api={
  get adapter(){return adapter;},get provider(){return provider;},get isReal(){return real;},
  /** Real round: prizes come from the math engine and are credited through the engine adapter. */
  useReal(p:{nextRound():ChestBonusRound},a:{award(id:string,prize:number):boolean}){provider=p;adapter=a;real=true;d.root.classList.add('real');},
  usePreview(){provider=previewProvider;adapter=previewAdapter;real=false;d.root.classList.remove('real');},
  /** Enter/Space on the summary continue — only once it has been visible for 700 ms (a held/mashed key can never skip it). */
  activateSummary(){if(!summary.classList.contains('show')||performance.now()-summaryShownAt<700)return false;summary.querySelector<HTMLButtonElement>('#bonus-done')?.click();return true;},
  onOpenChange:undefined as ((open:boolean)=>void)|undefined,
  get isOpen(){return isOpen;},get controller(){return controller;},get scene(){return scene;},
  async open(){
   if(isOpen||opening)return;opening=true;resetUi();d.root.classList.add('show');isOpen=true;api.onOpenChange?.(true);
   try{
    if(!scene){loading.hidden=false;scene=await createBonusScene({canvas,chestUrl:d.chestUrl,skullUrl:d.skullUrl,renderScale:d.renderScale,onPick:i=>{controller?.select(i);}});loading.hidden=true;}
    if(!isOpen){return;}                                 // closed while loading
    scene.reset();scene.resize();const round=provider.nextRound();controller=new ChestBonusController(round,makePorts(round),adapter);scene.start();live.textContent='Pick one of the three chests';
   }catch(e){console.error('[bonus] failed to start',e);loading.textContent='Could not load the bonus preview';}
   finally{opening=false;}
  },
  close(){if(!isOpen)return;isOpen=false;api.onOpenChange?.(false);controller?.close();controller=undefined;resetUi();scene?.stop();scene?.reset();d.root.classList.remove('show');d.onClosed();},
  /** keyboard access: 1 / 2 / 3 */
  pick(i:number){return controller?.select(i)??false;},
  dispose(){api.close();scene?.dispose();scene=undefined;},
  inspect(){return {open:isOpen,status:controller?.status??null,round:controller?{...controller.round}:null,log:controller?.log??[],awards:[...(adapter.awards??[])],scene:scene?.inspect()??null,clips:scene?.skullClips??[]};},
 };
 return api;
}
export const BONUS_ASPECT=BONUS_IMG.h/BONUS_IMG.w,SUMMARY=SUMMARY_RECT;
