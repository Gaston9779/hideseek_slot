import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {SOUNDS} from '../src/audio/catalog';
const read=(f:string)=>readFileSync(f,'utf8');
const cues=read('src/audio/cues.ts');
const callers=['src/main.ts','src/view/view.ts','src/view/reels.ts','src/chase/director.ts','src/chase/bonusCinematic.ts','src/bonus/bonusOverlay.ts','src/ui/gameplayUi.ts','src/ui/buyBonusWidget.ts','src/ui/audioControls.ts'].map(read).join('\n');
describe('audio wiring (every pack sound is connected to a game event)',()=>{
 it('every one of the 35 sound ids is referenced by the cue map',()=>{for(const s of SOUNDS)expect(cues.includes(`'${s.id}'`),s.id).toBe(true);});
 it('every cue is actually called from the game code',()=>{
  const names=[...cues.matchAll(/^ ([a-zA-Z]+)\(/gm)].map(m=>m[1]!);expect(names.length).toBeGreaterThan(20);
  for(const n of names)expect(callers.includes(`cue.${n}(`),n).toBe(true);});
 it('exactly one window-level unlock installation and no per-effect AudioContext',()=>{
  const all=[cues,callers,read('src/audio/index.ts'),read('src/audio/audioManager.ts')].join('\n');
  expect((all.match(/new C\(|new AudioContext\(/g)??[]).length).toBe(1);expect((callers.match(/installAudioUnlock\(\)/g)??[]).length).toBe(1);});
 it('audio never reaches into the engine or math',()=>{for(const f of ['src/audio/cues.ts','src/audio/audioManager.ts','src/audio/catalog.ts','src/audio/index.ts'])expect(/engine\/game|math\//.test(read(f)),f).toBe(false);});
});
