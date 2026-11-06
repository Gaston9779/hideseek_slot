import './style.css';
import './ui/touch.css';
import {SlotGame} from './engine/game';import {CryptoRng,SeededRng} from './math/rng';import {SYMBOLS,paytable,type SymbolId} from './config/game';import {SYMBOL_ART,tierFor} from './config/presentation';
import {evaluate} from './math/evaluate';import {createView,type View} from './view/view';
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const query=new URLSearchParams(location.search);const qaSeed=query.has('qa')&&query.has('seed')?Number(query.get('seed')):undefined;
const game=new SlotGame(qaSeed===undefined?new CryptoRng():new SeededRng(qaSeed));const spin=$<HTMLButtonElement>('#spin'),status=$('#status');let busy=true;let view:View;
function money(c:number){return (c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function countUp(el:HTMLElement,cents:number,ms:number){const t0=performance.now();const step=(now:number)=>{const k=ms?Math.min(1,(now-t0)/ms):1;el.textContent=money(Math.round(cents*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function update(){$('#balance').textContent=money(game.balance);$('#bet').textContent=money(game.bet);spin.disabled=busy||game.balance<game.bet&&game.freeSpins===0;for(const id of ['bet-up','bet-down'])$<HTMLButtonElement>(`#${id}`).disabled=busy||game.freeSpins>0;$<HTMLButtonElement>('#reset').disabled=busy||game.freeSpins>0;const fb=$('#free-badge');fb.hidden=game.freeSpins===0;$('#free-left').textContent=String(game.freeSpins);$<HTMLButtonElement>('#info').disabled=false;}
function winMeter(cents:number,tier:string){const f=$('#win-field');f.classList.remove('pop','hot');if(tier==='none'){$('#win').textContent=money(cents);return;}void f.offsetWidth;f.classList.add('pop','hot');setTimeout(()=>f.classList.remove('hot'),tier==='small'?900:2600);countUp($('#win'),cents,reduced?0:tier==='small'?500:tier==='medium'?900:1500);}
async function doSpin(){if(busy||spin.disabled||document.querySelector('dialog[open]'))return;busy=true;update();spin.classList.add('busy');$('#win').textContent='0.00';
 try{const free=game.freeSpins>0;const before=game.freeSpins;const outcome=game.spin();update();status.textContent=free?`FREE SPINS · ${game.freeSpins} REMAINING`:'THE HUNT IS ON';
  await view.spin(outcome);
  const cents=game.settle();const awarded=game.freeSpins-(before-(free?1:0));
  const mult=outcome.evaluation.totalMultiplier,tier=tierFor(mult,outcome.evaluation.capped);
  view.present(outcome,tier,cents,money);winMeter(cents,tier);
  $('#reel-description').textContent=outcome.grid.map((c,i)=>`Reel ${i+1}: ${c.join(', ')}`).join('. ');
  status.textContent=game.freeSpins?`${game.freeSpins} FREE SPINS · PRESS SPIN TO CONTINUE`:cents?`TREASURE FOUND · ${money(cents)}`:'THE CRYPT AWAITS YOUR NEXT SPIN';
  update();
  if(awarded>0){await new Promise(r=>setTimeout(r,tier==='none'?500:1400));await view.freeSpinsIntro(awarded,free);}
 }catch(e){status.textContent=e instanceof Error?e.message:'The crypt could not be opened.';}
 finally{busy=false;spin.classList.remove('busy');update();}}
spin.onclick=()=>void doSpin();
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();void doSpin();}});
$('#bet-down').onclick=()=>{if(!busy){game.changeBet(-1);update();}};$('#bet-up').onclick=()=>{if(!busy){game.changeBet(1);update();}};
$('#info').onclick=()=>$<HTMLDialogElement>('#paytable').showModal();$('#menu').onclick=()=>$<HTMLDialogElement>('#menu-dialog').showModal();document.querySelectorAll<HTMLButtonElement>('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog')!.close());
$('#reset').onclick=()=>{if(busy)return;game.reset();$('#win').textContent='0.00';status.textContent='VIRTUAL BALANCE RESTORED';$<HTMLDialogElement>('#menu-dialog').close();update();};
$('#bonus-preview').onclick=()=>{$<HTMLDialogElement>('#menu-dialog').close();view.showBonusPreview();};
$('#paytable-content').innerHTML=SYMBOLS.map(s=>`<div><b>${SYMBOL_ART[s].label}</b><span>3: ${paytable[s][3]??0}× · 4: ${paytable[s][4]??0}× · 5: ${paytable[s][5]??0}×</span></div>`).join('');
async function init(){try{view=await createView(m=>{$('#loading p').textContent=m;});busy=false;update();$('#loading').classList.add('done');status.textContent='THE CRYPT AWAITS · GOOD LUCK';document.body.dataset.ready='true';
 if(query.has('qa')){Object.assign(window,{__SKULL_QA__:{
  demo:async(grid:SymbolId[][],free=0)=>{const evaluation=evaluate(grid);const outcome={stops:[0,0,0,0,0],grid,evaluation};await view.spin(outcome);const cents=evaluation.totalMultiplier*game.bet;const tier=tierFor(evaluation.totalMultiplier,evaluation.capped);view.present(outcome,tier,cents,money);winMeter(cents,tier);if(free)await view.freeSpinsIntro(free,false);},
  freeIntro:(n:number,re=false)=>view.freeSpinsIntro(n,re),bonus:()=>view.showBonusPreview(),bonusPick:(i:number)=>view.bonus.pick(i),bonusInspect:()=>view.bonus.inspect(),bonusClose:()=>view.hideBonusPreview(),skull:(s:string)=>view.skull.set(s as never),
  inspect:()=>({...view.inspect(),game:{phase:game.phase,balance:game.balance,bet:game.bet,freeSpins:game.freeSpins,last:game.last}}),react:(s:string)=>view.skull.set(s as never)}});}
 }catch(error){$('#loading p').textContent=`Unable to load the crypt: ${error instanceof Error?error.message:'unknown error'}`;console.error(error);}}
void init();
