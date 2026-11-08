import {SOUND_BY_ID,SOUNDS,type Bus,type SoundDef} from './catalog';
/**
 * Central Audio Manager — ONE AudioContext, bus graph: source → voiceGain → bus (music|sfx|voice) → [music duck] → master → destination.
 * Everything environment-specific is injected (context factory, loader, storage, visibility) so the logic is unit-testable.
 * A missing/undecodable file only logs once; it never throws into the game.
 */
export interface GainParamLike{value:number;cancelScheduledValues(t:number):void;setValueAtTime(v:number,t:number):void;linearRampToValueAtTime(v:number,t:number):void}
export interface NodeLike{connect(n:unknown):unknown;disconnect():void}
export interface GainLike extends NodeLike{gain:GainParamLike}
export interface SourceLike extends NodeLike{buffer:unknown;loop:boolean;onended:(()=>void)|null;start(when?:number):void;stop(when?:number):void}
export interface CtxLike{state:string;currentTime:number;destination:unknown;createGain():GainLike;createBufferSource():SourceLike;decodeAudioData(b:ArrayBuffer):Promise<unknown>;resume():Promise<void>;suspend():Promise<void>;close():Promise<void>}
export interface AudioDeps{createContext():CtxLike;load(id:string):Promise<ArrayBuffer>;storage?:{getItem(k:string):string|null;setItem(k:string,v:string):void};now():number;isHidden():boolean;onVisibility(fn:()=>void):()=>void}
export interface AudioSettings{master:boolean;music:boolean;sfx:boolean;voice:boolean;cinematic:boolean;masterVol:number;musicVol:number;sfxVol:number;voiceVol:number;cinematicVol:number}
export const DEFAULT_SETTINGS:AudioSettings={master:true,music:true,sfx:true,voice:true,cinematic:true,masterVol:.8,musicVol:.3,sfxVol:.72,voiceVol:.72,cinematicVol:.62};
const KEY='skull-hunt-audio-v1',FADE=.25,VOICE_COOLDOWN_MS=2500;
const clamp=(x:number)=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
interface Inst{id:string;def:SoundDef;src:SourceLike;gain:GainLike;ended:boolean}
export function createAudioManager(deps:AudioDeps){
 let ctx:CtxLike|null=null,master:GainLike,buses:Record<Bus,GainLike>,duck:GainLike,unlocked=false,disposed=false;
 const s:AudioSettings={...DEFAULT_SETTINGS};
 try{const raw=deps.storage?.getItem(KEY);if(raw){const o=JSON.parse(raw) as Partial<AudioSettings>;for(const k of Object.keys(s) as (keyof AudioSettings)[]){const v=o[k];if(typeof v==='boolean'&&typeof s[k]==='boolean')(s as unknown as Record<string,unknown>)[k]=v;else if(typeof v==='number'&&typeof s[k]==='number')(s as unknown as Record<string,unknown>)[k]=clamp(v);}}}catch{/* ignore corrupt prefs */}
 const buffers=new Map<string,unknown>(),loading=new Map<string,Promise<unknown|null>>(),failed=new Set<string>(),active:Inst[]=[],lastStart=new Map<string,number>();
 let lastVoiceAt=-1e9,voiceInst:Inst|null=null,wantAmbient:string|null=null,ambInst:Inst|null=null,duckLevel=1;const listeners=new Set<()=>void>();let offVis:(()=>void)|null=null;
 const busEnabled=(b:Bus)=>s.master&&s[b];
 function applyGains(){if(!ctx)return;const t=ctx.currentTime;set(master.gain,s.master?s.masterVol:0,t,.05);set(buses.music.gain,busEnabled('music')?s.musicVol:0,t,.1);set(buses.sfx.gain,busEnabled('sfx')?s.sfxVol:0,t,.05);set(buses.voice.gain,busEnabled('voice')?s.voiceVol:0,t,.05);set(buses.cinematic.gain,busEnabled('cinematic')?s.cinematicVol:0,t,.08);}
 function set(p:GainParamLike,v:number,t:number,dur:number){p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(v,t+dur);if(dur===0)p.value=v;}
 function save(){try{deps.storage?.setItem(KEY,JSON.stringify(s));}catch{/* ignore */}for(const l of listeners)l();}
 function ensureCtx(){if(ctx||disposed)return;ctx=deps.createContext();master=ctx.createGain();duck=ctx.createGain();buses={music:ctx.createGain(),sfx:ctx.createGain(),voice:ctx.createGain(),cinematic:ctx.createGain()};
  buses.music.connect(duck);duck.connect(master);buses.sfx.connect(master);buses.voice.connect(master);buses.cinematic.connect(master);master.connect(ctx.destination);applyGains();
  if(!offVis)offVis=deps.onVisibility(()=>{if(!ctx||!unlocked)return;if(deps.isHidden())void ctx.suspend().catch(()=>{});else if(s.master)void ctx.resume().catch(()=>{});});}
 function load(id:string):Promise<unknown|null>{if(buffers.has(id))return Promise.resolve(buffers.get(id)!);if(failed.has(id)||!ctx)return Promise.resolve(null);let p=loading.get(id);if(!p){const c=ctx;p=deps.load(id).then(b=>c.decodeAudioData(b)).then(b=>{buffers.set(id,b);loading.delete(id);return b;}).catch(e=>{failed.add(id);loading.delete(id);console.warn(`[audio] "${id}" unavailable`,e);return null;});loading.set(id,p);}return p;}
 function kill(i:Inst,fade=FADE){if(i.ended)return;i.ended=true;const t=ctx!.currentTime;try{set(i.gain.gain,0,t,fade);i.src.stop(t+fade+.02);}catch{/* already stopped */}remove(i);}
 function remove(i:Inst){const k=active.indexOf(i);if(k>=0)active.splice(k,1);if(voiceInst===i)voiceInst=null;if(ambInst===i)ambInst=null;}
 function start(def:SoundDef,buf:unknown,vol:number,fadeIn:number,rate=1):Inst|null{
  if(!ctx)return null;const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buf;src.loop=!!def.loop;void rate;g.gain.value=fadeIn?0:def.gain*vol;src.connect(g);g.connect(buses[def.bus]);
  const inst:Inst={id:def.id,def,src,gain:g,ended:false};active.push(inst);src.onended=()=>{if(!inst.ended){inst.ended=true;remove(inst);try{g.disconnect();}catch{/* */}}};
  src.start(0);if(fadeIn)set(g.gain,def.gain*vol,ctx.currentTime,fadeIn);return inst;}
 const api={
  get unlocked(){return unlocked;},get context(){return ctx;},
  get settings():Readonly<AudioSettings>{return s;},
  /** true when nothing is audible (master off) */
  get muted(){return !s.master;},
  subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
  /** Call from a user gesture. Idempotent. Starts the wanted ambience and preloads the small critical cues. */
  async unlock(){if(disposed)return;ensureCtx();if(!ctx)return;unlocked=true;applyGains();const c=ctx;api.preload(SOUNDS.filter(x=>x.critical).map(x=>x.id));if(wantAmbient)api.ambient(wantAmbient,1.2);try{if(c.state!=='running'&&s.master)await c.resume();}catch{/* autoplay still blocked */}},
  preload(ids:string[]){for(const id of ids)void load(id);},
  /** Fire-and-forget one-shot. Returns false when ignored (locked, muted bus, rate-limited, unknown id, voice busy). Never throws. */
  play(id:string,o:{volume?:number;fade?:number}={}):boolean{
   try{const def=SOUND_BY_ID.get(id);if(!def||!ctx||!unlocked||disposed||deps.isHidden())return false;
    if(!busEnabled(def.bus))return false;const now=deps.now();if(now-(lastStart.get(id)??-1e9)<(def.gapMs??40))return false;
    if(def.bus==='voice'){const pr=def.priority??1;if(voiceInst&&!voiceInst.ended){if(pr<=(voiceInst.def.priority??1))return false;kill(voiceInst,.08);}else if(now-lastVoiceAt<VOICE_COOLDOWN_MS&&pr<2)return false;}
    // A high-priority real event (trigger, win or cinematic hit) displaces lower-priority
    // sounds on the same bus instead of stacking into a peak during fast spins.
    const priority=def.priority??0;if(priority>=2)for(const i of [...active])if(i.def.bus===def.bus&&!i.def.loop&&(i.def.priority??0)<priority)kill(i,.04);
    lastStart.set(id,now);if(def.bus==='voice')lastVoiceAt=now;
    const buf=buffers.get(id);const go=(b:unknown)=>{if(disposed||!ctx)return;const i=start(def,b,o.volume??1,o.fade??0);if(i&&def.bus==='voice')voiceInst=i;};
    if(buf)go(buf);else if(!failed.has(id)){const asked=now;void load(id).then(b=>{if(b&&(def.loop||deps.now()-asked<1200))go(b);});}
    return true;}catch(e){console.warn('[audio] play failed',e);return false;}},
  /** Stop every running instance of an id (optionally only the id prefix when `prefix`). */
  stop(id:string,fade=FADE,prefix=false){for(const i of [...active])if(prefix?i.id.startsWith(id):i.id===id)kill(i,fade);},
  stopAll(fade=.1){for(const i of [...active])kill(i,fade);},
  /** Looping music/ambience: one at a time; switching crossfades. null = fade out. */
  ambient(id:string|null,fade=1.5){wantAmbient=id;if(!ctx||!unlocked)return;if(ambInst&&ambInst.id===id)return;const old=ambInst;if(old){kill(old,fade);ambInst=null;}if(!id)return;const def=SOUND_BY_ID.get(id);if(!def)return;
   // Multiple calls can happen while a loop is decoding (initial unlock, view startup and a
   // resumed scene). Start only one instance once that shared request resolves.
   const run=(b:unknown)=>{if(wantAmbient!==id||disposed||ambInst?.id===id)return;ambInst=start(def,b,1,fade);};const b=buffers.get(id);if(b)run(b);else void load(id).then(x=>{if(x)run(x);});},
  /** Lower the music bus under important cues; unduck() restores gradually. */
  duck(level=.35,attack=.25){if(!ctx)return;duckLevel=clamp(level);set(duck.gain,duckLevel,ctx.currentTime,attack);},
  unduck(release=1.2){if(!ctx)return;duckLevel=1;set(duck.gain,1,ctx.currentTime,release);},
  get duckLevel(){return duckLevel;},
  set(patch:Partial<AudioSettings>){for(const k of Object.keys(patch) as (keyof AudioSettings)[]){const v=patch[k];if(typeof v==='boolean'&&typeof s[k]==='boolean')(s as unknown as Record<string,unknown>)[k]=v;else if(typeof v==='number'&&typeof s[k]==='number')(s as unknown as Record<string,unknown>)[k]=clamp(v);}
   applyGains();if(ctx&&unlocked){if(s.master&&ctx.state!=='running'&&!deps.isHidden())void ctx.resume().catch(()=>{});}save();},
  /** returns the new master-enabled state */
  toggleMute(){api.set({master:!s.master});return s.master;},
  get activeCount(){return active.length;},
  dispose(){disposed=true;offVis?.();offVis=null;for(const i of [...active])kill(i,0);listeners.clear();buffers.clear();loading.clear();try{void ctx?.close();}catch{/* */}ctx=null;},
 };
 return api;
}
export type AudioManager=ReturnType<typeof createAudioManager>;
