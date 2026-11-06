import './style.css';
import './ui/touch.css';
import {SlotGame} from './engine/game';import {CryptoRng,SeededRng} from './math/rng';import {SYMBOLS,paytable,type SymbolId} from './config/game';import type {BonusAdapter,BonusRoundProvider} from './bonus/controller';import {SYMBOL_ART,tierFor} from './config/presentation';
import {createBonusCinematic,type BonusCinematic} from './chase/bonusCinematic';import {currentMarket} from './config/markets';import {createCinematicPlayer,type CinematicPlayer} from './ui/cinematicPlayer';import {evaluate} from './math/evaluate';import {createView,type View} from './view/view';
import {GAME_EVENT_NAME} from './engine/events';import {createFsHud,createFsSummary,createQuickSpin} from './ui/gameplayUi';import {createBuyBonusWidget} from './ui/buyBonusWidget';import {DisabledBuyBonusAdapter} from './engine/buyBonus';
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const query=new URLSearchParams(location.search);const qaEnabled=import.meta.env.DEV&&query.has('qa');const qaSeed=qaEnabled&&query.has('seed')?Number(query.get('seed')):undefined;
const game=new SlotGame(qaSeed===undefined?new CryptoRng():new SeededRng(qaSeed));const spin=$<HTMLButtonElement>('#spin'),status=$('#status');let busy=true;let view:View;let cinematic:CinematicPlayer|undefined;let bonusCine:BonusCinematic|undefined;let fsHud:ReturnType<typeof createFsHud>|undefined,fsSummary:ReturnType<typeof createFsSummary>|undefined,quick:ReturnType<typeof createQuickSpin>|undefined,buy:ReturnType<typeof createBuyBonusWidget>|undefined;
/** Presentation counters for the Free Spins HUD. Values come from the engine (spins) and from settle()'s credited cents (win); the summary never credits anything. */
const fs={active:false,played:0,winCents:0,ledgerStart:0};const FS_KEY='skull-hunt-fs-ui';
function fsPersist(){if(qaSeed!==undefined)return;try{if(fs.active)localStorage.setItem(FS_KEY,JSON.stringify({roundNo:game.roundNo,...fs}));else localStorage.removeItem(FS_KEY);}catch{/* ignore */}}
function fsRefresh(){if(!fsHud)return;if(!fs.active){fsHud.hide();return;}const inFlight=game.phase==='spinning'&&game.last?.mode==='free';fsHud.show();fsHud.set({remaining:game.freeSpins-(inFlight?1:0),played:fs.played+(inFlight?1:0),awarded:Math.max(game.featureAwarded,fs.played+game.freeSpins),winCents:fs.winCents});}
function publishGameEvents(){for(const event of game.drainEvents())window.dispatchEvent(new CustomEvent(GAME_EVENT_NAME,{detail:event}));}
const STORAGE_KEY='skull-hunt-v3-session';
function persist(){if(qaSeed!==undefined)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(game.snapshot()));}catch(e){console.warn('[math-v3] session persistence unavailable',e);}}
if(qaSeed===undefined){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)game.restore(JSON.parse(raw));}catch(e){console.warn('[math-v3] discarded incompatible session',e);localStorage.removeItem(STORAGE_KEY);}}
function money(c:number){return (c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function countUp(el:HTMLElement,cents:number,ms:number){const t0=performance.now();const step=(now:number)=>{const k=ms?Math.min(1,(now-t0)/ms):1;el.textContent=money(Math.round(cents*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function update(){$('#balance').textContent=money(game.balance);$('#bet').textContent=money(game.bet);const canSpin=game.phase==='ready'||game.phase==='free-spins';spin.disabled=busy||!canSpin||game.balance<game.bet&&game.freeSpins===0;for(const id of ['bet-up','bet-down'])$<HTMLButtonElement>(`#${id}`).disabled=busy||game.phase!=='ready';$<HTMLButtonElement>('#reset').disabled=busy||game.phase!=='ready';fsRefresh();$<HTMLButtonElement>('#info').disabled=false;}
function winMeter(cents:number,tier:string){const f=$('#win-field');f.classList.remove('pop','hot');if(tier==='none'){$('#win').textContent=money(cents);return;}void f.offsetWidth;f.classList.add('pop','hot');setTimeout(()=>f.classList.remove('hot'),tier==='small'?900:2600);countUp($('#win'),cents,reduced?0:tier==='small'?500:tier==='medium'?900:1500);}
/** Real Hide & Seek round: prizes were committed by the engine at spin time; the UI only reveals and the engine credits once. */
async function runChest(){const c=game.chest!;const round={roundId:c.roundId,prizes:[...c.prizes] as [number,number,number],selectedIndex:null,awardedPrize:null,status:'READY' as const};
 const provider:BonusRoundProvider={nextRound:()=>round};const adapter:BonusAdapter={award:()=>{const i=round.selectedIndex,result=i!==null?game.pickChest(i):null;persist();publishGameEvents();persist();return result!==null;}};
 const before=game.balance;await view.playChestBonus(provider,adapter);if(game.phase==='chest'&&c.selected!==null){game.closeChest();persist();}const won=game.balance-before;update();$('#win').textContent=money(Math.round(Number($('#win').textContent!.replace(/,/g,'')||0)*100)+won);}
async function doSpin(){if(busy||spin.disabled||cinematic?.isPlaying||document.querySelector('dialog[open]'))return;view.chase.abort();busy=true;bonusCine?.beginSpin();update();spin.classList.add('busy');$('#win').textContent='0.00';
 try{const free=game.freeSpins>0;const before=game.freeSpins;const outcome=game.spin();persist();update();if(free&&!fs.active){fs.active=true;fs.played=0;fs.winCents=0;fs.ledgerStart=game.ledger.paid;}fsRefresh();status.textContent=free?`FREE SPINS · ${game.freeSpins} REMAINING`:'THE HUNT IS ON';
  const t0=performance.now();await view.spin(outcome,!!quick?.on);{const wait=currentMarket().minSpinCycleMs-(performance.now()-t0);if(wait>0)await new Promise(r=>setTimeout(r,wait));}   // market minimum spin cycle (presentation only; the outcome was committed before the spin)
  const cents=game.settle();if(free){fs.played++;fs.winCents+=cents;}persist();fsPersist();publishGameEvents();persist();const awarded=game.freeSpins-(before-(free?1:0));
  const mult=cents/game.roundBet,tier=tierFor(mult,outcome.evaluation.capped);
  view.present(outcome,tier,cents,money,{banner:!bonusCine?.maxStandalone});winMeter(cents,tier);
  $('#reel-description').textContent=outcome.grid.map((c,i)=>`Reel ${i+1}: ${c.join(', ')}`).join('. ');
  status.textContent=game.freeSpins?`${game.freeSpins} FREE SPINS · PRESS SPIN TO CONTINUE`:cents?`TREASURE FOUND · ${money(cents)}`:'THE CRYPT AWAITS YOUR NEXT SPIN';
  update();
  if(awarded>0||game.phase==='chest'||bonusCine?.hasPending()){await new Promise(r=>setTimeout(r,tier==='none'?500:1300));document.body.dataset.cine='1';try{await bonusCine?.run();}finally{delete document.body.dataset.cine;}   // one chase per bonus event (FS / chest / dual), then the matching existing screen
   if(game.phase==='chest')await runChest();
   if(awarded>0&&game.freeSpins>0){
    if(free){fsRefresh();await fsHud!.retrigger(awarded);}                                   // retrigger: "+X FREE SPINS" (X = engine), counter updates
    else{await view.freeSpinsIntro(awarded,false);}}}
  if(!free&&game.freeSpins>0&&game.phase==='free-spins'&&!fs.active){fs.active=true;fs.played=0;fs.winCents=0;fs.ledgerStart=game.ledger.paid;fsPersist();fsRefresh();}   // feature starts after intro (and chest, if dual)
  if(free&&game.freeSpins===0&&fs.active){                                                    // last spin completed → summary (display only, no second credit)
   await new Promise(r=>setTimeout(r,tier==='none'?500:1600));
   await fsSummary!.show({spins:fs.played,winCents:fs.winCents,celebrate:()=>view.skullReact(fs.winCents>=20*game.roundBet?'BIG_WIN':'WIN')});
   fs.active=false;fsHud!.hide();fsPersist();}
 }catch(e){status.textContent=e instanceof Error?e.message:'The crypt could not be opened.';}
 finally{bonusCine?.endSpin();busy=false;spin.classList.remove('busy');update();}}
spin.onclick=()=>void doSpin();
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();void doSpin();}});
$('#bet-down').onclick=()=>{if(!busy){game.changeBet(-1);persist();update();}};$('#bet-up').onclick=()=>{if(!busy){game.changeBet(1);persist();update();}};
$('#info').onclick=()=>$<HTMLDialogElement>('#paytable').showModal();$('#menu').onclick=()=>$<HTMLDialogElement>('#menu-dialog').showModal();document.querySelectorAll<HTMLButtonElement>('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog')!.close());
$('#reset').onclick=()=>{if(busy)return;game.reset();persist();$('#win').textContent='0.00';status.textContent='VIRTUAL BALANCE RESTORED';$<HTMLDialogElement>('#menu-dialog').close();update();};
$('#bonus-preview').onclick=async()=>{$<HTMLDialogElement>('#menu-dialog').close();await cinematic?.play();view.showBonusPreview();};
$('#paytable-content').innerHTML=SYMBOLS.filter(s=>s!=='WILD').map(s=>s==='CHEST_BONUS'?`<div><b>${SYMBOL_ART[s].label}</b><span>3+ anywhere: HIDE & SEEK BONUS · no line pay · committed prize sets: 10/24/40, 30/60/120, 100/250/500 or 100/500/5,000× total bet</span></div>`:`<div><b>${SYMBOL_ART[s].label}</b><span>3: ${paytable[s][3]??0}× · 4: ${paytable[s][4]??0}× · 5: ${paytable[s][5]??0}×${s==='SCATTER'?' total bet':' line bet'}</span></div>`).join('');
async function resumePending(){
 if(game.phase==='spinning'&&game.last){status.textContent='RESTORING COMMITTED ROUND';await view.spin(game.last);const cents=game.settle();persist();publishGameEvents();persist();view.present(game.last,tierFor(cents/game.roundBet,game.last.evaluation.capped),cents,money);winMeter(cents,tierFor(cents/game.roundBet,game.last.evaluation.capped));}
 if(game.phase==='chest'){if(game.chest?.selected!==null){game.closeChest();persist();}else await runChest();}
 update();
}
async function init(){try{view=await createView(m=>{$('#loading p').textContent=m;});busy=true;update();$('#loading').classList.add('done');status.textContent='THE CRYPT AWAITS · GOOD LUCK';document.body.dataset.ready='true';
const market=currentMarket(),world=$('#world');fsHud=createFsHud(world,money,reduced);fsSummary=createFsSummary(world,money,reduced);quick=createQuickSpin($<HTMLButtonElement>('#quick'),world,market.quickSpin);
 buy=createBuyBonusWidget({world,dialogHost:document.querySelector('main')!,glbUrl:`${import.meta.env.BASE_URL}bonus-chest/bonus-chest-animated.glb`,adapter:new DisabledBuyBonusAdapter(),bet:()=>game.bet,money,renderScale:()=>view.inspect().renderScale,reduced});buy.setEnabledByMarket(market.buyBonus);view.onFrame(dt=>buy!.update(dt));void buy.ready();
 if(game.phase==='free-spins'){try{const r=JSON.parse(localStorage.getItem(FS_KEY)||'null');if(r&&r.roundNo===game.roundNo){Object.assign(fs,{active:true,played:r.played,winCents:r.winCents,ledgerStart:r.ledgerStart});}else{fs.active=true;fs.played=game.featureAwarded-game.freeSpins;fs.ledgerStart=game.ledger.paid;}}catch{fs.active=true;}fsRefresh();}
 bonusCine=createBonusCinematic({chase:view.chase,world:$('#world'),stage:$('#stage'),reduced,emit:view.emitFx,skullReact:view.skullReact,roundWinCents:()=>game.roundWinUnits*game.roundBet/20,money});
 view.setCelebrationHook(b=>bonusCine!.chestCelebration(b));if(!reduced)window.setTimeout(()=>void view.chase.ready(),3000);
 if(import.meta.env.DEV){const w=window as unknown as Record<string,unknown>;w.__debugSkullChase=()=>view.chase.start();w.__debugSkullChaseReset=()=>view.chase.abort();w.__debugSkullChaseAt=(t:number,crate=false)=>view.chase.scrub(t,1/60,crate);w.__chaseInspect=()=>view.chase.inspect();w.__debugMaxWin=(c:number)=>(bonusCine as unknown as {debugMaxWin:(c:number)=>Promise<void>}).debugMaxWin(c);w.__debugMathV3={evaluate:(grid:SymbolId[][])=>evaluate(grid),snapshot:()=>game.snapshot()};}
 const base=import.meta.env.BASE_URL;cinematic=createCinematicPlayer({host:$('#stage'),webm:`${base}cinematics/skull-hunt-intro.webm`,mp4:`${base}cinematics/skull-hunt-intro.mp4`,poster:`${base}cinematics/skull-hunt-intro-poster.webp`});
 if(!qaEnabled||query.has('cinematic'))void cinematic.playOnce('intro');else cinematic.warm();
 if(qaEnabled){Object.assign(window,{__SKULL_QA__:{
  demo:async(grid:SymbolId[][],free=0)=>{const evaluation=evaluate(grid);const outcome={mode:'base' as const,stops:[0,0,0,0,0],grid,evaluation,chest:null};await view.spin(outcome);const cents=evaluation.totalUnits*game.unitCents;const tier=tierFor(evaluation.totalMultiplier,evaluation.capped);view.present(outcome,tier,cents,money);winMeter(cents,tier);if(free)await view.freeSpinsIntro(free,false);},
  freeIntro:(n:number,re=false)=>view.freeSpinsIntro(n,re),bonus:()=>view.showBonusPreview(),bonusPick:(i:number)=>view.bonus.pick(i),bonusInspect:()=>view.bonus.inspect(),bonusClose:()=>view.hideBonusPreview(),skull:(s:string)=>view.skull.set(s as never),
  inspect:()=>({...view.inspect(),fsUi:{...fs,ledgerDelta:game.ledger.paid-fs.ledgerStart,hudVisible:fsHud!.visible,quick:quick!.on},game:{phase:game.phase,balance:game.balance,bet:game.bet,freeSpins:game.freeSpins,last:game.last,chest:game.chest,roundWinUnits:game.roundWinUnits,conserved:game.conserved}}),react:(s:string)=>view.skull.set(s as never)}});}
 await resumePending();publishGameEvents();persist();busy=false;update();
 }catch(error){$('#loading p').textContent=`Unable to load the crypt: ${error instanceof Error?error.message:'unknown error'}`;console.error(error);}}
void init();
