import './gameplay.css';
import {urls} from '../view/assets';
/** Presentation-only widgets: Free Spins HUD, Free Spins summary, Quick Spin control. They display numbers handed in by main.ts from the engine; they compute nothing economic. */
const mk=(tag:string,cls:string,parent:HTMLElement,html='')=>{const e=document.createElement(tag);e.className=cls;if(html)e.innerHTML=html;parent.appendChild(e);return e as HTMLElement;};
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));

export interface FsHudState{remaining:number;played:number;awarded:number;winCents:number}
export function createFsHud(world:HTMLElement,money:(c:number)=>string,reduced:boolean){
 const root=mk('div','fs-hud',world,`<div class="fh-title">FREE SPINS</div><div class="fh-row"><span>GIRI RIMANENTI</span><b data-k="rem">0</b></div><div class="fh-row"><span>VINCITA BONUS</span><b data-k="win">0.00</b></div><div class="fh-sub" data-k="sub"></div><div class="fh-toast" aria-hidden="true"></div>`);
 root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const q=(k:string)=>root.querySelector<HTMLElement>(`[data-k="${k}"]`)!,toast=root.querySelector<HTMLElement>('.fh-toast')!;
 let last={remaining:-1,win:-1};
 const bump=(el:HTMLElement)=>{if(reduced)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');};
 return {
  get visible(){return !root.hidden;},
  show(){root.hidden=false;},hide(){root.hidden=true;last={remaining:-1,win:-1};},
  /** Never negative; "played" counts only completed spins; remaining excludes them. */
  set(s:FsHudState){
   const rem=Math.max(0,s.remaining),win=Math.max(0,s.winCents);
   q('rem').textContent=String(rem);q('win').textContent=money(win);q('sub').textContent=`GIRO ${Math.min(s.played,s.awarded)} / ${s.awarded}`;
   if(rem!==last.remaining&&last.remaining>=0)bump(q('rem'));if(win!==last.win&&last.win>=0)bump(q('win'));last={remaining:rem,win};
  },
  /** "+X FREE SPINS" message for a retrigger (X comes from the engine). */
  async retrigger(n:number){toast.textContent=`+${n} FREE SPINS`;toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');bump(q('rem'));await wait(reduced?900:1500);toast.classList.remove('show');},
 };
}

export interface FsSummary{spins:number;winCents:number;celebrate:()=>void}
/** End-of-feature screen reusing the approved Free Spins art. Display only: the prize was credited spin by spin; this screen never credits. */
export function createFsSummary(world:HTMLElement,money:(c:number)=>string,reduced:boolean){
 const root=mk('div','fs-summary',world,`<img alt="" draggable="false"><div class="fsm-plaque"><small>VINCITA TOTALE BONUS</small><b data-k="win">0.00</b><i data-k="spins"></i></div><button type="button" class="fsm-go">CONTINUA</button>`);
 root.setAttribute('role','dialog');root.setAttribute('aria-label','Riepilogo Free Spins');root.querySelector('img')!.setAttribute('src',urls.freeSpins);
 const win=root.querySelector<HTMLElement>('[data-k="win"]')!,spins=root.querySelector<HTMLElement>('[data-k="spins"]')!,go=root.querySelector<HTMLButtonElement>('.fsm-go')!;
 let open=false;
 return {
  get open(){return open;},
  show(s:FsSummary):Promise<void>{
   if(open)return Promise.resolve();open=true;spins.textContent=`${s.spins} GIRI EFFETTUATI`;
   root.classList.toggle('zero',s.winCents===0);root.querySelector('small')!.textContent=s.winCents===0?'NESSUNA VINCITA IN QUESTO BONUS':'VINCITA TOTALE BONUS';
   win.textContent=money(0);root.classList.add('show');go.focus({preventScroll:true});
   const t0=performance.now(),dur=reduced||s.winCents===0?0:1400;
   const step=(now:number)=>{const k=dur?Math.min(1,(now-t0)/dur):1;win.textContent=money(Math.round(s.winCents*(1-Math.pow(1-k,3))));if(k<1&&open)requestAnimationFrame(step);};requestAnimationFrame(step);
   if(s.winCents>0)s.celebrate();
   return new Promise<void>(res=>{const done=()=>{go.removeEventListener('click',done);window.removeEventListener('keydown',key,true);open=false;root.classList.remove('show');win.textContent=money(s.winCents);window.setTimeout(res,reduced?0:260);};
    const key=(e:KeyboardEvent)=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();done();}};
    go.addEventListener('click',done);window.addEventListener('keydown',key,true);});
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
