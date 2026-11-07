import {describe,expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {chestPose,LAYER_FILES,scatterPose,TRIGGER_SEC,trigEnv,wildPose,isFxSymbol} from '../src/view/symbolFx';

const T=[0,.37,1.9,7.3,23.1];
describe('symbol animation poses (pure)',()=>{
 it('WILD head always covers the untouched original (scale >= 1.03), stays near the chin pivot and moves independently',()=>{
  for(const st of ['idle','anticipation','trigger'] as const)for(const tt of [0,.1,.3,.6,1,1.4,3])for(const t of T){const p=wildPose(st,tt,t);expect(p.scale).toBeGreaterThanOrEqual(1.03);expect(p.scale).toBeLessThan(1.2);expect(Math.abs(p.rot)).toBeLessThan(.05);expect(p.dy).toBeLessThanOrEqual(0);expect(p.dy).toBeGreaterThan(-5);}
  const a=wildPose('idle',0,0).scale,b=wildPose('idle',0,1.3).scale;expect(a).not.toBe(b);
 });
 it('trigger is stronger than idle and returns to a calm state',()=>{
  expect(wildPose('trigger',.5,0).scale).toBeGreaterThan(wildPose('idle',.5,0).scale+.06);expect(wildPose('trigger',.5,0).eyes).toBeGreaterThan(.9);
  expect(trigEnv(0)).toBe(0);expect(trigEnv(.5)).toBe(1);expect(trigEnv(TRIGGER_SEC)).toBeLessThan(.4);expect(TRIGGER_SEC).toBeLessThanOrEqual(1.5);
 });
 it('SCATTER: idle moves (door/flames flicker), anticipation is clearly stronger, trigger flashes',()=>{
  const d=new Set(T.map(t=>scatterPose('idle',0,t).door.toFixed(3)));expect(d.size).toBeGreaterThan(3);
  const avg=(st:'idle'|'anticipation',f:(p:ReturnType<typeof scatterPose>)=>number)=>[0,.4,.9,1.7,2.3].reduce((s,t)=>s+f(scatterPose(st,1.2,t)),0)/5;
  expect(avg('anticipation',p=>p.door)).toBeGreaterThan(avg('idle',p=>p.door)+.25);expect(avg('anticipation',p=>p.mist)).toBeGreaterThan(avg('idle',p=>p.mist));
  expect(scatterPose('trigger',.2,0).flash).toBeGreaterThan(.4);expect(scatterPose('trigger',.2,0).spark).toBeGreaterThan(scatterPose('idle',0,0).spark*3);
 });
 it('CHEST: vibrates at intervals when idle, constantly when anticipating; trigger hops and releases a beam',()=>{
  const idle=T.concat([.05,.1,.2,.5,.8]).map(t=>Math.abs(chestPose('idle',0,t).dx));expect(Math.max(...idle)).toBeGreaterThan(.1);
  expect(Math.abs(chestPose('anticipation',2,.013).dx)+Math.abs(chestPose('anticipation',2,.02).dx)).toBeGreaterThan(.2);
  const hop=Math.min(...[.15,.2,.25,.3,.35].map(t=>chestPose('trigger',t,0).dy));expect(hop).toBeLessThan(-8);expect(chestPose('trigger',.5,0).beam).toBeGreaterThan(.8);
  expect(chestPose('trigger',2,0).beam).toBe(0);expect(chestPose('trigger',2,0).dy).toBe(0);
 });
 it('only the three target symbols are animated',()=>{expect(['WILD','SCATTER','CHEST_BONUS'].every(isFxSymbol)).toBe(true);for(const s of ['KEY','TOMB','CHEST','SKULL','GHOST'])expect(isFxSymbol(s)).toBe(false);});
});

function png(f:string){const b=readFileSync(f),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);return {sig:b[0]===137&&b[1]===80,w:dv.getUint32(16),h:dv.getUint32(20),ct:b[25]};}
describe('derived layers and wiring',()=>{
 it('every layer exists as a 512x512 RGBA PNG aligned with the originals; originals still 512x512',()=>{
  for(const f of Object.values(LAYER_FILES)){const p='assets-2d/symbols/layers/'+f+'.png';expect(existsSync(p),p).toBe(true);const i=png(p);expect([i.sig,i.w,i.h,i.ct]).toEqual([true,512,512,6]);}
  for(const f of ['wild','scatter','chest-bonus'])expect(png(`assets-2d/symbols/exported/${f}.png`)).toMatchObject({w:512,h:512});
 });
 const reels=readFileSync('src/view/reels.ts','utf8'),fx=readFileSync('src/view/symbolFx.ts','utf8');
 it('presentation only: no engine / math / rng imports',()=>{for(const m of [...fx.matchAll(/from '([^']+)'/g)].map(m=>m[1]))expect(/engine|math|config\/game|rng/.test(m),m).toBe(false);});
 it('animation runs where the real symbol is drawn (reels canvas), only for landed reels and real states',()=>{
  expect(reels).toMatch(/this\.anim\.draw\(c,cell\.id/);expect(reels).toMatch(/strips\[c\]\.done/);expect(reels).toMatch(/suspActive\.s/);expect(reels).toMatch(/suspActive\.c/);expect(reels).toContain("return 'trigger'");
  expect(reels).toMatch(/!mv&&!this\.reduced/);                       // never on a moving reel, never with reduced motion
 });
});
