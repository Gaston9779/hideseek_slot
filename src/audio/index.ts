import {createAudioManager,type CtxLike} from './audioManager';import {SOUND_BY_ID} from './catalog';
const oggUrls=import.meta.glob('../../assets-2d/audio/skull_hunt_audio_pack/**/*.ogg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const wavUrls=import.meta.glob('../../assets-2d/audio/skull_hunt_audio_pack/**/*.wav',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const canOgg=(()=>{try{return !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"');}catch{return false;}})();
function urlFor(id:string){const d=SOUND_BY_ID.get(id);if(!d)return '';const tail=`/${d.dir}/${id}.`;const pick=(m:Record<string,string>)=>Object.entries(m).find(([k])=>k.includes(tail))?.[1];return (canOgg?pick(oggUrls)??pick(wavUrls):pick(wavUrls)??pick(oggUrls))??'';}
/** The single game-wide audio manager. */
export const audio=createAudioManager({
 createContext:()=>{const C=(window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext);return new C({latencyHint:'interactive'}) as unknown as CtxLike;},
 load:async id=>{const u=urlFor(id);if(!u)throw new Error('no url');const r=await fetch(u);if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.arrayBuffer();},
 storage:(()=>{try{return localStorage;}catch{return undefined;}})(),
 now:()=>performance.now(),isHidden:()=>document.hidden,
 onVisibility:fn=>{document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},
});
/** Browsers only allow audio after a gesture: the first one unlocks it (listeners are removed immediately — no duplicates). */
export function installAudioUnlock(){
 const evs=['pointerdown','keydown','touchend'] as const;const off=()=>evs.forEach(e=>window.removeEventListener(e,on,true));
 function on(){off();void audio.unlock();}
 evs.forEach(e=>window.addEventListener(e,on,true));return off;
}
