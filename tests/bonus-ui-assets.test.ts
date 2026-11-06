import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {BONUS_UI,medalFor} from '../src/ui/bonusAssets';
import {BUY_FRAME,HUD_FRAME,MEDAL,medalImgStyle,pctRect,type Rect,type Disc} from '../src/ui/bonusAnchors';
import {createBabySkullPortrait,portraitPose,PORTRAIT_T} from '../src/ui/babySkullPortrait';

const dir='assets-2d/ui/bonus-v2/';
function png(f:string){const b=readFileSync(dir+f),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const sig=[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);return {sig,w:dv.getUint32(16),h:dv.getUint32(20),colorType:b[25],hasTrns:false};}
describe('bonus-v2 assets',()=>{
 it('five PNGs exist, are real PNGs with an alpha channel (RGBA) and the expected sizes',()=>{
  const exp:Record<string,[number,number]>={'buy-bonus-frame.png':[BUY_FRAME.w,BUY_FRAME.h],'chest-free-spins-hud.png':[HUD_FRAME.w,HUD_FRAME.h],'multiplier-x1.png':[MEDAL.size,MEDAL.size],'multiplier-x2.png':[MEDAL.size,MEDAL.size],'multiplier-x5.png':[MEDAL.size,MEDAL.size]};
  for(const [f,[w,h]] of Object.entries(exp)){const p=png(f);expect(p.sig,f).toBe(true);expect([p.w,p.h],f).toEqual([w,h]);expect(p.colorType,`${f} RGBA`).toBe(6);}
 });
 it('the build resolves all five URLs',()=>{expect(BONUS_UI.buyFrame).toBeTruthy();expect(BONUS_UI.hudFrame).toBeTruthy();for(const m of [1,2,5])expect(BONUS_UI.medals[m]).toBeTruthy();});
 it('medal mapping ×1/×2/×5 → the matching file, distinct, no permanent fallback',()=>{
  const u=[1,2,5].map(m=>medalFor(m)!);expect(new Set(u).size).toBe(3);expect(u[0]).toContain('multiplier-x1');expect(u[1]).toContain('multiplier-x2');expect(u[2]).toContain('multiplier-x5');
  expect(medalFor(3)).toBeNull();expect(medalFor(0)).toBeNull();});
});
describe('normalised anchors',()=>{
 const inside=(r:Rect,f:{w:number;h:number})=>r.x>=0&&r.y>=0&&r.x+r.w<=f.w&&r.y+r.h<=f.h;
 const discRect=(c:Disc):Rect=>({x:c.cx-c.r,y:c.cy-c.r,w:c.r*2,h:c.r*2});
 it('every buy-frame region lies inside the picture, none of the controls overlap',()=>{
  const F=BUY_FRAME,rs:Rect[]=[F.title,F.intro,F.square,F.stake,F.cost,F.balance,F.cta,F.cancel,...[F.minus,F.plus,F.close,...F.medals].map(discRect)];
  for(const r of rs)expect(inside(r,F)).toBe(true);
  const ctl=[F.cost,F.balance,F.cta,F.cancel,discRect(F.minus),discRect(F.plus),F.stake];
  for(let i=0;i<ctl.length;i++)for(let j=i+1;j<ctl.length;j++){const a=ctl[i]!,b=ctl[j]!;expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${i}/${j}`).toBe(true);}
  expect(F.medals.map(m=>m.cx)).toEqual([...F.medals.map(m=>m.cx)].sort((a,b)=>a-b));});
 it('HUD regions inside the picture; percentages are relative to the image, so they scale with it',()=>{
  const H=HUD_FRAME;for(const r of [H.title,H.rows,H.base,H.mode,discRect(H.orb)])expect(inside(r,H)).toBe(true);
  expect(pctRect({x:H.w/2,y:0,w:H.w/2,h:H.h},H)).toContain('left:50.0000%');expect(pctRect({x:0,y:0,w:H.w,h:H.h},H)).toContain('width:100.0000%');
  expect(medalImgStyle({cx:MEDAL.cx,cy:MEDAL.cy,r:MEDAL.r},{w:MEDAL.size,h:MEDAL.size})).toContain('width:100.0000%');});
});
describe('Baby Skull portrait',()=>{
 it('sequence: emerges, looks left then right, curious tilt, then rests',()=>{
  expect(portraitPose(0).rise).toBe(0);expect(portraitPose(PORTRAIT_T.emerge).rise).toBe(1);
  const l=portraitPose((PORTRAIT_T.left[0]+PORTRAIT_T.left[1])/2),r=portraitPose((PORTRAIT_T.right[0]+PORTRAIT_T.right[1])/2),c=portraitPose((PORTRAIT_T.curious[0]+PORTRAIT_T.curious[1])/2);
  expect(l.yaw).toBeLessThan(0);expect(r.yaw).toBeGreaterThan(0);expect(c.tilt).toBeGreaterThan(0);const e=portraitPose(60);expect([e.yaw,e.tilt,e.hop,e.rise]).toEqual([0,0,0,1]);});
 it('start/stop/dispose are safe and idempotent without a model or WebGL (no loop, no leak)',()=>{
  const p=createBabySkullPortrait({canvas:{} as HTMLCanvasElement,template:()=>null,reduced:false});expect(p.start()).toBe(false);expect(p.running).toBe(false);p.stop();p.stop();p.dispose();p.dispose();expect(p.hasRenderer).toBe(false);});
});
describe('dynamic data, no mock values',()=>{
 const w=readFileSync('src/ui/buyBonusWidget.ts','utf8'),h=readFileSync('src/ui/gameplayUi.ts','utf8');
 it('Buy modal price/balance/bet come from the adapter/engine callbacks; no fixed numbers from the mockup',()=>{
  expect(w.includes('d.adapter.quote(')).toBe(true);expect(w.includes('d.balance()')).toBe(true);expect(w.includes('d.bet()')).toBe(true);expect(/1000\.00|134\.00|128\.60|740\.95/.test(w)).toBe(false);});
 it('Chest HUD medal is derived from the real multiplier; the modal medals are only illustrations (not buttons)',()=>{
  expect(h.includes('medalFor(s.multiplier)')).toBe(true);expect(/<img class="bm-medal"[^>]*onclick/.test(w)).toBe(false);expect(w.includes('class="bm-medal"')).toBe(true);});
});
