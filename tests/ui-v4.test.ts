import {describe,expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import {SlotGame} from '../src/engine/game';import {SeededRng} from '../src/math/v2/rng';
import {ChestBonusController,type BonusPorts,type ChestBonusRound} from '../src/bonus/controller';
import {GameBuyBonusAdapter} from '../src/engine/buyBonus';
import {LINE_PAYS,SYMBOLS} from '../src/math/v4/config';
import {SYMBOL_ART,tierFor,WIN_TIERS} from '../src/config/presentation';import {paytable} from '../src/config/game';

const mk=(seed=11)=>new SlotGame(new SeededRng(seed));
/** Same wiring as main.ts runChest(): prizes shown come from the committed permutation; the engine commits the pick once. */
async function playChest(g:SlotGame,pickMult:number){
 const c=g.chest!;const shown:{i:number;kind:string;v:number}[]=[];let awards=0;
 const round:ChestBonusRound={roundId:c.roundId,prizes:[...c.multipliers] as [number,number,number],selectedIndex:null,awardedPrize:null,status:'READY'};
 const timers:(()=>void)[]=[];
 const ports:BonusPorts={setInteractive(){},openChest:async()=>{},showPrize:async(i,kind,v)=>{shown.push({i,kind,v});},celebrate:async()=>{},showSummary(){},schedule:(_ms,fn)=>{timers.push(fn);return()=>{};}};
 const ctl=new ChestBonusController(round,ports,{award:()=>{awards++;return g.pickChest(round.selectedIndex!)!==null;}});
 ctl.select(c.multipliers.indexOf(pickMult as 1|2|5));
 for(let n=0;n<40;n++){await Promise.resolve();while(timers.length)timers.shift()!();}
 return {shown,awards,round,ctl};
}
describe('Chest Bonus presentation contract (engine data only)',()=>{
 for(const m of [1,2,5] as const)it(`×${m}: READY state exposes ×${m}/12 before the first spin; counter 12→0 step by step; one credit path`,async()=>{
  const g=mk(m);g.buyChestBonus();const bal=g.balance;const r=await playChest(g,m);
  expect(r.awards).toBe(1);expect(g.balance).toBe(bal);                        // the pick itself never credits money
  expect(r.shown.find(s=>s.kind==='selected')!.v).toBe(m);                      // shown prize == committed permutation
  expect(g.closeChest()).toBe(true);
  const f0=g.featureState!;expect(f0).toMatchObject({type:'chest',status:'READY',multiplier:m,spinsRemaining:12,spinsAwarded:12,baseBonusWinUnits:0,effectiveBonusWinUnits:0});
  const seq:number[]=[f0.spinsRemaining];let ledger=g.ledger.paid;
  while(g.phase==='free-spins'){g.spin();const cents=g.settle();ledger+=cents;const f=g.featureState??g.lastCompletedFeature!;seq.push(f.spinsRemaining);
   expect(f.spinsRemaining).toBeGreaterThanOrEqual(0);expect(f.grossMultipliedBonusWinUnits).toBe(f.baseBonusWinUnits*m);}
  expect(seq).toEqual([12,11,10,9,8,7,6,5,4,3,2,1,0]);                          // never 12 → 10, never negative, ends at 0
  const done=g.lastCompletedChestFeature!;expect(done.multiplier).toBe(m);expect(g.ledger.paid).toBe(ledger);expect(g.conserved).toBe(true);   // no double accounting
  expect(g.phase).toBe('ready');expect(g.featureState).toBeNull();                 // controls available again
 });
 it('the three chests always hold three different prizes (1, 2 and 5)',()=>{for(let s=1;s<=60;s++){const g=mk(s);g.buyChestBonus();expect([...g.chest!.multipliers].sort()).toEqual([1,2,5]);}});
 it('BEST_CHEST_PICK only for ×5; it carries no money and does not claim MAX WIN',async()=>{
  for(const m of [1,2,5] as const){const g=mk(40+m);g.buyChestBonus();g.drainEvents();await playChest(g,m);const ev=g.drainEvents();
   expect(ev.some(e=>e.type==='BEST_CHEST_PICK')).toBe(m===5);expect(ev.some(e=>e.type==='MAX_WIN')).toBe(false);}
 });
 it('after the pick the remaining two prizes are revealed from the committed permutation and cannot change',async()=>{
  const g=mk(3);g.buyChestBonus();const before=[...g.chest!.multipliers];const r=await playChest(g,2);
  expect(g.chest!.multipliers).toEqual(before);const others=r.shown.filter(s=>s.kind==='unselected').map(s=>s.v).sort();expect(others).toEqual([1,5]);
 });
 it('DUAL: Chest feature completes first, its summary data is the chest feature, then the queued Scatter feature starts',()=>{
  const g=mk(5);g.spin();const o=g.last!;o.evaluation.scatterCount=3;o.chest={multipliers:[1,2,5],roundId:'x'} as never;o.evaluation.chestBonusCount=3;g.settle();
  expect(g.phase).toBe('chest');const ev=g.drainEvents();expect(ev.filter(e=>e.type==='DUAL_BONUS_TRIGGERED')).toHaveLength(1);
  g.pickChest(1);g.closeChest();let prev=g.lastCompletedFeature;let completedAt=-1,n=0;
  while(g.phase==='free-spins'&&n<12){g.spin();g.settle();n++;if(g.lastCompletedFeature!==prev){completedAt=n;break;}}
  expect(completedAt).toBe(12);expect(g.lastCompletedFeature!.type).toBe('chest');
  expect(g.phase).toBe('free-spins');expect(g.featureState).toMatchObject({type:'scatter',status:'READY',spinsAwarded:12,multiplier:1});   // queued Scatter feature, own counters
  prev=g.lastCompletedFeature;let m=0;while(g.phase==='free-spins'&&m<80){g.spin();g.settle();m++;}
  expect(g.lastCompletedFeature!.type).toBe('scatter');expect(g.lastCompletedChestFeature!.type).toBe('chest');expect(g.phase).toBe('ready');expect(g.conserved).toBe(true);
 });
 it('Buy Bonus debits exactly once under repeated activation and is refused while a round is pending',async()=>{
  const g=mk(9),a=new GameBuyBonusAdapter(g,()=>true,()=>{});const b0=g.balance;
  const rs=await Promise.all([a.purchase(),a.purchase(),a.purchase()]);expect(rs.filter(r=>r.ok)).toHaveLength(1);expect(g.balance).toBe(b0-g.buyPriceCents());
  expect((await a.purchase()).ok).toBe(false);expect(g.ledger.wagered).toBe(g.buyPriceCents());
 });
 it('Buy Bonus with insufficient balance is refused without any debit',async()=>{
  const g=new SlotGame(new SeededRng(1),100);const a=new GameBuyBonusAdapter(g,()=>true,()=>{});const r=await a.purchase();expect(r.ok).toBe(false);expect(g.balance).toBe(100);expect(g.ledger.wagered).toBe(0);expect(g.phase).toBe('ready');
 });
 it('market without Buy Bonus: not purchasable',async()=>{const g=mk(2);const a=new GameBuyBonusAdapter(g,()=>false,()=>{});expect(a.quote(g.bet).available).toBe(false);expect((await a.purchase()).ok).toBe(false);expect(g.balance).toBe(g.startBalance);});
});
describe('Magic Book / paytable / help correspondence',()=>{
 it('MAGIC_BOOK is the highest ordinary payout at 3, 4 and 5 symbols and the displayed table agrees with the engine',()=>{
  for(let i=0;i<3;i++)for(const [id,p] of Object.entries(LINE_PAYS))if(id!=='MAGIC_BOOK')expect(LINE_PAYS.MAGIC_BOOK![i]!).toBeGreaterThan(p[i]!);
  expect(paytable.MAGIC_BOOK!.slice(3)).toEqual([...LINE_PAYS.MAGIC_BOOK!]);
  const ordinary=SYMBOLS.filter(s=>!['WILD','SCATTER','CHEST_BONUS'].includes(s));expect(ordinary[0]).toBe('MAGIC_BOOK');   // help screen lists symbols in SYMBOLS order → highest first
  const sorted=[...ordinary].sort((a,b)=>LINE_PAYS[b]![2]-LINE_PAYS[a]![2]);expect(ordinary).toEqual(sorted);
 });
 it('every math symbol has its own existing artwork; Magic Book uses the magic-book art, distinct from the bonus symbol',()=>{
  for(const s of SYMBOLS){expect(SYMBOL_ART[s],s).toBeTruthy();expect(existsSync(`assets-2d/symbols/exported/${SYMBOL_ART[s]!.file}.png`),s).toBe(true);}
  expect(SYMBOL_ART.MAGIC_BOOK!.file).toBe('magic-book');expect(new Set(SYMBOLS.map(s=>SYMBOL_ART[s]!.file)).size).toBe(SYMBOLS.length);
 });
});
describe('win celebration thresholds are central and economic',()=>{
 it('no BIG WIN for a return at or below the bet; tiers only from the real multiple',()=>{
  expect(tierFor(0)).toBe('none');expect(tierFor(.5)).toBe('small');expect(tierFor(1)).toBe('small');expect(tierFor(1.01)).toBe('medium');
  expect(tierFor(WIN_TIERS.big-.01)).toBe('medium');expect(tierFor(WIN_TIERS.big)).toBe('big');expect(tierFor(WIN_TIERS.mega)).toBe('mega');expect(tierFor(3,true)).toBe('max');
 });
});
