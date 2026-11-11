import {mobileDebug} from '../mobileDebug';
import {createAudioManager,type CtxLike} from './audioManager';import {SOUND_BY_ID} from './catalog';
const oggUrls=import.meta.glob('../../assets-2d/audio/skull_hunt_audio_pack/**/*.ogg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const wavUrls=import.meta.glob('../../assets-2d/audio/skull_hunt_audio_pack/**/*.wav',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const canOgg=(()=>{try{return !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"');}catch{return false;}})();
function pickUrl(id:string,m:Record<string,string>){const d=SOUND_BY_ID.get(id);if(!d)return '';const tail=`/${d.dir}/${id}.`;return Object.entries(m).find(([k])=>k.includes(tail))?.[1]??'';}
function urlFor(id:string){return (canOgg?pickUrl(id,oggUrls)||pickUrl(id,wavUrls):pickUrl(id,wavUrls)||pickUrl(id,oggUrls));}
const fetchBytes=async(u:string)=>{if(!u)throw new Error('no url');const r=await fetch(u);if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.arrayBuffer();};
/** The single game-wide audio manager. */
export const audio=createAudioManager({
 createContext:()=>{const C=(window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext);return new C({latencyHint:'interactive'}) as unknown as CtxLike;},
 load:id=>{mobileDebug.step(`audio:fetch:${id}`);return fetchBytes(urlFor(id)).then(b=>{mobileDebug.step(`audio:decode:${id}`,{bytes:b.byteLength});return b;});},
 loadFallback:id=>{const w=pickUrl(id,wavUrls);return w&&w!==urlFor(id)?fetchBytes(w):null;},
 storage:(()=>{try{return localStorage;}catch{return undefined;}})(),
 now:()=>performance.now(),isHidden:()=>document.hidden,
 onVisibility:fn=>{document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},
});
/** Browsers only allow audio after a gesture: the first one unlocks it (listeners are removed immediately — no duplicates). */
export function installAudioUnlock(){
 const evs=['pointerdown','keydown','touchend'] as const;const off=()=>evs.forEach(e=>window.removeEventListener(e,on,true));
 function on(){off();mobileDebug.step('audio:unlock');void audio.unlock().then(()=>mobileDebug.step('audio:unlocked'));}
 evs.forEach(e=>window.addEventListener(e,on,true));return off;
}
