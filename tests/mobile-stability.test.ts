import {describe,expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createAudioManager,type CtxLike,type GainLike,type SourceLike} from '../src/audio/audioManager';
import {classify} from '../src/mobileDebug';
import {SYMBOLS} from '../src/config/game';
import {SYMBOL_ART} from '../src/config/presentation';
import {LAYER_FILES} from '../src/view/symbolFx';

const webp=(p:string)=>{const b=readFileSync(p),v=new DataView(b.buffer,b.byteOffset,b.byteLength),tag=(o:number)=>String.fromCharCode(v.getUint8(o),v.getUint8(o+1),v.getUint8(o+2),v.getUint8(o+3));
 expect(tag(0),p).toBe('RIFF');expect(tag(8),p).toBe('WEBP');const t=tag(12),u24=(o:number)=>v.getUint8(o)|v.getUint8(o+1)<<8|v.getUint8(o+2)<<16;
 if(t==='VP8X')return {w:1+u24(24),h:1+u24(27)};if(t==='VP8 ')return {w:v.getUint16(26,true)&0x3fff,h:v.getUint16(28,true)&0x3fff};if(t==='VP8L'){const bits=v.getUint32(21,true);return {w:1+(bits&0x3fff),h:1+((bits>>14)&0x3fff)};}throw new Error(t);};
describe('mobile stability',()=>{
 it('optimised art exists for every runtime image; phone variants have fewer decoded pixels',()=>{
  const O='assets-2d/optimized/';
  for(const n of ['cemetery-background','reel-frame','control-panel-audio','hide-seek-bonus','free-spins','buy-bonus-frame','chest-free-spins-hud','multiplier-x1','multiplier-x2','multiplier-x5']){
   const f=webp(`${O}${n}.webp`),m=webp(`${O}${n}.m.webp`);expect(m.w*m.h,n).toBeLessThan(f.w*f.h);expect(m.w/m.h,`${n} aspect`).toBeCloseTo(f.w/f.h,1);}
  for(const s of SYMBOLS)expect(webp(`${O}symbols/${SYMBOL_ART[s].file}.webp`)).toEqual({w:512,h:512});
  for(const f of Object.values(LAYER_FILES))expect(webp(`${O}layers/${f}.webp`)).toEqual({w:512,h:512});
  expect(webp('public/assets/ui/skull-hunt-logo-cropped.webp').w).toBe(840);
  expect(readFileSync('index.html','utf8')).not.toMatch(/\.png/);});
 it('PNG masters are still present (tools/tests) but no runtime source imports them',()=>{
  expect(existsSync('assets-2d/background/cemetery-background.png')).toBe(true);
  for(const f of ['src/view/assets.ts','src/ui/bonusAssets.ts'])expect(readFileSync(f,'utf8'),f).not.toMatch(/\.png['"]/);
  for(const s of SYMBOLS)expect(existsSync(`assets-2d/optimized/symbols/${SYMBOL_ART[s].file}.webp`),s).toBe(true);});
 it('classifies how the previous session ended',()=>{
  const s=(o:object)=>({id:'x',ua:'',nav:'',started:0,entries:[],latest:'',lastError:'',end:'running',endAt:0,spinning:false,spins:0,pending:[],device:'',...o}) as unknown as Parameters<typeof classify>[0];
  expect(classify(null,'navigate')).toBe('first-session');
  expect(classify(s({end:'running',spinning:true}),'navigate')).toBe('killed-during-spin');
  expect(classify(s({end:'running',pending:['a.webp']}),'navigate')).toBe('killed-during-asset-load');
  expect(classify(s({end:'running'}),'navigate')).toBe('killed-unexpected');
  expect(classify(s({end:'pagehide'}),'reload')).toBe('normal-reload');
  expect(classify(s({end:'pagehide'}),'navigate')).toBe('clean-end');
  expect(classify(s({end:'hidden'}),'navigate')).toBe('ended-hidden-then-new-session');});
 it('audio: an undecodable preferred file falls back to the WAV once, then plays',async()=>{
  let decodes=0,fallbacks=0;const src:SourceLike[]=[];
  const g=():GainLike=>({gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect:n=>n,disconnect(){}});
  const ctx={state:'running',currentTime:0,destination:{},createGain:g,createBufferSource:()=>{const s:SourceLike={buffer:null,loop:false,onended:null,connect:n=>n,disconnect(){},start(){},stop(){}};src.push(s);return s;},
   decodeAudioData:async()=>{decodes++;if(decodes===1)throw new Error('EncodingError');return {};},resume:async()=>{},suspend:async()=>{},close:async()=>{}} as unknown as CtxLike;
  const m=createAudioManager({createContext:()=>ctx,load:async()=>new ArrayBuffer(8),loadFallback:()=>{fallbacks++;return Promise.resolve(new ArrayBuffer(8));},now:()=>1e6,isHidden:()=>false,onVisibility:()=>()=>{}});
  await m.unlock();m.preload(['ui_click']);for(let i=0;i<10;i++)await Promise.resolve();
  expect(decodes).toBe(2);expect(fallbacks).toBe(1);expect(m.play('ui_click')).toBe(true);for(let i=0;i<6;i++)await Promise.resolve();expect(src.length).toBe(1);});
});

describe('crash-loop guard (platform/safeMode)',()=>{
 it('phones: no overlay canvases, no WebGL scenes (chase, chest scene, Skull, Buy chest), no video; desktop keeps everything',async()=>{
  const cap=async(phone:boolean)=>{const x=(await load({phone})).safe;return {effects:x.effects,atmo:x.atmo,fx:x.fxCanvas,ba:x.ba,bonus3d:x.bonus3d,skull3d:x.skull3d,buy3d:x.buy3d,symbolFx:x.symbolFx,video:x.video,audio:x.audio};};
  expect(await cap(true)).toEqual({effects:false,atmo:false,fx:false,ba:false,bonus3d:false,skull3d:false,buy3d:false,symbolFx:false,video:false,audio:true});
  expect(await cap(false)).toEqual({effects:true,atmo:true,fx:true,ba:true,bonus3d:true,skull3d:true,buy3d:true,symbolFx:true,video:true,audio:true});});
 const load=async(opts:{phone:boolean;stored?:object;search?:string})=>{
  const {vi}=await import('vitest');vi.resetModules();const mem=new Map<string,string>();if(opts.stored)mem.set('skull-hunt-guard:v1',JSON.stringify(opts.stored));
  const g=globalThis as unknown as Record<string,unknown>;
  g.localStorage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v);}};
  g.matchMedia=()=>({matches:opts.phone});Object.defineProperty(globalThis,'navigator',{value:{userAgent:opts.phone?'iPhone':'Mac'},configurable:true});g.location={search:opts.search??''};
  const m=await import('../src/platform/safeMode');return {safe:m.safe,mem};};
 it('desktop starts at level 0 with everything on; phones start at level 2 (no PMREM / WebGL Buy chest / symbol FX)',async()=>{
  const d=(await load({phone:false})).safe;expect([d.level,d.ibl,d.buy3d,d.symbolFx,d.skull3d]).toEqual([0,true,true,true,true]);
  const p=(await load({phone:true})).safe;expect([p.level,p.ibl,p.buy3d,p.symbolFx,p.skull3d]).toEqual([2,false,false,false,false]);});
 it('finding a "running" record (the page died) raises the level, stickily, up to 2 (no WebGL Skull)',async()=>{
  const a=await load({phone:true,stored:{state:'running',deaths:0,level:null,forced:null,lastDeath:0}});expect(a.safe.level).toBe(2);expect(a.safe.skull3d).toBe(false);expect(a.safe.diedLastTime).toBe(true);
  const rec=JSON.parse(a.mem.get('skull-hunt-guard:v1')!);expect(rec.state).toBe('running');expect(rec.level).toBe(2);
  const b=await load({phone:true,stored:{state:'clean',deaths:1,level:2,forced:null,lastDeath:1}});expect(b.safe.level).toBe(2);});
 it('?safe=N forces a level and ?safe=auto returns to automatic',async()=>{
  expect((await load({phone:true,search:'?safe=0'})).safe.level).toBe(0);
  const f=await load({phone:true,stored:{state:'clean',deaths:2,level:2,forced:null,lastDeath:1},search:'?safe=auto'});expect([f.safe.level,f.safe.deaths]).toEqual([2,0]);});
 it('forensic modes A-D enable exactly the documented resources and ignore the automatic levels',async()=>{
  const cap=async(m:string,extra='')=>{const x=(await load({phone:true,search:`?mode=${m}${extra}`,stored:{state:'running',deaths:0,level:null,forced:null,lastDeath:0}})).safe;return [x.audio,x.skull3d,x.ibl,x.buy3d,x.bonus3d,x.symbolFx,x.effects,x.video];};
  expect(await cap('A')).toEqual([false,false,false,false,false,false,false,false]);
  expect(await cap('B')).toEqual([true,false,false,false,false,false,false,false]);
  expect(await cap('C')).toEqual([true,true,true,false,false,false,false,false]);
  expect(await cap('c','&ibl=0')).toEqual([true,true,false,false,false,false,false,false]);
  expect(await cap('D')).toEqual([true,true,true,true,true,true,true,true]);});
});
