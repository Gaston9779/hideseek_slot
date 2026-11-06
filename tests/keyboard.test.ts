import {describe,expect,it} from 'vitest';
import {createKeyboard,RELEASE_QUIET_MS,type KeyEventLike} from '../src/ui/keyboard';
import {SlotGame} from '../src/engine/game';import {GameBuyBonusAdapter} from '../src/engine/buyBonus';import {SeededRng} from '../src/math/rng';

/** Browser-like event: a focused <button> only activates when keydown was NOT default-prevented. */
function press(kb:ReturnType<typeof createKeyboard>,code:string,target:{id?:string;tagName:string;click?:()=>void}|null,repeat=false){
 const e={code,repeat,target,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}} as KeyEventLike&{defaultPrevented:boolean;stopped:boolean};
 kb.onKeyDown(e);if(!e.defaultPrevented&&(code==='Enter'||code==='NumpadEnter')&&target?.click)target.click();return e;
}
function rig(){
 const st={idle:true,dialog:false,spins:0,buyClicks:0,dialogsOpened:0,clock:1000};
 const kb=createKeyboard(()=>st.clock);kb.configure({canSpin:()=>st.idle,spin:()=>{st.spins++;},dialogOpen:()=>st.dialog});
 // the Buy Bonus button opens its modal only through its own click handler, guarded by game state
 const buy={tagName:'BUTTON',id:'buy-hit',click:()=>{st.buyClicks++;if(st.idle)st.dialogsOpened++;}};
 return {st,kb,buy};
}
describe('keyboard manager',()=>{
 it('idle: Enter and Space spin once, never repeat',()=>{const {st,kb}=rig();press(kb,'Enter',{tagName:'BODY'});press(kb,'Space',{tagName:'BODY'});press(kb,'Enter',{tagName:'BODY'},true);expect(st.spins).toBe(2);});
 it('locked state with a stale focus on Buy Bonus: Enter spins nothing and opens nothing (repeated)',()=>{
  const {st,kb,buy}=rig();st.idle=false;                       // chest pick / reveal / feature intro
  for(let i=0;i<30;i++){const e=press(kb,'Enter',buy);expect(e.defaultPrevented).toBe(true);}
  for(const code of ['Space','NumpadEnter'])press(kb,code,buy);
  expect(st.spins).toBe(0);expect(st.dialogsOpened).toBe(0);expect(st.buyClicks).toBe(0);});
 it('a layer owns the keyboard: Enter/Space/Escape never reach the global spin or the focused button',()=>{
  const {st,kb,buy}=rig();let handled=0;const release=kb.push({id:'chest-bonus',handle:e=>{if(e.code==='Digit1'){handled++;return true;}}});
  for(const c of ['Enter','Space','Escape','NumpadEnter'])expect(press(kb,c,buy).defaultPrevented).toBe(true);
  press(kb,'Digit1',null);expect(handled).toBe(1);expect(st.spins).toBe(0);expect(st.buyClicks).toBe(0);
  release();release();expect(kb.depth).toBe(0);
  press(kb,'Enter',{tagName:'BODY'});expect(st.spins).toBe(0);               // a mashed key right after the layer closed does not fall through to SPIN
  st.clock+=RELEASE_QUIET_MS+1;press(kb,'Enter',{tagName:'BODY'});expect(st.spins).toBe(1);});
 it('layers release out of order and a layer is released exactly once (no double handler after remount)',()=>{
  const kb=createKeyboard();kb.configure({canSpin:()=>true,spin:()=>{}});const a=kb.push({id:'a'}),b=kb.push({id:'b'});a();expect(kb.topId).toBe('b');b();expect(kb.depth).toBe(0);});
 it('native dialog keeps its own Enter/Escape; no global spin behind it',()=>{const {st,kb}=rig();st.dialog=true;const e=press(kb,'Enter',{tagName:'BUTTON',id:'bd-cancel'});expect(e.defaultPrevented).toBe(false);expect(st.spins).toBe(0);});
 it('idle with another control deliberately focused: browser activates that control, no spin',()=>{const {st,kb,buy}=rig();press(kb,'Enter',buy);expect(st.spins).toBe(0);expect(st.buyClicks).toBe(1);});
 it('focus on SPIN: Enter spins exactly once (no native click on top)',()=>{const {st,kb}=rig();let clicks=0;press(kb,'Enter',{tagName:'BUTTON',id:'spin',click:()=>{clicks++;}});expect(st.spins).toBe(1);expect(clicks).toBe(0);});
 it('feature summary layer: CONTINUA by Enter once, further Enter inert',()=>{const {st,kb}=rig();let go=0;const rel=kb.push({id:'fs-summary',handle:e=>{if(e.code==='Enter'){go++;rel();return true;}}});press(kb,'Enter',null);press(kb,'Enter',null);expect(go).toBe(1);expect(st.spins).toBe(0);st.clock+=RELEASE_QUIET_MS+1;press(kb,'Enter',null);expect(st.spins).toBe(1);});
});
describe('Buy Bonus accounting under repeated activation',()=>{
 it('one debit, no debit while a round is pending, balance conserved',()=>{
  const g=new SlotGame(new SeededRng(7));const a=new GameBuyBonusAdapter(g,()=>true,()=>{});const start=g.balance;
  return Promise.all([a.purchase(),a.purchase(),a.purchase()]).then(rs=>{expect(rs.filter(r=>r.ok).length).toBe(1);expect(g.balance).toBe(start-g.buyPriceCents());expect(g.phase).toBe('chest');
   return a.purchase().then(r=>{expect(r.ok).toBe(false);expect(g.balance).toBe(start-g.buyPriceCents());expect(g.conserved).toBe(true);});});});
});
