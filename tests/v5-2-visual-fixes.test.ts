import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {SKULL,SKULL_BASE_HEIGHT,SKULL_SCALE} from '../src/layout';
import {SKULL_ANCHOR} from '../src/bonus/bonusLayout';
import {CHASE} from '../src/config/chase';

const r=(f:string)=>readFileSync(f,'utf8');
describe('v5.2 visual fixes',()=>{
 it('3D characters at exactly 90 % of the previous (relative) scale; feet anchors untouched',()=>{
  expect(SKULL_SCALE).toBeCloseTo(1.5*.9,12);expect(SKULL.height).toBeCloseTo(SKULL_BASE_HEIGHT*1.5*.9,9);
  expect(SKULL_ANCHOR.heightPx).toBeCloseTo(290*.9,9);expect(SKULL_ANCHOR.u).toBe(150);expect(SKULL_ANCHOR.v).toBe(815);
  expect(CHASE.seekerHeightRatio).toBe(1.1);                                  // seeker height derives from the skull height → also ×0.9, ratio unchanged
  expect(r('src/view/view.ts')).toMatch(/skullHeight:SKULL\.height/);
 });
 it('medal labels: rectangular box-shadows/backgrounds are neutralised with enough specificity',()=>{
  const css=r('src/style.css');expect(css).toMatch(/#bonus-prizes \.bprize\.x2,#bonus-prizes \.bprize\.x5[^}]*box-shadow:none/);});
 it('finale has no button: tap/click anywhere (captured, idempotent), quiet hint only',()=>{
  const ts=r('src/ui/chestFinale.ts'),css=r('src/ui/gameplay.css');expect(ts).not.toMatch(/<button/);expect(ts).not.toContain('cf-go');expect(css).not.toContain('.cf-go');
  expect(ts).toMatch(/addEventListener\('click',onTap,true\)/);expect(ts).toMatch(/removeEventListener\('click',onTap,true\)/);expect(ts).toMatch(/performance\.now\(\)-shownAt<450/);expect(ts).toContain('TAP TO CONTINUE');
 });
 it('Buy Bonus name is a hover/focus tooltip, never a permanent plate',()=>{
  const css=r('src/ui/gameplay.css');expect(css).toMatch(/\.buy-title\{[^}]*opacity:0/);expect(css).toMatch(/@media \(hover:hover\)\{\.buy-hit:hover \.buy-title\{opacity:1\}\}/);expect(css).toMatch(/\.buy-hit:focus-visible \.buy-title\{opacity:1\}/);
  expect(r('src/ui/buyBonusWidget.ts')).toContain('aria-label="Buy Bonus"');
 });
 it('TEST FREE SPINS is DEV-only and runs an isolated engine session',()=>{
  const main=r('src/main.ts'),i=main.indexOf('TEST FREE SPINS'),block=main.slice(main.lastIndexOf('if(import.meta.env.DEV){const panel',i),main.indexOf('panel.append(btn,stats)',i));
  expect(block).toMatch(/^if\(import\.meta\.env\.DEV\)/);expect(main.split('TEST FREE SPINS').length-1).toBe(1);
  expect(main).toMatch(/startDevScatter[\s\S]*game\.spin\(\)[\s\S]*game\.settle\(\)/);expect(main).toContain('if(qaSeed!==undefined||devTest)return');expect(main).toContain('function endDevTest()');
  expect(r('src/chase/bonusCinematic.ts')).toMatch(/import\.meta\.env\.DEV\?\{debugMaxWin[\s\S]*debugFreeSpins/);
 });
});
