import './gameplay.css';
import {urls,symbolUrl} from '../view/assets';import {BONUS_UI,medalFor} from './bonusAssets';import {artAttr,deferSrc} from './deferredArt';import {HUD_FRAME,pctRect,medalImgStyle,type Rect} from './bonusAnchors';import {keys} from './keyboard';import {cue} from '../audio/cues';
/** Presentation-only widgets: Free Spins HUD, Free Spins summary, Quick Spin control. They display numbers handed in by main.ts from the engine; they compute nothing economic. */
const mk=(tag:string,cls:string,parent:HTMLElement,html='')=>{const e=document.createElement(tag);e.className=cls;if(html)e.innerHTML=html;parent.appendChild(e);return e as HTMLElement;};
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));

export interface FsHudState{remaining:number;played:number;awarded:number;winCents:number;featureType:'scatter'|'chest';multiplier:number;baseBonusWinCents:number;grossMultipliedBonusWinCents:number;effectiveBonusWinCents:number;status:'READY'|'ACTIVE'|'COMPLETED';retriggerAwarded?:number;wildMultiplier?:number}
/**
 * Feature HUD. Chest and Scatter features each have their own identity (gold vs. spectral violet) and their own counters; nothing is computed here:
 * every number is handed in from the engine's FeatureState (base / gross multiplied / effective / credited are never re-multiplied).
 */
export function createFsHud(world:HTMLElement,money:(c:number)=>string,reduced:boolean){
 const ico=`<img class="fh-ico" src="${symbolUrl('SKULL')}" alt="" draggable="false">`;
 const HF=HUD_FRAME,rect=(r:Rect)=>pctRect(r,HF);
 const root=mk('div','fs-hud',world,`<div class="fh-classic"><div class="fh-head">${ico}<span class="fh-title" data-k="title">FREE SPINS</span>${ico}</div><div class="fh-main"><div class="fh-mult" data-k="multBox" hidden><img data-k="multimg" alt="" draggable="false"></div><div class="fh-body"><div class="fh-row"><span>SPINS LEFT</span><b data-k="rem">0</b></div><div class="fh-row"><span data-k="winLbl">BONUS WIN</span><b data-k="win">0.00</b></div><div class="fh-sub" data-k="sub"></div></div></div></div><div class="fh-art" hidden><img class="fh-frame" ${artAttr(BONUS_UI.hudFrame)} alt="" draggable="false"><img class="fh-medal" data-k="a-medal" alt="" draggable="false" hidden style="${medalImgStyle(HF.orb,HF,.97)}"><div class="fh-a-title" style="${rect(HF.title)}">CHEST FREE SPINS</div><div class="fh-a-row" style="${rect(HF.rows)}"><span>SPINS LEFT</span><b data-k="a-rem">0</b></div><div class="fh-a-row" style="${rect(HF.base)}"><span>BASE WIN</span><b data-k="a-win">0.00</b></div><div class="fh-a-mode" style="${rect(HF.mode)}">CHEST BONUS ACTIVE</div></div><div class="fh-toast" aria-hidden="true"></div>`);
 root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const q=(k:string)=>root.querySelector<HTMLElement>(`[data-k="${k}"]`)!,toast=root.querySelector<HTMLElement>('.fh-toast')!;
 let last={remaining:-1,win:-1,type:''};
 const bump=(el:HTMLElement)=>{if(reduced)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');};
 return {
  get visible(){return !root.hidden;},
  show(){root.hidden=false;},hide(){root.hidden=true;last={remaining:-1,win:-1,type:''};root.classList.remove('chest','scatter');},
  /** Never negative; "played" counts only completed spins; remaining excludes them. */
  set(s:FsHudState){
   const rem=Math.max(0,s.remaining),win=Math.max(0,s.winCents),chest=s.featureType==='chest';
   root.classList.toggle('chest',chest);root.classList.toggle('scatter',!chest);
   q('rem').textContent=String(rem);q('win').textContent=money(win);q('title').textContent=chest?'CHEST FREE SPINS':'FREE SPINS';
   q('multBox').hidden=!(chest||s.multiplier>1);{const mi=q('multimg') as HTMLImageElement,src=medalFor(s.multiplier);if(src){if(mi.getAttribute('src')!==src)mi.src=src;mi.alt=`×${s.multiplier}`;}else mi.removeAttribute('src');}
   // Chest HUD (artwork): medal = the REAL picked package, rows = real counters (BASE win only)
   {const art=root.querySelector<HTMLElement>('.fh-art')!,classic=root.querySelector<HTMLElement>('.fh-classic')!;art.hidden=!chest;classic.hidden=chest;const med=q('a-medal') as HTMLImageElement,src=chest?medalFor(s.multiplier):null;if(src){if(med.getAttribute('src')!==src)med.src=src;med.alt=`Prize won ×${s.multiplier}`;med.hidden=false;}else{med.removeAttribute('src');med.hidden=true;}q('a-rem').textContent=String(rem);q('a-win').textContent=money(win);}
   // Chest: only the BASE win is shown while the spins run; the multiplied total is reserved for the final reveal.
   if(chest){q('winLbl').textContent='BASE WIN';q('sub').textContent='';}
   else{q('winLbl').textContent='TOTAL WIN';const extra=s.retriggerAwarded?`+${s.retriggerAwarded} EXTRA SPINS`:'';q('sub').textContent=`${extra}${extra&&s.wildMultiplier?' · ':''}${s.wildMultiplier?`WILD ×${s.wildMultiplier}`:''}`;}
   if(rem!==last.remaining&&last.remaining>=0&&last.type===s.featureType)bump(q(chest?'a-rem':'rem'));if(win!==last.win&&last.win>=0&&last.type===s.featureType)bump(q(chest?'a-win':'win'));last={remaining:rem,win,type:s.featureType};
  },
  /** "+X FREE SPINS" message for a retrigger (X comes from the engine). */
  async retrigger(n:number,suffix=''){toast.textContent=`+${n} FREE SPINS${suffix}`;toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');bump(q(root.classList.contains('chest')?'a-rem':'rem'));await wait(reduced?900:1500);toast.classList.remove('show');},
 };
}

export interface FsSummary{kind?:'chest'|'scatter';spins:number;winCents:number;celebrate:()=>void;retriggerAwarded?:number;wildMultiplier?:number;chest?:{baseBonusWinCents:number;multiplier:number;grossMultipliedBonusWinCents:number;effectiveBonusWinCents:number}}
/** End-of-feature screen reusing the approved Free Spins art. Display only: the prize was credited spin by spin; this screen never credits. */
export function createFsSummary(world:HTMLElement,money:(c:number)=>string,reduced:boolean){
 const root=mk('div','fs-summary',world,`<img alt="" draggable="false"><div class="fsm-plaque"><small data-k="title">TOTAL BONUS WIN</small><b data-k="win">0.00</b><i data-k="spins"></i></div><div class="fsm-detail" data-k="detail"></div><button type="button" class="fsm-go">CONTINUE</button>`);
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Bonus summary');deferSrc(root.querySelector('img')!,urls.freeSpins);
 const win=root.querySelector<HTMLElement>('[data-k="win"]')!,spins=root.querySelector<HTMLElement>('[data-k="spins"]')!,go=root.querySelector<HTMLButtonElement>('.fsm-go')!,title=root.querySelector<HTMLElement>('[data-k="title"]')!,detail=root.querySelector<HTMLElement>('[data-k="detail"]')!;
 let open=false,shownAt=0;
 return {
  get open(){return open;},
  show(s:FsSummary):Promise<void>{
   if(open)return Promise.resolve();open=true;shownAt=performance.now();cue.bonusComplete();if(s.winCents>0)cue.coinTick();const chest=!!s.chest&&s.kind!=='scatter';
   root.classList.toggle('chest',chest);root.classList.toggle('scatter',!chest);
   spins.textContent=`${s.spins} ${s.spins===1?'SPIN PLAYED':'SPINS PLAYED'}`;
   title.textContent=s.winCents===0?(chest?'CHEST BONUS COMPLETE · NO WIN':'NO WIN IN THIS BONUS'):chest?'CHEST BONUS COMPLETE':'FREE SPINS COMPLETE';
   const chips:string[]=[];
   if(s.chest&&chest){const cut=s.chest.grossMultipliedBonusWinCents-s.chest.effectiveBonusWinCents;chips.push(`<span>BASE WIN <b>${money(s.chest.baseBonusWinCents)}</b></span>`,`<span>MULTIPLIER <b>×${s.chest.multiplier}</b></span>`,`<span>ACTUAL TOTAL <b>${money(s.chest.effectiveBonusWinCents)}</b></span>`);if(cut>0)chips.push(`<span class="cut">MAX WIN REDUCTION <b>−${money(cut)}</b></span>`);}
   else{if(s.retriggerAwarded)chips.push(`<span>RETRIGGER <b>+${s.retriggerAwarded}</b></span>`);if(s.wildMultiplier)chips.push(`<span>WILD LINES <b>×${s.wildMultiplier}</b></span>`);}
   detail.innerHTML=chips.join('');
   root.classList.toggle('zero',s.winCents===0);
   win.textContent=money(0);root.classList.add('show');go.focus({preventScroll:true});
   const t0=performance.now(),dur=reduced||s.winCents===0?0:1400;
   const step=(now:number)=>{const k=dur?Math.min(1,(now-t0)/dur):1;win.textContent=money(Math.round(s.winCents*(1-Math.pow(1-k,3))));if(k<1&&open)requestAnimationFrame(step);};requestAnimationFrame(step);
   if(s.winCents>0)s.celebrate();
   return new Promise<void>(res=>{let release=()=>{};const done=()=>{if(!open||performance.now()-shownAt<500)return;go.removeEventListener('click',done);release();open=false;root.classList.remove('show');win.textContent=money(s.winCents);window.setTimeout(res,reduced?0:260);};
    // Enter/Space continue only after the plaque has been visible for 0.5 s; a mashed key can never skip it, auto-repeat never counts
    release=keys.push({id:'fs-summary',root,handle:e=>{if((e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Space')&&!e.repeat){done();return true;}}});
    go.addEventListener('click',done);});
  },
 };
}

/** Quick Spin: shortens ONLY the reel animation. State is a per-viewer convenience (localStorage, best effort). Unavailable when the market forbids it. */
export function createQuickSpin(btn:HTMLButtonElement,world:HTMLElement,allowed:boolean){
 const KEY='skull-hunt-quick';let on=false;
 try{on=allowed&&localStorage.getItem(KEY)==='1';}catch{/* ignore */}
 const tip=mk('div','qs-tip',world);tip.hidden=true;
 const text=()=>allowed?`QUICK SPIN ${on?'ON':'OFF'}\nShortens reel animation only.\nResults, prizes, and probabilities do not change.`:'QUICK SPIN UNAVAILABLE\nNot permitted by the current market configuration.';
 const render=()=>{btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',String(on));btn.disabled=!allowed;btn.classList.toggle('unavailable',!allowed);btn.title=text().replace(/\n/g,' · ');btn.setAttribute('aria-label',`Quick Spin: ${allowed?(on?'on':'off'):'unavailable'}`);tip.textContent=text();};
 const showTip=()=>{tip.hidden=false;tip.style.left=`${btn.offsetLeft+btn.offsetWidth/2}px`;tip.style.top=`${btn.offsetTop-12}px`;};
 btn.addEventListener('pointerenter',showTip);btn.addEventListener('focus',showTip);btn.addEventListener('pointerleave',()=>{tip.hidden=true;});btn.addEventListener('blur',()=>{tip.hidden=true;});
 // a disabled button gets no pointer events in some browsers → tooltip also on the wrapper hit area
 btn.addEventListener('click',()=>{if(!allowed)return;on=!on;try{localStorage.setItem(KEY,on?'1':'0');}catch{/* ignore */}render();showTip();});
 render();
 return {get on(){return allowed&&on;},get allowed(){return allowed;},set(v:boolean){if(allowed){on=v;render();}}};
}
