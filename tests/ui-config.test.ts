import {describe,it,expect} from 'vitest';
import {DisabledBuyBonusAdapter,GameBuyBonusAdapter,UNAVAILABLE_REASON} from '../src/engine/buyBonus';import {BUY_BONUS} from '../src/config/buyBonus';
import {MARKETS} from '../src/config/markets';import {SYMBOL_ART} from '../src/config/presentation';import {SYMBOLS} from '../src/math/v4/config';
import {game} from './helpers';
import {SlotGame} from '../src/engine/game';import {SeededRng} from '../src/math/v2/rng';
describe('Buy Bonus market gate',()=>{
 it('config uses the V4 math-owned calibrated price',()=>{expect(BUY_BONUS.mathValidated).toBe(true);expect(BUY_BONUS.priceX).toBe(128.6);expect(BUY_BONUS.feature).toBe('CHEST_BONUS');});
 it('adapter quotes unavailable and a purchase attempt moves nothing',async()=>{const a=new DisabledBuyBonusAdapter(),g=game(1),before=g.snapshot();const q=a.quote();expect(q.available).toBe(false);if(!q.available)expect(q.reason).toBe(UNAVAILABLE_REASON);const r=await a.purchase();expect(r.ok).toBe(false);expect(g.snapshot()).toEqual(before);});
 it('accepts one double-click purchase only; follow-up is explicitly deferred until the dialog can close',async()=>{const g=new SlotGame(new SeededRng(9)),before=g.balance;let follow=0;const a=new GameBuyBonusAdapter(g,()=>true,async()=>{follow++;});const [one,two]=await Promise.all([a.purchase(),a.purchase()]);expect([one.ok,two.ok].filter(Boolean)).toHaveLength(1);expect(g.balance).toBe(before-g.buyPriceCents());expect(g.phase).toBe('chest');expect(follow).toBe(0);await a.afterPurchase!();expect(follow).toBe(1);});
 it('UK profile: no buy feature, no quick spin, no autoplay/turbo/slam stop',()=>{const uk=MARKETS.uk!;expect(uk.buyBonus).toBe(false);expect(uk.quickSpin).toBe(false);expect(uk.autoplay||uk.turbo||uk.slamStop).toBe(false);});
});
describe('symbol identities',()=>{
 it('MAGIC_BOOK, ordinary CHEST and CHEST_BONUS have distinct identities',()=>{expect(SYMBOL_ART.MAGIC_BOOK!.file).toBe('magic-book');expect(SYMBOL_ART.CHEST!.file).toBe('chest');expect(SYMBOL_ART.CHEST_BONUS!.file).toBe('chest-bonus');const files=SYMBOLS.map(s=>SYMBOL_ART[s]!.file),labels=SYMBOLS.map(s=>SYMBOL_ART[s]!.label);expect(new Set(files).size).toBe(files.length);expect(new Set(labels).size).toBe(labels.length);});
});
