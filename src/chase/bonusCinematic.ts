import './bonusCinematic.css';
import {GAME_EVENT_NAME,type GameEvent} from '../engine/events';
import {FRAME,DESIGN} from '../layout';
import {urls} from '../view/assets';import {keys} from '../ui/keyboard';
import type {Chase} from './director';
/**
 * BonusCinematicController — the single owner of every bonus cinematic. Presentation only: it READS engine events (`skull-hunt:game-event`),
 * never calls the engine, never changes a prize, count or balance. All numbers on screen come from event payloads or from the caller's real-result getters.
 *
 * One chase, three meanings:  FREE_SPINS → violet magic burst · CHEST → crate trip + golden burst · DUAL → one chase, violet+gold, announces both.
 * Events outside an armed spin (e.g. a restored session) are ignored; every event is de-duplicated by type+round+spin.
 */
export type BonusKind='FREE_SPINS'|'CHEST'|'DUAL';
type Tone='purple'|'gold'|'dual';
export interface BonusCinematicDeps{
 chase:Chase;world:HTMLElement;stage:HTMLElement;reduced:boolean;
 emit:(x:number,y:number,color:string,n:number,speed?:number,size?:number,opt?:{up?:number,gravity?:number,star?:boolean,spread?:number})=>void;
 skullReact:(e:'BIG_WIN'|'BONUS_TRIGGER'|'BEST_CHEST_PICK')=>void;
 /** real credited total of the current round, in cents (engine state), used only for display */
 roundWinCents:()=>number;money:(cents:number)=>string;
 speed?:number;
}
interface Pending{kind:BonusKind;ev:Extract<GameEvent,{type:'FREE_SPINS_TRIGGERED'|'CHEST_BONUS_TRIGGERED'|'DUAL_BONUS_TRIGGERED'}>}
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export function createBonusCinematic(d:BonusCinematicDeps){
 const seen=new Set<string>();let armed=false,pending:Pending|null=null,best:Extract<GameEvent,{type:'BEST_CHEST_PICK'}>|null=null,maxCoordinated=false,maxStandalone=false,running=false;
 // ---- DOM (created once, reused) -------------------------------------------------------------------
 const mk=(tag:string,cls:string,parent:HTMLElement)=>{const e=document.createElement(tag);e.className=cls;parent.appendChild(e);return e as HTMLElement;};
 const frameEl=d.world.querySelector<HTMLElement>('#frame')!;
 const glow=document.createElement('div');glow.className='bc-glow';glow.style.cssText=`left:${FRAME.x}px;top:${FRAME.y}px;width:${FRAME.src[0]*FRAME.scale}px;height:${FRAME.src[1]*FRAME.scale}px;-webkit-mask:url(${urls.frame}) center/100% 100% no-repeat;mask:url(${urls.frame}) center/100% 100% no-repeat`;frameEl.after(glow);
 const flash=mk('div','bc-flash',d.world),announce=mk('div','bc-announce',d.world),maxEl=mk('div','bc-max',d.world);
 maxEl.setAttribute('role','dialog');maxEl.setAttribute('aria-label','Max win');maxEl.innerHTML='<h2>MAX WIN</h2><p></p><small></small>';
 const skip=document.createElement('button');skip.className='bc-skip';skip.type='button';skip.hidden=true;skip.textContent='SKIP';skip.setAttribute('aria-label','Skip the cutscene (prizes and features are not skipped)');d.stage.appendChild(skip);
 const live=document.createElement('p');live.className='sr-only';live.setAttribute('aria-live','polite');d.stage.appendChild(live);
 // ---- event intake ---------------------------------------------------------------------------------
 function onEvent(e:Event){
  const ev=(e as CustomEvent<GameEvent>).detail;if(!ev||!armed)return;
  const key=`${ev.type}:${ev.roundId}:${ev.spinNo}`;if(seen.has(key))return;seen.add(key);if(seen.size>200)seen.delete(seen.values().next().value!);
  switch(ev.type){
   case 'DUAL_BONUS_TRIGGERED':pending={kind:'DUAL',ev};break;                      // one chase only: DUAL overrides and no separate FS/CHEST handler runs
   case 'CHEST_BONUS_TRIGGERED':if(pending?.kind!=='DUAL')pending={kind:'CHEST',ev};break;
   case 'FREE_SPINS_TRIGGERED':if(ev.source==='BASE'&&!pending)pending={kind:'FREE_SPINS',ev};break;   // retriggers keep the existing in-feature banner, no chase
   case 'BEST_CHEST_PICK':best=ev;break;
   case 'MAX_WIN':if(best&&best.roundId===ev.roundId)maxCoordinated=true;else maxStandalone=true;break;
  }
 }
 window.addEventListener(GAME_EVENT_NAME,onEvent);
 // ---- effects --------------------------------------------------------------------------------------
 const COLORS={purple:['#b05cff','#e8caff','#8a6cff'],gold:['#ffd36a','#fff0b0','#ffb02a'],dual:['#ffd36a','#b05cff','#fff0b0']} as const;
 function glowFx(tone:Tone,ms=1100){glow.className=`bc-glow ${tone}`;glow.style.setProperty('--bc-ms',`${ms}ms`);void glow.offsetWidth;glow.classList.add('on');}
 function flashFx(tone:Tone,x:number,y:number){if(d.reduced)return;flash.className=`bc-flash ${tone}`;flash.style.setProperty('--fx',`${x/DESIGN.w*100}%`);flash.style.setProperty('--fy',`${y/DESIGN.h*100}%`);void flash.offsetWidth;flash.classList.add('go');}
 function burst(tone:Tone,x:number,y:number,rich=1){
  if(d.reduced)return;const [a,b,c]=COLORS[tone];
  d.emit(x,y,a,Math.round(40*rich),520,40,{gravity:70});d.emit(x,y,b,Math.round(26*rich),380,50,{gravity:0,star:true});
  d.emit(x,y,c,Math.round(30*rich),150,28,{gravity:-70,up:60,spread:1.3});            // slow rising "spectral" wisps
  if(tone==='dual'){d.emit(x,y,'#b05cff',Math.round(30*rich),460,38,{gravity:60});}
 }
 function ending(kind:BonusKind,at:{x:number,y:number},quick:boolean,ev:Pending['ev']){
  const tone:Tone=kind==='FREE_SPINS'?'purple':kind==='CHEST'?'gold':'dual';
  glowFx(tone,quick?600:1100);flashFx(tone,at.x,at.y);burst(tone,at.x,at.y,quick?.6:1);
  d.skullReact('BONUS_TRIGGER');
  if(kind==='DUAL'){const n=(ev as Extract<GameEvent,{type:'DUAL_BONUS_TRIGGERED'}>).awardedSpins;announce.innerHTML=`HIDE &amp; SEEK BONUS<small>+ ${n} FREE SPINS</small>`;announce.className='bc-announce';void announce.offsetWidth;announce.classList.add('show');live.textContent=`Hide and Seek Bonus and ${n} Free Spins`;}
  else live.textContent=kind==='FREE_SPINS'?`${(ev as Extract<GameEvent,{type:'FREE_SPINS_TRIGGERED'}>).awardedSpins} Free Spins`:'Hide and Seek Bonus';
  return kind==='DUAL'?(quick?900:1500):(quick?250:800);
 }
// ---- anticipation / suspense (follows the REAL reveal state; never touches outcomes) ------------------------------------------------
 const sus={scatter:false,chest:false};
 const tone=():Tone=>sus.scatter&&sus.chest?'dual':sus.scatter?'purple':'gold';
 function suspense(e:{phase:'start'|'resolve'|'miss';kind:'scatter'|'chest';col:number;active:{scatter:boolean;chest:boolean}}){
  sus.scatter=e.active.scatter;sus.chest=e.active.chest;
  if(e.phase==='start'){glow.className=`bc-glow ${tone()} hold`;return;}
  const k:Tone=e.kind==='scatter'?'purple':'gold';
  if(e.phase==='resolve'){glow.className=`bc-glow ${sus.scatter||sus.chest?tone():k}`;glow.style.setProperty('--bc-ms','700ms');void glow.offsetWidth;glow.classList.add('on');flashFx(k,DESIGN.w/2,DESIGN.h*.42);if(!d.reduced)burst(k,DESIGN.w/2,DESIGN.h*.42,.7);return;}
  if(!sus.scatter&&!sus.chest)glow.classList.remove('hold');else glow.className=`bc-glow ${tone()} hold`;    // miss: effects fade out, back to the normal UI
 }
 function suspenseAbort(){sus.scatter=sus.chest=false;glow.classList.remove('hold');}
 // ---- the shared chase intro -----------------------------------------------------------------------
 async function playIntro(p:Pending){
  let skipped=false,endingMs=0,impactAt={x:1790,y:760},started=false,startTs=0;
  const doEnding=(quick:boolean)=>{if(started)return;started=true;endingMs=ending(p.kind,impactAt,quick,p.ev);startTs=performance.now();};
  skip.hidden=false;const onSkip=()=>{skipped=true;d.chase.abort();};
  const releaseKeys=keys.push({id:'bonus-cinematic',handle:e=>{if(e.code==='Escape'||e.code==='Space'||e.code==='Enter'||e.code==='NumpadEnter'){onSkip();return true;}}});
  skip.addEventListener('click',onSkip);
  const q=new URLSearchParams(location.search);const spd=import.meta.env.DEV&&q.has('chaseSpeed')?Number(q.get('chaseSpeed')):(d.speed??1.25);
  try{
   if(d.reduced){doEnding(true);}
   else{
    const ok=await d.chase.start({speed:spd,crate:p.kind!=='FREE_SPINS',onMark:(m,at)=>{
     if(m==='crateDrop')d.emit(at.x,at.y,'#ffd36a',10,160,26,{gravity:200});
     if(m==='impact'){impactAt=at;doEnding(false);}
    }});
    if(!ok&&!skipped&&!started){/* chase unavailable (models failed to load): still deliver the ending */}
    doEnding(skipped);                                  // skipped (or unavailable) → short ending, never skip the transition into the bonus
   }
   {const remaining=Math.max(0,endingMs-(performance.now()-startTs));await wait(skipped?Math.min(remaining,400):Math.max(0,remaining-150));}
  }finally{skip.hidden=true;skip.removeEventListener('click',onSkip);releaseKeys();}
 }
 // ---- MAX WIN (standalone: no chest pick involved) -------------------------------------------------
 async function playMaxWin(cents=d.roundWinCents()){
  maxEl.querySelector('p')!.textContent='0.00';maxEl.querySelector('small')!.textContent='5,000× YOUR BET · VIRTUAL CREDITS';maxEl.classList.add('on');d.world.classList.add('bc-max-open');live.textContent=`Max win. ${d.money(cents)} credited`;
  d.skullReact('BIG_WIN');glowFx('dual',2400);
  const t0=performance.now(),dur=d.reduced?0:1900,cnt=maxEl.querySelector('p')!;
  const tick=(now:number)=>{const k=dur?Math.min(1,(now-t0)/dur):1;cnt.textContent=d.money(Math.round(cents*(1-Math.pow(1-k,3))));if(k<1&&maxEl.classList.contains('on'))requestAnimationFrame(tick);};requestAnimationFrame(tick);
  await new Promise<void>(res=>{let n=0;const iv=window.setInterval(()=>{if(!d.reduced&&n<8){burst('dual',300+Math.random()*1320,380+Math.random()*260,1.2);n++;}},380);
   let closed=false,release=()=>{};const close=()=>{if(closed)return;closed=true;clearInterval(iv);maxEl.removeEventListener('pointerdown',close);release();maxEl.classList.remove('on');d.world.classList.remove('bc-max-open');res();};
   release=keys.push({id:'max-win',handle:e=>{if(e.code==='Escape'||e.code==='Space'||e.code==='Enter'||e.code==='NumpadEnter'){close();return true;}}});
   maxEl.addEventListener('pointerdown',close);window.setTimeout(close,d.reduced?1800:4600);});
 }
 return {
  suspense,suspenseAbort,
  /** Arm for one player-initiated spin; events are only consumed between beginSpin() and endSpin(). */
  beginSpin(){armed=true;pending=null;best=null;maxCoordinated=false;maxStandalone=false;},
  endSpin(){armed=false;pending=null;best=null;maxCoordinated=false;maxStandalone=false;},
  hasPending(){return !!pending||maxStandalone;},
  get maxStandalone(){return maxStandalone;},get active(){return running;},
  /** Plays everything that the confirmed events of this spin call for (intro first, then a standalone MAX WIN). Never rejects. */
  async run(){
   if(running)return;running=true;
   try{const p=pending;pending=null;if(p)await playIntro(p);if(maxStandalone){maxStandalone=false;await playMaxWin();}}
   catch(e){console.error('[bonus-cinematic]',e);d.chase.abort();skip.hidden=true;}
   finally{running=false;}
  },
  /** Called by the chest overlay when it reaches its celebration; returns the banner duration. One call per round (the chest state machine guarantees it). */
  chestCelebration(banner:HTMLElement):number{
   if(maxCoordinated){
    const cents=d.roundWinCents();banner.innerHTML=`MAX WIN!<span class="mw-cnt">0.00</span>`;const cnt=banner.querySelector('.mw-cnt')!;const t0=performance.now(),dur=d.reduced?0:1800;
    const tick=(now:number)=>{const k=dur?Math.min(1,(now-t0)/dur):1;cnt.textContent=d.money(Math.round(cents*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
    glowFx('dual',2600);burst('dual',DESIGN.w/2,380,1.6);window.setTimeout(()=>burst('dual',DESIGN.w/2,420,1.3),700);window.setTimeout(()=>burst('gold',DESIGN.w/2,400,1.2),1500);live.textContent=`Max win. ${d.money(cents)} credited`;return d.reduced?1800:4200;
   }
   banner.textContent='BEST PICK!';burst('gold',DESIGN.w/2,400,1);return 0;
  },
  /** true if the chest overlay should treat its celebration as the MAX WIN (single coordinated sequence) */
  get maxCoordinated(){return maxCoordinated;},
  /** DEV only (stripped from production): visual check of the standalone MAX WIN screen with a given amount. */
  ...(import.meta.env.DEV?{debugMaxWin:(cents:number)=>playMaxWin(cents)}:{}),
  dispose(){window.removeEventListener(GAME_EVENT_NAME,onEvent);glow.remove();flash.remove();announce.remove();maxEl.remove();skip.remove();live.remove();},
 };
}
export type BonusCinematic=ReturnType<typeof createBonusCinematic>;
