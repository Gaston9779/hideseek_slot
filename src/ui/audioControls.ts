import {audio} from '../audio';import {cue} from '../audio/cues';import type {AudioSettings} from '../audio/audioManager';
/** AUDIO section of the existing menu + the control-bar audio button, both bound to the same manager state (they can never disagree). */
const ROWS:{label:string;on:keyof AudioSettings;vol:keyof AudioSettings}[]=[
 {label:'Master',on:'master',vol:'masterVol'},{label:'Music',on:'music',vol:'musicVol'},{label:'Sound Effects',on:'sfx',vol:'sfxVol'},{label:'Skull Voice',on:'voice',vol:'voiceVol'},{label:'Cinematics',on:'cinematic',vol:'cinematicVol'},
];
export function createAudioControls(menu:HTMLDialogElement,btn:HTMLButtonElement){
 const sec=document.createElement('section');sec.className='audio-menu';sec.setAttribute('aria-label','Audio');
 sec.innerHTML=`<h2>AUDIO</h2>`+ROWS.map(r=>`<div class="am-row"><label class="am-sw"><input type="checkbox" data-on="${r.on}" aria-label="${r.label} ON/OFF"><span class="am-knob"></span></label><span class="am-name">${r.label}</span><input type="range" min="0" max="100" step="1" data-vol="${r.vol}" aria-label="${r.label} volume"></div>`).join('');
 const anchor=menu.querySelector('.fine');menu.insertBefore(sec,anchor);
 const cleanups:(()=>void)[]=[];
 const on=<K extends keyof HTMLElementEventMap>(el:HTMLElement,ev:K,fn:(e:HTMLElementEventMap[K])=>void)=>{el.addEventListener(ev,fn);cleanups.push(()=>el.removeEventListener(ev,fn));};
 sec.querySelectorAll<HTMLInputElement>('input[data-on]').forEach(i=>on(i,'change',()=>{audio.set({[i.dataset.on!]:i.checked} as Partial<AudioSettings>);}));
 sec.querySelectorAll<HTMLInputElement>('input[data-vol]').forEach(i=>on(i,'input',()=>{audio.set({[i.dataset.vol!]:Number(i.value)/100} as Partial<AudioSettings>);}));
 sec.querySelectorAll<HTMLInputElement>('input[data-vol]').forEach(i=>on(i,'change',()=>cue.click()));   // audible feedback for the new level
 function render(){const s=audio.settings;
  sec.querySelectorAll<HTMLInputElement>('input[data-on]').forEach(i=>{i.checked=!!s[i.dataset.on as keyof AudioSettings];});
  sec.querySelectorAll<HTMLInputElement>('input[data-vol]').forEach(i=>{i.value=String(Math.round(Number(s[i.dataset.vol as keyof AudioSettings])*100));i.disabled=!s.master&&i.dataset.vol!=='masterVol';});
  const onNow=s.master;btn.setAttribute('aria-pressed',String(onNow));btn.title=onNow?'Audio ON':'Audio OFF';btn.setAttribute('aria-label',btn.title);}
 const off=audio.subscribe(render);render();
 // the button: master mute. Click feedback is played while the sound is (still) on.
 on(btn,'click',()=>{if(audio.settings.master){cue.click();audio.toggleMute();}else{audio.toggleMute();cue.click();}});
 return {render,dispose(){off();cleanups.forEach(f=>f());sec.remove();}};
}
