import {describe,it,expect} from 'vitest';
import {DisabledBuyBonusAdapter,UNAVAILABLE_REASON} from '../src/engine/buyBonus';import {BUY_BONUS} from '../src/config/buyBonus';
import {MARKETS} from '../src/config/markets';import {SYMBOL_ART} from '../src/config/presentation';import {SYMBOLS} from '../src/math/v3/config';
import {game} from './helpers';
describe('Buy Bonus is disabled until the math is validated',()=>{
 it('config carries no invented price',()=>{expect(BUY_BONUS.mathValidated).toBe(false);expect(BUY_BONUS.priceX).toBeNull();expect(BUY_BONUS.feature).toBe('CHEST_BONUS');});
 it('adapter quotes unavailable and a purchase attempt moves nothing',async()=>{const a=new DisabledBuyBonusAdapter(),g=game(1),before=g.snapshot();const q=a.quote();expect(q.available).toBe(false);if(!q.available)expect(q.reason).toBe(UNAVAILABLE_REASON);const r=await a.purchase();expect(r.ok).toBe(false);expect(g.snapshot()).toEqual(before);});
 it('UK profile: no buy feature, no quick spin, no autoplay/turbo/slam stop',()=>{const uk=MARKETS.uk!;expect(uk.buyBonus).toBe(false);expect(uk.quickSpin).toBe(false);expect(uk.autoplay||uk.turbo||uk.slamStop).toBe(false);});
});
describe('symbol identities',()=>{
 it('ordinary CHEST now has art distinct from CHEST_BONUS and from every other symbol',()=>{expect(SYMBOL_ART.CHEST!.file).toBe('magic-book');expect(SYMBOL_ART.CHEST_BONUS!.file).toBe('chest-bonus');const files=SYMBOLS.map(s=>SYMBOL_ART[s]!.file),labels=SYMBOLS.map(s=>SYMBOL_ART[s]!.label);expect(new Set(files).size).toBe(files.length);expect(new Set(labels).size).toBe(labels.length);});
});
