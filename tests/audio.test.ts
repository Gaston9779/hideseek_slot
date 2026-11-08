import {describe,expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createAudioManager,type CtxLike,type GainLike,type SourceLike} from '../src/audio/audioManager';
import {SOUNDS} from '../src/audio/catalog';

function rig(opts:{failIds?:string[];hidden?:boolean;stored?:string}={}){
 const st={contexts:0,sources:[] as SourceLike[],gains:[] as GainLike[],now:10_000,hidden:!!opts.hidden,visListeners:0,visFn:null as null|(()=>void),closed:false,suspended:0,resumed:0,state:'suspended',saved:opts.stored??null as string|null};
 const mkGain=():GainLike=>{const g={connections:[] as unknown[],gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(v:number){this.value=v;}},connect(n:unknown){g.connections.push(n);return n;},disconnect(){}};return g as unknown as GainLike;};
 const ctx:CtxLike={get state(){return st.state;},currentTime:0,destination:{},createGain:()=>{const g=mkGain();st.gains.push(g);return g;},
  createBufferSource:()=>{const s:SourceLike={buffer:null,loop:false,onended:null,connect:()=>s,disconnect(){},start(){},stop(){}};st.sources.push(s);return s;},
  decodeAudioData:async()=>({}),resume:async()=>{st.state='running';st.resumed++;},suspend:async()=>{st.state='suspended';st.suspended++;},close:async()=>{st.closed=true;}} as CtxLike;
 const m=createAudioManager({createContext:()=>{st.contexts++;return ctx;},load:async id=>{if(opts.failIds?.includes(id))throw new Error('404');return new ArrayBuffer(8);},
  storage:{getItem:()=>st.saved,setItem:(_k,v)=>{st.saved=v;}},now:()=>st.now,isHidden:()=>st.hidden,onVisibility:fn=>{st.visListeners++;st.visFn=fn;return()=>{st.visListeners--;};}});
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 return {m,st,flush};
}
const unlocked=async(o={})=>{const r=rig(o);await r.m.unlock();r.m.preload(['ui_click','reel_stop','baby_skull_happy','baby_skull_win','baby_skull_scared','amb_spooky_graveyard_loop','amb_bonus_chest_loop','win_max']);await r.flush();return r;};

describe('audio manager',()=>{
 it('one AudioContext, idempotent unlock, no sound before the user gesture',async()=>{
  const r=rig();expect(r.m.play('ui_click')).toBe(false);await r.m.unlock();await r.m.unlock();expect(r.st.contexts).toBe(1);expect(r.m.unlocked).toBe(true);
  r.m.preload(['ui_click']);await r.flush();for(let i=0;i<5;i++){r.st.now+=500;r.m.play('ui_click');}expect(r.st.contexts).toBe(1);});
 it('mute ON/OFF: master gain follows, play is refused while muted, preference persisted',async()=>{
  const {m,st,flush}=await unlocked();const master=st.gains[0]!;expect(master.gain.value).toBeGreaterThan(0);
  expect(m.toggleMute()).toBe(false);expect(m.muted).toBe(true);expect(master.gain.value).toBe(0);st.now+=1000;expect(m.play('ui_click')).toBe(false);expect(JSON.parse(st.saved!).master).toBe(false);
  expect(m.toggleMute()).toBe(true);expect(master.gain.value).toBeGreaterThan(0);st.now+=1000;expect(m.play('ui_click')).toBe(true);await flush();});
 it('per-bus switches and volumes act on the right bus only',async()=>{
  const {m,st}=await unlocked();m.set({sfx:false});st.now+=1000;expect(m.play('reel_stop')).toBe(false);expect(m.play('baby_skull_happy')).toBe(true);m.set({sfx:true,voice:false});st.now+=5000;expect(m.play('baby_skull_win')).toBe(false);
  m.set({musicVol:2,sfxVol:-1});expect(m.settings.musicVol).toBe(1);expect(m.settings.sfxVol).toBe(0);});
 it('restores saved preferences and ignores a corrupt value',()=>{const a=rig({stored:JSON.stringify({master:false,musicVol:.1,sfxVol:'x'})});expect(a.m.settings.master).toBe(false);expect(a.m.settings.musicVol).toBe(.1);expect(a.m.settings.sfxVol).toBe(.72);});
 it('rate limiting: the same cue cannot machine-gun',async()=>{const {m,st}=await unlocked();st.now+=1000;expect(m.play('reel_stop')).toBe(true);expect(m.play('reel_stop')).toBe(false);st.now+=100;expect(m.play('reel_stop')).toBe(true);});
 it('voices never overlap and are not played at every event (cooldown); a higher priority voice may interrupt',async()=>{
  const {m,st,flush}=await unlocked();st.now+=10_000;expect(m.play('baby_skull_happy')).toBe(true);await flush();expect(m.play('baby_skull_searching')).toBe(false);
  st.now+=100;expect(m.play('baby_skull_win')).toBe(true);await flush();const voices=st.sources.length;expect(voices).toBeGreaterThan(0);
  st.now+=500;expect(m.play('baby_skull_searching')).toBe(false);expect(m.play('baby_skull_scared')).toBe(false);   // equal priority (2) while the win voice plays
 });
 it('missing file: never throws, play still returns, later calls stay silent',async()=>{
  const {m,st,flush}=await unlocked({failIds:['win_max']});st.now+=5000;expect(()=>m.play('win_max')).not.toThrow();await flush();st.now+=5000;expect(()=>m.play('win_max')).not.toThrow();expect(m.play('does_not_exist')).toBe(false);});
 it('ambience: one loop at a time, crossfades to the chest loop and back; fades out',async()=>{
  const {m,flush}=await unlocked();m.ambient('amb_spooky_graveyard_loop',1);await flush();expect(m.activeCount).toBe(1);
  m.ambient('amb_bonus_chest_loop',1);await flush();expect(m.activeCount).toBe(1);m.ambient('amb_spooky_graveyard_loop',1);await flush();expect(m.activeCount).toBe(1);m.ambient(null);expect(m.activeCount).toBe(0);});
 it('ambience requested before unlock starts after unlock',async()=>{const r=rig();r.m.ambient('amb_spooky_graveyard_loop');expect(r.m.activeCount).toBe(0);await r.m.unlock();await r.flush();expect(r.m.activeCount).toBe(1);});
 it('repeated ambience requests while decoding still create one loop instance',async()=>{const r=rig();await r.m.unlock();r.m.ambient('amb_spooky_graveyard_loop');r.m.ambient('amb_spooky_graveyard_loop');await r.flush();expect(r.m.activeCount).toBe(1);});
 it('ducking lowers and restores the music path',async()=>{const {m}=await unlocked();m.duck(.3);expect(m.duckLevel).toBe(.3);m.unduck();expect(m.duckLevel).toBe(1);});
 it('hidden tab: no new sounds; visibility listener registered once and removed on dispose',async()=>{
  const {m,st}=await unlocked();expect(st.visListeners).toBe(1);st.hidden=true;st.now+=1000;expect(m.play('ui_click')).toBe(false);st.visFn!();expect(st.suspended).toBe(1);st.hidden=false;st.visFn!();expect(st.resumed).toBeGreaterThan(0);
  m.dispose();expect(st.visListeners).toBe(0);expect(st.closed).toBe(true);expect(m.activeCount).toBe(0);});
});
describe('sound pack',()=>{
 it('catalogue == manifest (35 sounds) and every OGG (and WAV fallback) exists',()=>{
  const man=JSON.parse(readFileSync('assets-2d/audio/skull_hunt_audio_pack/manifest.json','utf8')) as {items:{id:string;ogg:string;wav:string}[]};
  expect(man.items.map(i=>i.id).sort()).toEqual(SOUNDS.map(s=>s.id).sort());expect(SOUNDS).toHaveLength(35);
  for(const i of man.items){expect(existsSync(`assets-2d/audio/skull_hunt_audio_pack/${i.ogg}`),i.ogg).toBe(true);expect(existsSync(`assets-2d/audio/skull_hunt_audio_pack/${i.wav}`),i.wav).toBe(true);}
 });
});
