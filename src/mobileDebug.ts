/**
 * Mobile diagnostics. Enabled with `?debugMobile=1` (remembered in localStorage until `?debugMobile=0`).
 *
 * What it can and cannot do: it records breadcrumbs (bounded ring buffer, debounced writes to localStorage, never inside an
 * animation frame) and, on the NEXT page load, tells whether the previous session ended cleanly (`pagehide` seen) or not.
 * A browser process kill (iOS jetsam / WebContent crash) raises no JavaScript event: it is inferred from a missing clean
 * `pagehide` plus the last breadcrumbs, never caught directly.
 */
import {safe} from './platform/safeMode';
type Detail=Record<string,unknown>;type Entry={t:number;event:string;detail?:Detail};
type Session={id:string;ua:string;nav:string;started:number;entries:Entry[];latest:string;lastError:string;end:'running'|'pagehide'|'hidden';endAt:number;spinning:boolean;mode:string;spins:number;pending:string[];device:string;counters?:Detail};
const qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams();
const KEY='skull-hunt-mobile-debug:v2',LIMIT=120,MAX_SESSIONS=3;
/** Only when served from a private LAN address (a phone testing against the developer's Mac): every breadcrumb is also POSTed to scripts/ios-log-server.mjs the instant it happens,
 *  so a page that dies before anything can be copied still leaves its last steps on the Mac. Never active on a public host. */
const remoteUrl=typeof location!=='undefined'&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname)?`http://${location.hostname}:4181/log`:null;
const enabled=(()=>{if(typeof location==='undefined')return false;if(safe.mode||remoteUrl)return true;try{const q=qs.get('debugMobile');if(q==='1')localStorage.setItem('skull-hunt-debug','1');else if(q==='0')localStorage.removeItem('skull-hunt-debug');return localStorage.getItem('skull-hunt-debug')==='1';}catch{return qs.get('debugMobile')==='1';}})();
const nav=(()=>{try{const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;return `${n?.type??'unknown'}${(document as unknown as {wasDiscarded?:boolean}).wasDiscarded?'+discarded':''}`;}catch{return 'unknown';}})();
const me:Session={id:`m${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,ua:typeof navigator!=='undefined'?navigator.userAgent.slice(0,120):'',nav,started:Date.now(),entries:[],latest:'boot',lastError:'',end:'running',endAt:0,spinning:false,mode:safe.mode??'-',spins:0,pending:[],device:typeof navigator!=='undefined'?`mem=${(navigator as unknown as {deviceMemory?:number}).deviceMemory??'?'}GB cpu=${navigator.hardwareConcurrency??'?'}`:''};
const gl={created:0,lost:0,restored:0},resizes:Record<string,number>={};
let previous:Session|null=null,timer=0,dirty=false;const probes=new Map<string,()=>Detail>();
const read=():Session[]=>{try{const raw=localStorage.getItem(KEY);const a=raw?JSON.parse(raw):[];return Array.isArray(a)?a:[];}catch{return [];}};
function save(){if(!enabled)return;dirty=false;try{const all=read().filter(s=>s.id!==me.id);all.push(me);while(all.length>MAX_SESSIONS)all.shift();localStorage.setItem(KEY,JSON.stringify(all));}catch{/* diagnostics must never affect play */}}
function schedule(){dirty=true;if(!enabled||timer)return;timer=window.setTimeout(()=>{timer=0;if(dirty)save();},1000)}
/** Classify how the PREVIOUS session ended (JavaScript cannot observe a process kill; it is inferred from what is missing). */
export type EndKind='first-session'|'normal-reload'|'clean-end'|'killed-during-spin'|'killed-during-asset-load'|'killed-unexpected'|'ended-hidden-then-new-session';
export function classify(p:Session|null,navType:string):EndKind{if(!p)return 'first-session';
 if(p.end==='running')return p.spinning?'killed-during-spin':p.pending.length?'killed-during-asset-load':'killed-unexpected';
 if(p.end==='hidden'&&!navType.startsWith('reload'))return 'ended-hidden-then-new-session';
 return navType.startsWith('reload')?'normal-reload':'clean-end';}
function verdict(p:Session|null){if(!p)return 'no previous session';const last=p.entries.at(-1);
 const observed=`OBSERVED: mode ${p.mode}, end marker "${p.end}", ${p.spins} spins, last breadcrumb ${last?.event??'—'} @${last?.t??0}ms${p.spinning?', spin in progress':''}${p.pending.length?`, loading ${p.pending.join(',')}`:''}`;
 return `${observed} · INFERRED (not proven): ${classify(p,nav)}`;}
function render(){if(!enabled)return;const s=document.querySelector<HTMLElement>('#mobile-debug-stage'),e=document.querySelector<HTMLElement>('#mobile-debug-error'),p=document.querySelector<HTMLElement>('#mobile-debug-prev');if(s)s.textContent=me.latest;if(e)e.textContent=me.lastError||'—';if(p)p.textContent=verdict(previous);}
function remote(entry:Entry){if(!remoteUrl)return;try{void fetch(remoteUrl,{method:'POST',mode:'no-cors',keepalive:true,body:JSON.stringify({sid:me.id,mode:safe.mode??'-',lvl:safe.level,paint:safe.paint,cfg:location.search,...entry})}).catch(()=>{});}catch{/* never affects play */}}
function push(event:string,detail?:Detail){if(!enabled)return;me.latest=event;if(event==='spin:start'){me.spinning=true;me.spins++;}if(event==='spin:end'||event==='spin:error')me.spinning=false;
 const entry={t:Math.round(performance.now()),event,detail};me.entries.push(entry);remote(entry);if(me.entries.length>LIMIT)me.entries.splice(0,me.entries.length-LIMIT);render();schedule();}
function counters():Detail{const out:Detail={};for(const [k,f] of probes){try{out[k]=f();}catch{/* ignore */}}const m=(performance as unknown as {memory?:{usedJSHeapSize:number}}).memory;if(m)out.jsHeapMB=Math.round(m.usedJSHeapSize/1048576);
 out.canvases=document.querySelectorAll('canvas').length;out.glCreated=gl.created;out.glLost=gl.lost;out.glRestored=gl.restored;out.resizes=JSON.stringify(resizes);out.rafAlive=document.hidden?0:1;out.imgs=document.images.length;out.vp=`${innerWidth}x${innerHeight}@${(devicePixelRatio||1).toFixed(2)}`;return out;}
function copy(value:string){if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(value).catch(()=>window.prompt('Copy diagnostics',value));else window.prompt('Copy diagnostics',value)}
function boot(){if(!enabled||typeof document==='undefined')return;
 const all=read();previous=all.filter(s=>s.id!==me.id).at(-1)??null;
 addEventListener('error',e=>mobileDebug.error('window-error',(e as ErrorEvent).error??(e as ErrorEvent).message));
 addEventListener('unhandledrejection',e=>mobileDebug.error('unhandled-rejection',e.reason));
 const ended=(kind:'pagehide'|'hidden')=>{if(me.end!=='pagehide')me.end=kind;me.endAt=Date.now();me.counters=counters();push(`lifecycle:${kind}`);save();};
 addEventListener('pagehide',()=>ended('pagehide'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)ended('hidden');else{me.end='running';push('lifecycle:visible');}});
addEventListener('beforeunload',()=>mobileDebug.step('lifecycle:beforeunload'));   // reload/navigation raise this, a process kill does not
 try{(window as unknown as {navigation?:EventTarget}).navigation?.addEventListener('navigate',e=>mobileDebug.step('lifecycle:navigate',{type:(e as unknown as {navigationType?:string}).navigationType??'?',dest:String((e as unknown as {destination?:{url?:string}}).destination?.url??'').slice(-60)}));}catch{/* no Navigation API */}
 const origGet=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,t:string,...a:unknown[]){const c=(origGet as (...x:unknown[])=>unknown).call(this,t,...a);if(c&&/webgl/.test(t)){gl.created++;mobileDebug.step('webgl:context-created',{id:this.id||this.className||'?',type:t,created:gl.created,lost:gl.lost});}return c;} as typeof origGet;
 new MutationObserver(ms=>{for(const m of ms){for(const n of m.addedNodes)if(n instanceof HTMLCanvasElement)push('dom:canvas-added',{id:n.id||n.className});for(const n of m.removedNodes)if(n instanceof HTMLCanvasElement)push('dom:canvas-removed',{id:n.id||n.className});}}).observe(document,{childList:true,subtree:true});
 addEventListener('pageshow',e=>push('lifecycle:pageshow',{persisted:(e as PageTransitionEvent).persisted}));
 addEventListener('webglcontextlost',e=>{gl.lost++;mobileDebug.step('webgl:context-lost',{id:(e.target as HTMLElement)?.id||'?'});},true);
 addEventListener('webglcontextrestored',e=>{gl.restored++;mobileDebug.step('webgl:context-restored',{id:(e.target as HTMLElement)?.id||'?'});},true);
 // resource heartbeat: one small breadcrumb every 4 s while visible (plain timer, not an animation frame)
 window.setInterval(()=>{if(!document.hidden)push('heartbeat',counters());},4000);
 push('page:init',{session:me.id,mode:safe.mode??'(none)',nav,ua:me.ua,device:me.device,previous:verdict(previous),kind:classify(previous,nav),safe:{level:safe.level,deaths:safe.deaths,forced:safe.forced}});save();}
boot();
export const mobileDebug={
 get enabled(){return enabled},
 event:push,
 /** breadcrumb written to storage IMMEDIATELY: for the few steps that may be the last thing a process does before it is killed */
 step(event:string,detail?:Detail){push(event,detail);if(enabled)save();},
 safe(){return {level:safe.level,deaths:safe.deaths,forced:safe.forced,diedLastTime:safe.diedLastTime};},
 error(event:string,error:unknown){me.lastError=`${event}: ${error instanceof Error?error.message:String(error)}`;push(event,{error:me.lastError});save();},
 asset(name:string,phase:'start'|'success'|'failure',detail:Detail={}){if(phase==='start'){if(!me.pending.includes(name))me.pending.push(name);}else me.pending=me.pending.filter(x=>x!==name);push(`asset:${phase}:${name}`,detail);if(phase==='start')save();},
 renderer(name:string,detail:Detail={}){push(`renderer:${name}`,detail)},
 canvas(name:string,w:number,h:number){resizes[name]=(resizes[name]??0)+1;push(`canvas:${name}`,{w,h,n:resizes[name]})},
 spin(phase:'start'|'end'|'error',detail:Detail={}){push(`spin:${phase}`,{...detail,...counters()});save();},
 /** register a counter source (e.g. a WebGL renderer's info) that is sampled into the heartbeat and spin breadcrumbs */
 probe(name:string,fn:()=>Detail){if(enabled)probes.set(name,fn)},
 unprobe(name:string){probes.delete(name)},
 install(){if(!enabled||document.querySelector('#mobile-debug'))return;
  const root=document.createElement('aside');root.id='mobile-debug';
  root.innerHTML='<b>MOBILE DEBUG</b><span id="mobile-debug-stage">boot</span><small id="mobile-debug-error">—</small><small id="mobile-debug-prev">—</small><button type="button" data-copy>COPY NOW</button><button type="button" data-prev>COPY PREVIOUS</button><button type="button" data-hide>HIDE</button><span id="mobile-debug-safe"></span><span><button type="button" data-safe="0">S0</button><button type="button" data-safe="1">S1</button><button type="button" data-safe="2">S2</button><button type="button" data-safe="auto">AUTO</button></span>';
  root.style.cssText='position:fixed;right:6px;top:calc(env(safe-area-inset-top) + 6px);z-index:2147483647;max-width:46vw;padding:5px 7px;border:1px solid #b99aff;border-radius:7px;background:#120b20e8;color:#fff;font:10px/1.25 ui-monospace,monospace;display:grid;gap:3px';
  for(const b of root.querySelectorAll('button'))b.style.cssText='font:inherit;padding:3px 4px;border-radius:5px;border:1px solid #888;background:#2a1d44;color:#fff';
  root.querySelector<HTMLButtonElement>('[data-copy]')!.onclick=()=>copy(JSON.stringify({now:{...me,counters:counters()},previous},null,1));
  root.querySelector<HTMLButtonElement>('[data-prev]')!.onclick=()=>copy(previous?JSON.stringify(previous,null,1):'No previous-session diagnostics stored');
  root.querySelector<HTMLElement>('#mobile-debug-safe')!.textContent=`safe level ${safe.level} · deaths ${safe.deaths}${safe.forced?' (forced)':''}`;
  for(const b of root.querySelectorAll<HTMLButtonElement>('[data-safe]'))b.onclick=()=>{const v=b.dataset.safe!;safe.set(v==='auto'?'auto':+v);location.reload();};
  root.querySelector<HTMLButtonElement>('[data-hide]')!.onclick=()=>{root.style.display='none';};
  document.body.append(root);render();push('diagnostics-ready',{previous:!!previous})},
 previous(){return previous},
 flush(){save()},
};
