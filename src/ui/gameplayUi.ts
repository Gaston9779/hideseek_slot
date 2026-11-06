import './gameplay.css';
import {urls,symbolUrl} from '../view/assets';import {keys} from './keyboard';import {cue} from '../audio/cues';
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
 const root=mk('div','fs-hud',world,`<div class="fh-head">${ico}<span class="fh-title" data-k="title">FREE SPINS</span>${ico}</div><div class="fh-main"><div class="fh-mult" data-k="multBox" hidden><b data-k="mult">×1</b></div><div class="fh-body"><div class="fh-row"><span>GIRI RIMANENTI</span><b data-k="rem">0</b></div><div class="fh-row"><span data-k="winLbl">VINCITA BONUS</span><b data-k="win">0.00</b></div><div class="fh-sub" data-k="sub"></div></div></div><div class="fh-toast" aria-hidden="true"></div>`);
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
   q('multBox').hidden=!(chest||s.multiplier>1);q('mult').textContent=`×${s.multiplier}`;
   // Chest: only the BASE win is shown while the spins run; the multiplied total is reserved for the final reveal.
   if(chest){q('mult').textContent=`×${s.multiplier}`;q('winLbl').textContent='VINCITA BASE';q('sub').textContent='';}
   else{q('winLbl').textContent='VINCITA CUMULATA';const extra=s.retriggerAwarded?`+${s.retriggerAwarded} GIRI EXTRA`:'';q('sub').textContent=`${extra}${extra&&s.wildMultiplier?' · ':''}${s.wildMultiplier?`WILD ×${s.wildMultiplier}`:''}`;}
   if(rem!==last.remaining&&last.remaining>=0&&last.type===s.featureType)bump(q('rem'));if(win!==last.win&&last.win>=0&&last.type===s.featureType)bump(q('win'));last={remaining:rem,win,type:s.featureType};
  },
  /** "+X FREE SPINS" message for a retrigger (X comes from the engine). */
  async retrigger(n:number,suffix=''){toast.textContent=`+${n} FREE SPINS${suffix}`;toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');bump(q('rem'));await wait(reduced?900:1500);toast.classList.remove('show');},
 };
}

export interface FsSummary{kind?:'chest'|'scatter';spins:number;winCents:number;celebrate:()=>void;retriggerAwarded?:number;wildMultiplier?:number;chest?:{baseBonusWinCents:number;multiplier:number;grossMultipliedBonusWinCents:number;effectiveBonusWinCents:number}}
/** End-of-feature screen reusing the approved Free Spins art. Display only: the prize was credited spin by spin; this screen never credits. */
export function createFsSummary(world:HTMLElement,money:(c:number)=>string,reduced:boolean){
 const root=mk('div','fs-summary',world,`<img alt="" draggable="false"><div class="fsm-plaque"><small data-k="title">VINCITA TOTALE BONUS</small><b data-k="win">0.00</b><i data-k="spins"></i></div><div class="fsm-detail" data-k="detail"></div><button type="button" class="fsm-go">CONTINUA</button>`);
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Riepilogo bonus');root.querySelector('img')!.setAttribute('src',urls.freeSpins);
 const win=root.querySelector<HTMLElement>('[data-k="win"]')!,spins=root.querySelector<HTMLElement>('[data-k="spins"]')!,go=root.querySelector<HTMLButtonElement>('.fsm-go')!,title=root.querySelector<HTMLElement>('[data-k="title"]')!,detail=root.querySelector<HTMLElement>('[data-k="detail"]')!;
 let open=false,shownAt=0;
 return {
  get open(){return open;},
  show(s:FsSummary):Promise<void>{
   if(open)return Promise.resolve();open=true;shownAt=performance.now();cue.bonusComplete();if(s.winCents>0)cue.coinTick();const chest=!!s.chest&&s.kind!=='scatter';
   root.classList.toggle('chest',chest);root.classList.toggle('scatter',!chest);
   spins.textContent=`${s.spins} ${s.spins===1?'GIRO EFFETTUATO':'GIRI EFFETTUATI'}`;
   title.textContent=s.winCents===0?(chest?'CHEST BONUS COMPLETATO · NESSUNA VINCITA':'NESSUNA VINCITA IN QUESTO BONUS'):chest?'CHEST BONUS COMPLETATO':'FREE SPINS COMPLETATI';
   const chips:string[]=[];
   if(s.chest&&chest){const cut=s.chest.grossMultipliedBonusWinCents-s.chest.effectiveBonusWinCents;chips.push(`<span>VINCITA BASE <b>${money(s.chest.baseBonusWinCents)}</b></span>`,`<span>MOLTIPLICATORE <b>×${s.chest.multiplier}</b></span>`,`<span>TOTALE EFFETTIVO <b>${money(s.chest.effectiveBonusWinCents)}</b></span>`);if(cut>0)chips.push(`<span class="cut">RIDUZIONE MAX WIN <b>−${money(cut)}</b></span>`);}
   else{if(s.retriggerAwarded)chips.push(`<span>RETRIGGER <b>+${s.retriggerAwarded}</b></span>`);if(s.wildMultiplier)chips.push(`<span>LINEE CON WILD <b>×${s.wildMultiplier}</b></span>`);}
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
 const text=()=>allowed?`QUICK SPIN ${on?'ATTIVO':'DISATTIVO'}\nAccorcia solo l'animazione dei rulli.\nRisultati, premi e probabilità non cambiano.`:'QUICK SPIN NON DISPONIBILE\nNon consentito dalla configurazione del mercato.';
 const render=()=>{btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',String(on));btn.disabled=!allowed;btn.classList.toggle('unavailable',!allowed);btn.title=text().replace(/\n/g,' · ');btn.setAttribute('aria-label',`Quick Spin: ${allowed?(on?'attivo':'disattivo'):'non disponibile'}`);tip.textContent=text();};
 const showTip=()=>{tip.hidden=false;tip.style.left=`${btn.offsetLeft+btn.offsetWidth/2}px`;tip.style.top=`${btn.offsetTop-12}px`;};
 btn.addEventListener('pointerenter',showTip);btn.addEventListener('focus',showTip);btn.addEventListener('pointerleave',()=>{tip.hidden=true;});btn.addEventListener('blur',()=>{tip.hidden=true;});
 // a disabled button gets no pointer events in some browsers → tooltip also on the wrapper hit area
 btn.addEventListener('click',()=>{if(!allowed)return;on=!on;try{localStorage.setItem(KEY,on?'1':'0');}catch{/* ignore */}render();showTip();});
 render();
 return {get on(){return allowed&&on;},get allowed(){return allowed;},set(v:boolean){if(allowed){on=v;render();}}};
}
