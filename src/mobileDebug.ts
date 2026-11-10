/**
 * Mobile diagnostics. Enabled with `?debugMobile=1` (remembered in localStorage until `?debugMobile=0`).
 *
 * What it can and cannot do: it records breadcrumbs (bounded ring buffer, debounced writes to localStorage, never inside an
 * animation frame) and, on the NEXT page load, tells whether the previous session ended cleanly (`pagehide` seen) or not.
 * A browser process kill (iOS jetsam / WebContent crash) raises no JavaScript event: it is inferred from a missing clean
 * `pagehide` plus the last breadcrumbs, never caught directly.
 */
type Detail=Record<string,unknown>;type Entry={t:number;event:string;detail?:Detail};
type Session={id:string;ua:string;nav:string;started:number;entries:Entry[];latest:string;lastError:string;end:'running'|'pagehide'|'hidden';endAt:number;spinning:boolean;counters?:Detail};
const qs=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams();
const KEY='skull-hunt-mobile-debug:v2',LIMIT=120,MAX_SESSIONS=3;
const enabled=(()=>{if(typeof location==='undefined')return false;try{const q=qs.get('debugMobile');if(q==='1')localStorage.setItem('skull-hunt-debug','1');else if(q==='0')localStorage.removeItem('skull-hunt-debug');return localStorage.getItem('skull-hunt-debug')==='1';}catch{return qs.get('debugMobile')==='1';}})();
const nav=(()=>{try{const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;return `${n?.type??'unknown'}${(document as unknown as {wasDiscarded?:boolean}).wasDiscarded?'+discarded':''}`;}catch{return 'unknown';}})();
const me:Session={id:`m${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,ua:typeof navigator!=='undefined'?navigator.userAgent.slice(0,120):'',nav,started:Date.now(),entries:[],latest:'boot',lastError:'',end:'running',endAt:0,spinning:false};
let previous:Session|null=null,timer=0,dirty=false;const probes=new Map<string,()=>Detail>();
const read=():Session[]=>{try{const raw=localStorage.getItem(KEY);const a=raw?JSON.parse(raw):[];return Array.isArray(a)?a:[];}catch{return [];}};
function save(){if(!enabled)return;dirty=false;try{const all=read().filter(s=>s.id!==me.id);all.push(me);while(all.length>MAX_SESSIONS)all.shift();localStorage.setItem(KEY,JSON.stringify(all));}catch{/* diagnostics must never affect play */}}
function schedule(){dirty=true;if(!enabled||timer)return;timer=window.setTimeout(()=>{timer=0;if(dirty)save();},1000)}
function verdict(p:Session|null){if(!p)return 'no previous session';const last=p.entries.at(-1);const tail=`last: ${last?.event??'—'} @${last?.t??0}ms${p.spinning?' (SPIN WAS RUNNING)':''}`;
 return p.end==='running'?`PREVIOUS ENDED WITHOUT pagehide → crash/kill/reload likely · ${tail}`:`previous ended cleanly (${p.end}) · ${tail}`;}
function render(){if(!enabled)return;const s=document.querySelector<HTMLElement>('#mobile-debug-stage'),e=document.querySelector<HTMLElement>('#mobile-debug-error'),p=document.querySelector<HTMLElement>('#mobile-debug-prev');if(s)s.textContent=me.latest;if(e)e.textContent=me.lastError||'—';if(p)p.textContent=verdict(previous);}
function push(event:string,detail?:Detail){if(!enabled)return;me.latest=event;if(event==='spin:start')me.spinning=true;if(event==='spin:end'||event==='spin:error')me.spinning=false;
 me.entries.push({t:Math.round(performance.now()),event,detail});if(me.entries.length>LIMIT)me.entries.splice(0,me.entries.length-LIMIT);render();schedule();}
function counters():Detail{const out:Detail={};for(const [k,f] of probes){try{out[k]=f();}catch{/* ignore */}}const m=(performance as unknown as {memory?:{usedJSHeapSize:number}}).memory;if(m)out.jsHeapMB=Math.round(m.usedJSHeapSize/1048576);
 out.canvases=document.querySelectorAll('canvas').length;out.imgs=document.images.length;out.vp=`${innerWidth}x${innerHeight}@${(devicePixelRatio||1).toFixed(2)}`;return out;}
function copy(value:string){if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(value).catch(()=>window.prompt('Copy diagnostics',value));else window.prompt('Copy diagnostics',value)}
function boot(){if(!enabled||typeof document==='undefined')return;
 const all=read();previous=all.filter(s=>s.id!==me.id).at(-1)??null;
 addEventListener('error',e=>mobileDebug.error('window-error',(e as ErrorEvent).error??(e as ErrorEvent).message));
 addEventListener('unhandledrejection',e=>mobileDebug.error('unhandled-rejection',e.reason));
 const ended=(kind:'pagehide'|'hidden')=>{if(me.end!=='pagehide')me.end=kind;me.endAt=Date.now();me.counters=counters();push(`lifecycle:${kind}`);save();};
 addEventListener('pagehide',()=>ended('pagehide'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)ended('hidden');else{me.end='running';push('lifecycle:visible');}});
 addEventListener('pageshow',e=>push('lifecycle:pageshow',{persisted:(e as PageTransitionEvent).persisted}));
 addEventListener('webglcontextlost',e=>mobileDebug.event('webgl:context-lost',{id:(e.target as HTMLElement)?.id||'?'}),true);
 addEventListener('webglcontextrestored',e=>mobileDebug.event('webgl:context-restored',{id:(e.target as HTMLElement)?.id||'?'}),true);
 // resource heartbeat: one small breadcrumb every 4 s while visible (plain timer, not an animation frame)
 window.setInterval(()=>{if(!document.hidden)push('heartbeat',counters());},4000);
 push('page:init',{session:me.id,nav,ua:me.ua,previous:verdict(previous)});save();}
boot();
export const mobileDebug={
 get enabled(){return enabled},
 event:push,
 error(event:string,error:unknown){me.lastError=`${event}: ${error instanceof Error?error.message:String(error)}`;push(event,{error:me.lastError});save();},
 asset(name:string,phase:'start'|'success'|'failure',detail:Detail={}){push(`asset:${phase}:${name}`,detail)},
 renderer(name:string,detail:Detail={}){push(`renderer:${name}`,detail)},
 canvas(name:string,w:number,h:number){push(`canvas:${name}`,{w,h})},
 spin(phase:'start'|'end'|'error',detail:Detail={}){push(`spin:${phase}`,{...detail,...counters()});save();},
 /** register a counter source (e.g. a WebGL renderer's info) that is sampled into the heartbeat and spin breadcrumbs */
 probe(name:string,fn:()=>Detail){if(enabled)probes.set(name,fn)},
 unprobe(name:string){probes.delete(name)},
 install(){if(!enabled||document.querySelector('#mobile-debug'))return;
  const root=document.createElement('aside');root.id='mobile-debug';
  root.innerHTML='<b>MOBILE DEBUG</b><span id="mobile-debug-stage">boot</span><small id="mobile-debug-error">—</small><small id="mobile-debug-prev">—</small><button type="button" data-copy>COPY NOW</button><button type="button" data-prev>COPY PREVIOUS</button><button type="button" data-hide>HIDE</button>';
  root.style.cssText='position:fixed;right:6px;top:calc(env(safe-area-inset-top) + 6px);z-index:2147483647;max-width:46vw;padding:5px 7px;border:1px solid #b99aff;border-radius:7px;background:#120b20e8;color:#fff;font:10px/1.25 ui-monospace,monospace;display:grid;gap:3px';
  for(const b of root.querySelectorAll('button'))b.style.cssText='font:inherit;padding:3px 4px;border-radius:5px;border:1px solid #888;background:#2a1d44;color:#fff';
  root.querySelector<HTMLButtonElement>('[data-copy]')!.onclick=()=>copy(JSON.stringify({now:{...me,counters:counters()},previous},null,1));
  root.querySelector<HTMLButtonElement>('[data-prev]')!.onclick=()=>copy(previous?JSON.stringify(previous,null,1):'No previous-session diagnostics stored');
  root.querySelector<HTMLButtonElement>('[data-hide]')!.onclick=()=>{root.style.display='none';};
  document.body.append(root);render();push('diagnostics-ready',{previous:!!previous})},
 previous(){return previous},
 flush(){save()},
};
