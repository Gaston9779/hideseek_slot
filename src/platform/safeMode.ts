/**
 * Crash-loop guard + feature switches for phones.
 *
 * A browser that kills the page (iOS WebContent jetsam) raises no JavaScript event, so the only reliable signal is *absence*:
 * a record is set to "running" at boot and to "clean" on pagehide/hidden. Finding "running" at the next boot means the previous
 * session died in the foreground. Each such death raises a STICKY safe level, so the game stops repeating whatever killed it:
 *   level 0  full visuals (desktop default)
 *   level 1  phones' baseline: no image-based lighting (PMREM), no WebGL Buy chest (2D chest), no symbol FX layers
 *   level 2  also no WebGL Skull (2D-less stub; the slot itself is plain canvas 2D)
 * Phones start at level 1 (see `level`), a death raises it by one (max 2). `?safe=0|1|2` forces a level and sticks,
 * `?safe=auto` returns to automatic. Nothing here touches the maths, balance or persistence of the game.
 */
const KEY='skull-hunt-guard:v1';
type Rec={state:'running'|'clean';deaths:number;level:number|null;forced:number|null;lastDeath:number;paint?:number};
const read=():Rec=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'null') as Partial<Rec>|null;if(o&&(o.state==='running'||o.state==='clean'))return {state:o.state,deaths:+(o.deaths??0)||0,level:typeof o.level==='number'?o.level:null,forced:typeof o.forced==='number'?o.forced:null,lastDeath:+(o.lastDeath??0)||0,paint:+(o.paint??0)||0};}catch{/* private mode / corrupt */}return {state:'clean',deaths:0,level:null,forced:null,lastDeath:0};};
const write=(r:Rec)=>{try{localStorage.setItem(KEY,JSON.stringify(r));}catch{/* storage unavailable: the guard simply does not persist */}};
const phone=typeof matchMedia!=='undefined'&&(matchMedia('(pointer: coarse)').matches||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
const rec=read();
const q=typeof location!=='undefined'?new URLSearchParams(location.search).get('safe'):null;
if(q==='auto'){rec.forced=null;rec.level=null;rec.deaths=0;}else if(q==='0'||q==='1'||q==='2')rec.forced=+q;
const diedLastTime=rec.state==='running';
if(diedLastTime){rec.deaths++;rec.lastDeath=Date.now();rec.level=Math.min(2,Math.max(rec.level??(phone?1:0),phone?1:0)+1);}
/** Paint levels (sticky, +1 per death, max 3), applied as html[data-paint] before the first paint. The crash evidence (breadcrumbs from a real device) shows the page
 *  fully booted (init:ready) and then dying ~1 s later, i.e. at the first composite of the visible 1920×1080 stage, not in JS/WebGL/audio:
 *   1 no opacity transition on the stage reveal / loading overlay   2 + no CSS filters, blend modes, masks, shadows   3 + effect canvases removed */
if(diedLastTime)rec.paint=Math.min(3,(rec.paint??0)+1);
const pq=typeof location!=='undefined'?new URLSearchParams(location.search).get('paint'):null;
const paint=pq!==null&&/^[0-3]$/.test(pq)?+pq:q==='auto'?0:rec.paint??0;if(q==='auto')rec.paint=0;
if(typeof document!=='undefined')document.documentElement.dataset.paint=String(paint);
const base=phone?2:0;   // phones start with NO WebGL at boot (no Skull, no PMREM, no Buy chest, no symbol FX); the chase / chest scene stay lazy
/** Forensic isolation modes (?mode=A|B|C|D). A resource that a mode disables is never created or requested — not hidden.
 *   A  essential 2D slot: no audio, no WebGL, no effects, no video
 *   B  A + audio
 *   C  B + WebGL Skull (nothing else uses WebGL)
 *   D  everything (bonus scenes, chase, Buy chest, symbol FX, effects, video)
 *  `&ibl=0|1` overrides image-based lighting (PMREM) in C/D. With a mode in the URL the automatic levels are ignored. */
export type Mode='A'|'B'|'C'|'D';
const mq=(typeof location!=='undefined'?new URLSearchParams(location.search).get('mode'):null)?.toUpperCase();
const mode:Mode|null=mq==='A'||mq==='B'||mq==='C'||mq==='D'?mq:null;
const iblQ=typeof location!=='undefined'?new URLSearchParams(location.search).get('ibl'):null;
const level=rec.forced??Math.max(base,rec.level??0);
/** Bisect switches for the forensic loop: ?off=effects,audio,video,buy,reelfx removes that part (never created). */
const off=new Set((typeof location!=='undefined'?new URLSearchParams(location.search).get('off')??'':'').split(',').filter(Boolean));
export const safe={
 /** the level in force for this page load (ignored when a mode is set) */
 level,mode,paint,
 deaths:rec.deaths,diedLastTime,forced:rec.forced!==null,phone,
 /** image-based lighting (PMREM) — the most exotic WebGL work at boot */
 get ibl(){return mode?(mode==='C'||mode==='D')&&iblQ!=='0':level===0;},
 get buy3d(){return mode?mode==='D':level<1;},
 get symbolFx(){return mode?mode==='D':level<1;},
 get skull3d(){return mode?(mode==='C'||mode==='D'):level<2;},
 /** chase, chest-bonus scene, Baby Skull portrait: all WebGL */
 get bonus3d(){return mode?mode==='D':!phone;},   // phones: no chase / chest-scene / portrait WebGL at all; the bonus runs on 2D presentations
 get audio(){return !off.has('audio')&&(mode?mode!=='A':true);},
 get buyWidget(){return !off.has('buy');},
 /** atmosphere canvas, particles, bonus atmosphere */
 get effects(){return !off.has('effects')&&(mode?mode==='D':!phone);},   // phones: no #atmo / #fx / bonus-atmosphere canvases or loops
 /** independent diagnostic switches (?off=atmo|fx|ba, or ?off=effects for all three); no parameter = unchanged behaviour */
 /** diagnostic: backing-store scale of the #atmo and #fx canvases (?fxscale=0.5); default 1 = unchanged */
 get layerScaleSet(){return typeof location!=='undefined'&&new URLSearchParams(location.search).has('fxscale');},
 get layerScale(){const v=typeof location!=='undefined'?parseFloat(new URLSearchParams(location.search).get('fxscale')??''):NaN;return Number.isFinite(v)&&v>=.25&&v<=1?v:1;},
 get atmo(){return safe.effects&&!off.has('atmo');},
 get fxCanvas(){return safe.effects&&!off.has('fx');},
 get ba(){return safe.effects&&!off.has('ba');},
 get video(){return !off.has('video')&&(mode?mode==='D':!phone);},
 set(level:number|'auto'){const r=read();if(level==='auto'){r.forced=null;r.level=null;r.deaths=0;}else r.forced=level;write(r);},
};
write({...rec,state:'running'});
if(typeof document!=='undefined'){
 const clean=()=>{const r=read();write({...r,state:'clean'});};
 addEventListener('pagehide',clean);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clean();else write({...read(),state:'running'});});
}
