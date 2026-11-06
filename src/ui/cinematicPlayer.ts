import './cinematic.css';
/**
 * Single reusable cinematic player (presentation only — never touches game state, balance or math).
 * play() always resolves, never rejects: 'ended' | 'skipped' | 'failed'. Callers continue the game on any result.
 * One <video> element is created once and reused for every playback (intro + bonus).
 */
export type CinematicResult='ended'|'skipped'|'failed';
export interface CinematicOptions{host:HTMLElement;webm:string;mp4:string;poster:string;loadTimeoutMs?:number;stallTimeoutMs?:number}
export interface CinematicPlayer{
 play():Promise<CinematicResult>;
 /** Plays only the first time per browser session (sessionStorage, with in-memory fallback). */
 playOnce(key:string):Promise<CinematicResult|'already-played'>;
 skip():void;
 readonly isPlaying:boolean;
 /** Starts fetching the video in the background (call once the essential loading is done). */
 warm():void;
}
const seenMemory=new Set<string>();
function markSeen(key:string):boolean{ // returns true if this is the first time
 const k=`cinematic:${key}`;let first=!seenMemory.has(k);seenMemory.add(k);
 try{if(sessionStorage.getItem(k))first=false;sessionStorage.setItem(k,'1');}catch{/* storage blocked: memory fallback */}
 return first;
}
export function createCinematicPlayer(o:CinematicOptions):CinematicPlayer{
 const loadTimeout=o.loadTimeoutMs??6000,stallTimeout=o.stallTimeoutMs??4000;
 const root=document.createElement('div');root.className='cine';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-label','Filmato introduttivo');
 const video=document.createElement('video');video.className='cine-video';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
 video.preload='none';video.poster=o.poster;video.disablePictureInPicture=true;video.controls=false;video.setAttribute('aria-hidden','true');
 for(const [src,type] of [[o.webm,'video/webm; codecs="vp9"'],[o.mp4,'video/mp4; codecs="avc1.640028"']]){const s=document.createElement('source');s.src=src;s.type=type;video.appendChild(s);}
 const playBtn=document.createElement('button');playBtn.type='button';playBtn.className='cine-play';playBtn.textContent='▶  TOCCA PER GUARDARE';playBtn.hidden=true;
 const skipBtn=document.createElement('button');skipBtn.type='button';skipBtn.className='cine-skip';skipBtn.textContent='SALTA';skipBtn.setAttribute('aria-label','Salta il filmato');
 const flash=document.createElement('div');flash.className='cine-flash';const fx=document.createElement('canvas');fx.className='cine-fx';fx.setAttribute('aria-hidden','true');
 root.append(video,flash,fx,playBtn,skipBtn);o.host.appendChild(root);
 let seq=0,current:Promise<CinematicResult>|undefined,finish:((r:CinematicResult)=>void)|undefined;
 const run=()=>new Promise<CinematicResult>(resolve=>{
  const mine=++seq;let settled=false,lastT=-1,lastProgress=performance.now();const prevFocus=document.activeElement as HTMLElement|null;
  const timers:number[]=[];const listeners:[EventTarget,string,EventListener,boolean?][]=[];
  const on=(t:EventTarget,e:string,f:EventListener,c?:boolean)=>{t.addEventListener(e,f,c);listeners.push([t,e,f,c]);};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let fxRaf=0,transStarted=false;
  const FADE={ended:reduced?250:480,skipped:300,failed:0};
  const done=(r:CinematicResult)=>{if(settled)return;settled=true;finish=undefined;timers.forEach(clearTimeout);clearInterval(watch);cancelAnimationFrame(watchRaf);listeners.forEach(([t,e,f,c])=>t.removeEventListener(e,f,c));
   try{video.pause();}catch{/* ignore */}
   playBtn.hidden=true;try{prevFocus?.focus?.({preventScroll:true});}catch{/* ignore */}
   const ms=FADE[r];root.style.setProperty('--cine-fade',`${ms}ms`);root.classList.add('out');root.classList.remove('on','playing');
   // crossfade to the slot; the slot is already rendered underneath and the promise resolves only when it is fully visible/interactive again
   window.setTimeout(()=>{cancelAnimationFrame(fxRaf);root.classList.remove('out','prep','flash');if(seq===mine)root.hidden=true;resolve(r);},ms+20);};
  // ---- premium exit transition (natural end only): brighten → soft gold/violet flash → particles converge → crossfade. No effects when reduced motion.
  const startTransition=()=>{if(transStarted||settled||reduced)return;transStarted=true;root.classList.add('prep');window.setTimeout(()=>root.classList.add('flash'),260);
   const w=root.clientWidth,h=root.clientHeight,dpr=Math.min(2,devicePixelRatio||1);fx.width=w*dpr;fx.height=h*dpr;const c=fx.getContext('2d');if(!c)return;c.scale(dpr,dpr);
   const N=70,t0=performance.now(),D=620;const ps=Array.from({length:N},(_,i)=>{const a=Math.random()*Math.PI*2,r=Math.max(w,h)*(.45+Math.random()*.3);return {a,r,sz:1.5+Math.random()*2.6,hue:i%2?'255,210,106':'192,108,255',delay:Math.random()*.25};});
   const draw=(now:number)=>{const k=Math.min(1,(now-t0)/D);c.clearRect(0,0,w,h);c.globalCompositeOperation='lighter';
    for(const p of ps){const e=Math.max(0,Math.min(1,(k-p.delay)/(1-p.delay)));const ee=1-Math.pow(1-e,3);const rr=p.r*(1-ee);const x=w/2+Math.cos(p.a+ee*1.2)*rr,y=h/2+Math.sin(p.a+ee*1.2)*rr*.62;const al=Math.sin(Math.PI*Math.min(1,e))*.9;const g=c.createRadialGradient(x,y,0,x,y,p.sz*4);g.addColorStop(0,`rgba(${p.hue},${al})`);g.addColorStop(1,`rgba(${p.hue},0)`);c.fillStyle=g;c.fillRect(x-p.sz*4,y-p.sz*4,p.sz*8,p.sz*8);}
    if(k<1)fxRaf=requestAnimationFrame(draw);else c.clearRect(0,0,w,h);};fxRaf=requestAnimationFrame(draw);};
  let watchRaf=0;const tick=()=>{if(settled)return;const d=video.duration;if(Number.isFinite(d)&&d>0&&!video.paused&&d-video.currentTime<=.52)startTransition();watchRaf=requestAnimationFrame(tick);};
  finish=done;
  // Overlay appears at once on the poster (= first frame): no black flash, no waiting for the network.
  root.hidden=false;void root.offsetWidth;root.classList.add('on');skipBtn.focus({preventScroll:true});
  on(skipBtn,'click',()=>done('skipped'));
  on(window,'keydown',e=>{const k=(e as KeyboardEvent).code;if(k==='Escape'||k==='Space'||k==='Enter'){e.preventDefault();e.stopImmediatePropagation();done('skipped');}},true);
  on(video,'ended',()=>{startTransition();done('ended');});
  const lastSource=video.lastElementChild;
  on(video,'error',e=>{if(e.target===video||e.target===lastSource)done('failed');},true); // <source> errors don't bubble: capture; fail only when the last fallback fails
  on(video,'playing',()=>{root.classList.add('playing');playBtn.hidden=true;lastProgress=performance.now();});
  const watch=window.setInterval(()=>{ // stall watchdog: a frozen/starved video must never hold the game
   if(video.paused||video.ended)return;if(video.currentTime!==lastT){lastT=video.currentTime;lastProgress=performance.now();}else if(performance.now()-lastProgress>stallTimeout)done('failed');},500);
  const noSource=()=>video.networkState===HTMLMediaElement.NETWORK_NO_SOURCE&&video.readyState===0;
  const start=()=>{
   video.currentTime=0;
   let p:Promise<void>|undefined;try{p=video.play();}catch{p=undefined;}
   if(!p)return;
   p.catch((err:unknown)=>{if(settled)return;
    if((err as DOMException)?.name==='NotAllowedError'){ // autoplay blocked → poster + explicit tap; SALTA stays available
     timers.forEach(clearTimeout);playBtn.hidden=false;playBtn.focus({preventScroll:true});
     playBtn.onclick=()=>{playBtn.hidden=true;video.play().catch(()=>done('failed'));};
    }else if((err as DOMException)?.name!=='AbortError'){done('failed');}});};
  // load watchdog: if playback has not really started in time, continue the game.
  timers.push(window.setTimeout(()=>{if(!settled&&playBtn.hidden&&!root.classList.contains('playing'))done('failed');},loadTimeout));
  watchRaf=requestAnimationFrame(tick);
  video.preload='auto';
  if(video.readyState===0||noSource())video.load();
  start();
 });
 const api:CinematicPlayer={
  get isPlaying(){return !!current;},
  play(){if(current)return current;current=run().finally(()=>{current=undefined;});return current;},
  async playOnce(key){return markSeen(key)?api.play():'already-played';},
  skip(){finish?.('skipped');},
  warm(){if(video.preload==='none'){video.preload='auto';try{video.load();}catch{/* ignore */}}},
 };
 return api;
}
