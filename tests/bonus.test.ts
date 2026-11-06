import {describe,it,expect} from 'vitest';
import {ChestBonusController,type BonusPorts,type ChestBonusRound} from '../src/bonus/controller';
import {PreviewAdapter} from '../src/bonus/provider';

/** Manual clock + controllable animation promises so every timing rule is tested deterministically. */
function rig(prizes:[number,number,number],opts={}){
 let now=0;const timers:{at:number,fn:()=>void,id:number}[]=[];let tid=0;
 const opens:Record<number,()=>void>={},prizeVisible:Record<string,()=>void>={};const events:string[]=[];
 let celebrate:(()=>void)|undefined,disposed=0,interactive:boolean[]=[],summary:{round:ChestBonusRound,best:boolean}|undefined;
 const ports:BonusPorts={
  setInteractive:on=>{interactive.push(on);},
  openChest:i=>{events.push(`open${i}@${now}`);return new Promise<void>(r=>{opens[i]=r;});},
  showPrize:(i,k)=>{events.push(`prize${i}:${k}@${now}`);return new Promise<void>(r=>{prizeVisible[`${i}`]=r;});},
  celebrate:()=>{events.push('celebrate');return new Promise<void>(r=>{celebrate=r;});},
  showSummary:(round,best)=>{summary={round,best};events.push('summary');},
  schedule:(ms,fn)=>{const t={at:now+ms,fn,id:++tid};timers.push(t);return()=>{const k=timers.indexOf(t);if(k>=0)timers.splice(k,1);};},
  dispose:()=>{disposed++;},
 };
 const round:ChestBonusRound={roundId:'R1',prizes,selectedIndex:null,awardedPrize:null,status:'READY'};
 const adapter=new PreviewAdapter();const c=new ChestBonusController(round,ports,adapter,opts);
 const tick=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
 const advance=async(ms:number)=>{const end=now+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const n=timers[0];if(!n||n.at>end)break;timers.shift();now=n.at;n.fn();await tick();}now=end;await tick();};
 return {c,round,adapter,events,opens,prizeVisible,advance,tick,timers,get now(){return now;},get celebrate(){return celebrate;},get disposed(){return disposed;},interactive,get summary(){return summary;}};
}
async function playToWaiting(r:ReturnType<typeof rig>,i:number){r.c.select(i);await r.tick();r.opens[i]();await r.tick();r.prizeVisible[String(i)]();await r.tick();}
async function finishAll(r:ReturnType<typeof rig>,i:number){await playToWaiting(r,i);await r.advance(3000);const others=[0,1,2].filter(x=>x!==i);r.opens[others[0]]();await r.tick();r.prizeVisible[String(others[0])]();await r.advance(400);r.opens[others[1]]();await r.tick();r.prizeVisible[String(others[1])]();await r.tick();}

describe('chest bonus state machine',()=>{
 for(const i of [0,1,2])it(`selecting chest ${['left','centre','right'][i]} opens only that chest`,async()=>{
  const r=rig([5,20,10]);expect(r.c.select(i)).toBe(true);await r.tick();expect(r.round.selectedIndex).toBe(i);expect(r.round.status).toBe('OPENING_SELECTED');
  expect(r.events).toEqual([`open${i}@0`]);});
 it('double click and a second chest are ignored and input is locked synchronously',async()=>{
  const r=rig([5,20,10]);expect(r.c.select(1)).toBe(true);expect(r.c.select(1)).toBe(false);expect(r.c.select(0)).toBe(false);expect(r.c.select(2)).toBe(false);
  await r.tick();expect(r.round.selectedIndex).toBe(1);expect(r.events.filter(e=>e.startsWith('open'))).toHaveLength(1);expect(r.interactive.at(-1)).toBe(false);expect(r.c.log).toEqual(['READY','OPENING_SELECTED']);});
 it('rejects invalid indices',()=>{const r=rig([5,20,10]);for(const i of [-1,3,1.5,NaN])expect(r.c.select(i)).toBe(false);expect(r.round.status).toBe('READY');});
 it('the 3 s timer only starts after the selected prize is actually visible',async()=>{
  const r=rig([5,20,10]);r.c.select(0);await r.tick();await r.advance(10_000);expect(r.round.status).toBe('OPENING_SELECTED');   // animation not finished: nothing happens
  r.opens[0]();await r.tick();expect(r.round.status).toBe('REVEAL_SELECTED');await r.advance(10_000);expect(r.round.status).toBe('REVEAL_SELECTED'); // prize not visible yet: no timer
  r.prizeVisible['0']();await r.tick();expect(r.round.status).toBe('WAITING_3_SECONDS');await r.advance(2999);expect(r.round.status).toBe('WAITING_3_SECONDS');
  expect(r.events.some(e=>e.startsWith('open1')||e.startsWith('open2'))).toBe(false);
  await r.advance(1);expect(r.round.status).toBe('REVEALING_UNSELECTED');expect(r.events.filter(e=>e.startsWith('open'))).toHaveLength(2);});
 it('unselected chests open after 3 s, staggered 400 ms, with unselected prize kind',async()=>{
  const r=rig([5,20,10]);await playToWaiting(r,1);await r.advance(3000);const e0=r.events.filter(e=>e.startsWith('open'));expect(e0).toEqual(['open1@0','open0@3000']);
  r.opens[0]();await r.tick();r.prizeVisible['0']();await r.advance(400);expect(r.events).toContain('open2@3400');expect(r.events).toContain('prize0:unselected@3000');});
 it('highest selected prize → CELEBRATION once, then COMPLETE',async()=>{
  const r=rig([5,20,10]);await finishAll(r,1);expect(r.round.status).toBe('CELEBRATION');expect(r.celebrate).toBeDefined();r.celebrate!();await r.tick();expect(r.round.status).toBe('COMPLETE');
  expect(r.events.filter(e=>e==='celebrate')).toHaveLength(1);expect(r.summary?.best).toBe(true);expect(r.c.log).toEqual(['READY','OPENING_SELECTED','REVEAL_SELECTED','WAITING_3_SECONDS','REVEALING_UNSELECTED','CELEBRATION','COMPLETE']);});
 it('lower selected prize → no celebration, straight to COMPLETE',async()=>{
  const r=rig([5,20,10]);await finishAll(r,0);expect(r.round.status).toBe('COMPLETE');expect(r.events).not.toContain('celebrate');expect(r.summary?.best).toBe(false);});
 it('tied best prize still celebrates',async()=>{const r=rig([20,20,10]);await finishAll(r,0);expect(r.round.status).toBe('CELEBRATION');expect(r.c.isBestPick).toBe(true);});
 it('all equal prizes celebrate',async()=>{const r=rig([7,7,7]);await finishAll(r,2);expect(r.round.status).toBe('CELEBRATION');});
 it('only the selected prize is awarded, exactly once',async()=>{
  const r=rig([5,20,10]);await finishAll(r,2);r.c.select(0);r.c.select(2);await r.tick();
  expect(r.adapter.awards).toEqual([{roundId:'R1',prize:10}]);expect(r.round.awardedPrize).toBe(10);});
 it('awarding is idempotent across rounds with the same id',()=>{const a=new PreviewAdapter();expect(a.award('X',5)).toBe(true);expect(a.award('X',5)).toBe(false);expect(a.awards).toHaveLength(1);});
 it('closing during the opening animation cancels everything and awards nothing',async()=>{
  const r=rig([5,20,10]);r.c.select(1);await r.tick();r.c.close();expect(r.round.status).toBe('CLOSED');r.opens[1]();await r.tick();await r.advance(10_000);
  expect(r.adapter.awards).toHaveLength(0);expect(r.events.filter(e=>e.startsWith('prize'))).toHaveLength(0);expect(r.disposed).toBe(1);expect(r.round.status).toBe('CLOSED');});
 it('closing during the 3 s wait clears the timer (no unselected reveal)',async()=>{
  const r=rig([5,20,10]);await playToWaiting(r,0);expect(r.timers.length).toBe(1);r.c.close();expect(r.timers.length).toBe(0);await r.advance(10_000);
  expect(r.events.filter(e=>e.startsWith('open'))).toEqual(['open0@0']);expect(r.adapter.awards).toEqual([{roundId:'R1',prize:5}]);});   // prize had already been shown → credited once
 it('closing during celebration prevents summary; close twice is safe',async()=>{
  const r=rig([5,20,10]);await finishAll(r,1);r.c.close();r.c.close();r.celebrate!();await r.tick();expect(r.summary).toBeUndefined();expect(r.disposed).toBe(1);});
 it('re-opening creates a fresh controller with a reset state',async()=>{
  const r1=rig([5,20,10]);await finishAll(r1,1);r1.c.close();const r2=rig([5,20,10]);expect(r2.round.status).toBe('READY');expect(r2.round.selectedIndex).toBeNull();expect(r2.c.select(0)).toBe(true);});
 it('transitions are forward-only (no skipping, no going back)',async()=>{
  const r=rig([5,20,10]);await playToWaiting(r,0);expect(()=>(r.c as any).go('READY')).toThrow();expect(()=>(r.c as any).go('COMPLETE')).toThrow();});
 it('never touches slot credits: controller has no balance dependency',()=>{const src=ChestBonusController.toString();expect(src).not.toMatch(/balance|credit/i);});
});
