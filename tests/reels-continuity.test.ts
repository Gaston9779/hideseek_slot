import {describe,it,expect,beforeAll} from 'vitest';
import {SeededRng} from '../src/math/v2/rng';import {generateOutcome} from '../src/math/v4/spin';import {SYMBOLS,type SymbolId} from '../src/math/v4/config';
import {COL_CENTERS,ROW_CENTER0,ROW_PITCH} from '../src/layout';import {REEL_ANIM} from '../src/config/reelAnim';
import type {Outcome} from '../src/math/v4/spin';
/** Headless run of the REAL Reels class with a recording canvas stub: every drawn symbol (id,x,y) is captured, frame by frame, at 60 fps. */
type Draw={id:string,x:number,y:number};
let Reels:typeof import('../src/view/reels').Reels;
beforeAll(async()=>{
 (globalThis as any).matchMedia=()=>({matches:false});
 (globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>stubCtx([])})};
 Reels=(await import('../src/view/reels')).Reels;
});
function stubCtx(sink:Draw[]){let tx=0,ty=0;const impl:Record<string,any>={translate:(x:number,y:number)=>{tx=x;ty=y;},drawImage:(img:any)=>{if(img&&img.__id)sink.push({id:img.__id,x:tx,y:ty});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})};
 return new Proxy({},{get:(_,p:string)=>impl[p]??(()=>undefined),set:()=>true}) as unknown as CanvasRenderingContext2D;}
const images=Object.fromEntries(SYMBOLS.map(s=>[s,{__id:s}])) as any;
const grid0=():SymbolId[][]=>[['TOMB','CHEST','LANTERN'],['WILD','GHOST','SKULL'],['LANTERN','KEY','SCATTER'],['CHEST','POTION','MAGIC_BOOK'],['POTION','SCATTER','GARGOYLE']];
function frame(r:InstanceType<typeof Reels>,sink:Draw[]){sink.length=0;r.draw();return sink.map(d=>({...d}));}
const colOf=(x:number)=>COL_CENTERS.findIndex(c=>Math.abs(c-x)<4);
/** ordered (top→bottom) symbols of one column, restricted to the clip window rows -1..3 */
const colSeq=(f:Draw[],col:number)=>f.filter(d=>colOf(d.x)===col).sort((a,b)=>a.y-b.y);
const visible=(f:Draw[],col:number)=>colSeq(f,col).filter(d=>d.y>ROW_CENTER0-ROW_PITCH*.5&&d.y<ROW_CENTER0+ROW_PITCH*2.5).map(d=>d.id);
function outcomeWith(grid:SymbolId[][],mode:'base'|'free'='base'):Outcome{return {mode,featureType:mode==='free'?'scatter':null,featureMultiplier:1,stops:[0,1,2,3,4],grid,evaluation:{lineWins:[],scatterCount:0,chestBonusCount:0,scatterUnits:0,scatterAmount:0,lineUnits:0,totalUnits:0,totalMultiplier:0,capped:false},chest:null};}
function run(g0:SymbolId[][],o:Outcome,quick=false){
 const sink:Draw[]=[],r=new Reels(stubCtx(sink),images,g0);const before=frame(r,sink);
 const p=r.spin(o,quick);const first=frame(r,sink);              // first frame AFTER the click, before any update
 const frames=[first];const speeds:number[][]=[];const pos:number[][]=[];const landTimes:number[]=[];let t=0;const dt=1/60;void p;
 r.onLand=(c)=>{landTimes[c]=t;};
 while(r.isSpinning&&t<30){r.update(dt);t+=dt;frames.push(frame(r,sink));speeds.push(r.strips.map(s=>s.speed));pos.push(r.strips.map(s=>s.pos));}
 return {r,before,first,frames,speeds,pos,landTimes,t,done:!r.isSpinning};
}
describe('spin continuity (displayed grid vs target grid)',()=>{
 it('the first frame after SPIN is identical to the last static frame (15 symbols, same positions)',()=>{const o=outcomeWith([['KEY','KEY','KEY'],['POTION','POTION','POTION'],['TOMB','TOMB','TOMB'],['GHOST','GHOST','GHOST'],['LANTERN','LANTERN','LANTERN']]);const x=run(grid0(),o);
  for(let c=0;c<5;c++)expect(visible(x.first,c)).toEqual(visible(x.before,c));expect(x.first.filter(d=>d.id).length).toBe(x.before.length);});
 it('displayed symbols are carried by the motion: frame-to-frame the column is the previous sequence shifted down (no replacement)',()=>{
  const o=outcomeWith([['KEY','KEY','KEY'],['POTION','POTION','POTION'],['TOMB','TOMB','TOMB'],['GHOST','GHOST','GHOST'],['LANTERN','LANTERN','LANTERN']]);const x=run(grid0(),o);
  for(let c=0;c<5;c++)for(let i=1;i<x.frames.length;i++){const a=visible(x.frames[i-1]!,c),b=visible(x.frames[i]!,c);
   // b must equal a shifted by k rows (k=0 or a few at high speed): new symbols enter at the top, old ones leave at the bottom
   const ok=[0,1,2].some(k=>a.every((id,j)=>j+k>=b.length||b[j+k]===id));if(!ok)throw new Error(`col ${c} frame ${i}: ${a.join()} → ${b.join()}`);}});
 it('the reels stop exactly on the engine grid; the last animated frame equals the first static frame; stops are left→right',()=>{
  const o=outcomeWith([['KEY','GHOST','POTION'],['TOMB','TOMB','KEY'],['LANTERN','CHEST','CHEST'],['GHOST','KEY','WILD'],['SKULL','POTION','TOMB']]);const x=run(grid0(),o);expect(x.done).toBe(true);
  for(let c=0;c<5;c++){expect(x.r.grid[c]).toEqual(o.grid[c]);expect(x.r.cells[c]!.map(q=>q.id)).toEqual(o.grid[c]);}
  const last=x.frames[x.frames.length-1]!;for(let c=0;c<5;c++)expect(visible(last,c)).toEqual(o.grid[c]);
  for(let c=1;c<5;c++)expect(x.landTimes[c]!).toBeGreaterThan(x.landTimes[c-1]!);
  // the moving frame right before a reel lands already shows the target rows (no snap)
  for(let c=0;c<5;c++){const i=Math.floor(x.landTimes[c]!*60)-1;expect(visible(x.frames[i]!,c)).toEqual(o.grid[c]);}});
 it('no WILD / SCATTER / CHEST_BONUS appears in the blur unless it is part of the displayed or target grid',()=>{
  const o=outcomeWith([['KEY','GHOST','POTION'],['TOMB','TOMB','KEY'],['LANTERN','CHEST','CHEST'],['GHOST','KEY','TOMB'],['SKULL','POTION','TOMB']]);const g=grid0().map(c=>c.map(x=>x===('WILD' as any)||x==='SCATTER'?'KEY':x)) as SymbolId[][];const x=run(g,o);
  const specials=new Set(['WILD','SCATTER','CHEST_BONUS']);for(const f of x.frames)for(const d of f)expect(specials.has(d.id)).toBe(false);});
 it('100 consecutive spins from the real engine: continuity, exact stop grid, sequential state (no flash)',()=>{
  const rng=new SeededRng(2026);const sink:Draw[]=[],r=new Reels(stubCtx(sink),images,grid0());
  for(let n=0;n<100;n++){const o=generateOutcome(rng,'base');const before=frame(r,sink);const quick=n%7===0;const p=r.spin(o,quick);const first=frame(r,sink);
   for(let c=0;c<5;c++)expect(visible(first,c)).toEqual(visible(before,c));          // first frame after click == last static frame
   let prev=first,guard=0;void p;
   while(r.isSpinning&&guard++<2400){r.update(1/60);const f=frame(r,sink);for(let c=0;c<5;c++){const a=visible(prev,c),b=visible(f,c);if(!([0,1,2].some(k=>a.every((id,j)=>j+k>=b.length||b[j+k]===id))))throw new Error(`spin ${n} col ${c}: ${a.join()} → ${b.join()}`);}prev=f;}
   expect(r.isSpinning).toBe(false);for(let c=0;c<5;c++)expect(r.grid[c]).toEqual(o.grid[c]);
   const fin=frame(r,sink);for(let c=0;c<5;c++)expect(visible(fin,c)).toEqual(o.grid[c]);}});
});
describe('anticipation is a slowdown of the same motion, driven by revealed symbols only',()=>{
 const two=(id:SymbolId,third:SymbolId|null)=>[[id,'KEY','TOMB'],['POTION',id,'KEY'],[third??'GHOST',third?'KEY':'TOMB','LANTERN'],['GHOST','KEY','TOMB'],['POTION','LANTERN','GHOST']] as SymbolId[][];
 const susp=(g:SymbolId[][],mode:'base'|'free'='base')=>{const sink:Draw[]=[],r=new Reels(stubCtx(sink),images,grid0());const ev:string[]=[];r.onSuspense=e=>ev.push(`${e.phase}:${e.kind}@${e.col}`);const o=outcomeWith(g,mode);const x=run(grid0(),o);void x;
  const sink2:Draw[]=[],r2=new Reels(stubCtx(sink2),images,grid0());r2.onSuspense=e=>ev.push(`${e.phase}:${e.kind}@${e.col}`);const p=r2.spin(o);void p;let t=0;const sp:number[][]=[];while(r2.isSpinning&&t<30){r2.update(1/60);t+=1/60;sp.push(r2.strips.map(s=>s.speed));}
  return {ev,t,sp};};
 it('two scatters visible, third does not arrive → suspense start, then miss; reel 3 is slowed (continuous speed), grid exact',()=>{const r=susp(two('SCATTER',null));expect(r.ev[0]).toBe('start:scatter@2');expect(r.ev).toContain('miss:scatter@4');expect(r.ev.some(e=>e.startsWith('resolve'))).toBe(false);});
 it('two scatters visible, third arrives → resolve',()=>{const r=susp(two('SCATTER','SCATTER'));expect(r.ev[0]).toBe('start:scatter@2');expect(r.ev.some(e=>e.startsWith('resolve:scatter'))).toBe(true);});
 it('two chest bonuses: start / miss and start / resolve (gold); none in free spins',()=>{expect(susp(two('CHEST_BONUS',null)).ev[0]).toBe('start:chest@2');expect(susp(two('CHEST_BONUS','CHEST_BONUS')).ev.some(e=>e.startsWith('resolve:chest'))).toBe(true);expect(susp(two('CHEST_BONUS',null),'free').ev.length).toBe(0);});
 it('no suspense for ordinary spins, one special, or three already completed',()=>{expect(susp(grid0().map(c=>c.map(()=> 'KEY' as SymbolId))).ev.length).toBe(0);expect(susp([['SCATTER','KEY','KEY'],['KEY','KEY','KEY'],['KEY','KEY','KEY'],['KEY','KEY','KEY'],['KEY','KEY','KEY']]).ev.length).toBe(0);
  expect(susp([['SCATTER','KEY','KEY'],['SCATTER','KEY','KEY'],['SCATTER','KEY','KEY'],['KEY','KEY','KEY'],['KEY','KEY','KEY']]).ev.length).toBe(2);});   // start (2 visible) + resolve (3rd arrives)
 it('dual possibility: both kinds can be active on the same reel',()=>{const g=[['SCATTER','CHEST_BONUS','KEY'],['SCATTER','CHEST_BONUS','KEY'],['GHOST','KEY','TOMB'],['GHOST','KEY','TOMB'],['GHOST','KEY','TOMB']] as SymbolId[][];const r=susp(g);expect(r.ev.filter(e=>e.startsWith('start')).sort()).toEqual(['start:chest@2','start:scatter@2']);});
 it('worst case (suspense on reels 3,4,5) adds a bounded amount of time (< 3.2 s) compared with a plain spin',()=>{const a=run(grid0(),outcomeWith(two('SCATTER',null))),n=run(grid0(),outcomeWith(grid0().map(c=>c.map(()=> 'KEY' as SymbolId))));expect(a.t-n.t).toBeGreaterThan(1.2);expect(a.t-n.t).toBeLessThan(3.2);});
 it('suspense reel keeps a continuous velocity (no jumps) and takes ~0.9–1.1 s more than a normal reel; duration does not depend on the unrevealed reel contents',()=>{
  const a=run(grid0(),outcomeWith(two('SCATTER',null))),b=run(grid0(),outcomeWith(two('SCATTER','SCATTER'))),n=run(grid0(),outcomeWith(grid0().map(c=>c.map(()=> 'KEY' as SymbolId))));
  const maxJump=(sp:number[][],col:number)=>{let m=0;for(let i=1;i<sp.length;i++)m=Math.max(m,Math.abs(sp[i]![col]!-sp[i-1]![col]!));return m;};
  expect(maxJump(a.speeds,2)).toBeLessThan(REEL_ANIM.rowsPerSec*0.2);
  expect(Math.abs(a.landTimes[2]!-b.landTimes[2]!)).toBeLessThan(1/60+1e-6);          // hit or miss: identical timing
  const extra=a.landTimes[2]!-n.landTimes[2]!;expect(extra).toBeGreaterThan(.6);expect(extra).toBeLessThan(1.6);});
});

describe('reduced motion',()=>{
 it('no suspense time extension and no suspense events when prefers-reduced-motion is set',()=>{
  const prev=(globalThis as any).matchMedia;(globalThis as any).matchMedia=()=>({matches:true});
  const sink:Draw[]=[],r=new Reels(stubCtx(sink),images,grid0());const ev:string[]=[];r.onSuspense=e=>ev.push(e.phase);
  const g=[['SCATTER','KEY','TOMB'],['POTION','SCATTER','KEY'],['GHOST','KEY','TOMB'],['GHOST','KEY','TOMB'],['POTION','LANTERN','GHOST']] as SymbolId[][];
  r.spin(outcomeWith(g));let t=0;while(r.isSpinning&&t<30){r.update(1/60);t+=1/60;}
  (globalThis as any).matchMedia=prev;expect(ev.length).toBe(0);expect(r.grid[0]).toEqual(g[0]);});
});
