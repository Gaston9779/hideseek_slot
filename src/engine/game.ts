/**
 * Game state + accounting (no DOM, no Three.js, no timers). All money is integer cents.
 * Flow: spin() debits (base only) and COMMITS the outcome (incl. chest prizes) → UI animates → settle() credits once → optional chest → free spins.
 * Nothing here depends on frame rate, animation delays or loss history.
 */
import {BETS,FREE_SPINS,MATH_VERSION,MAX_WIN_UNITS,START_BALANCE,UNITS_PER_BET} from '../math/v3/config';
import {freeSpinsInitial,freeSpinsRetrigger,generateOutcome,type Outcome} from '../math/v3/spin';
import type {Rng} from '../math/v2/rng';
import type {GameEvent} from './events';
export type Phase='ready'|'spinning'|'free-spins'|'chest'|'error';
export interface ChestState{roundId:string;prizes:[number,number,number];selected:number|null;awardedUnits:number|null;closed:boolean}
export interface Snapshot{v:string;balance:number;betIndex:number;phase:Phase;freeSpins:number;featureAwarded:number;roundWinUnits:number;roundBet:number;roundNo:number;spinNo:number;pending:Outcome|null;pendingSettled:boolean;chest:ChestState|null;ledger:{wagered:number;paid:number};capReached:boolean;events?:GameEvent[]}
export class SlotGame{
 balance=START_BALANCE;betIndex=2;phase:Phase='ready';freeSpins=0;featureAwarded=0;last?:Outcome;chest:ChestState|null=null;
 roundWinUnits=0;roundBet=0;roundNo=0;spinNo=0;capReached=false;
 readonly ledger={wagered:0,paid:0};readonly startBalance:number;
 private pendingSettled=true;private events:GameEvent[]=[];
 constructor(private rng:Rng,startBalance=START_BALANCE){this.balance=startBalance;this.startBalance=startBalance;}
 get bet(){return BETS[this.betIndex]!;}
 get unitCents(){return this.bet/UNITS_PER_BET;}
 changeBet(d:number){if(this.phase==='ready')this.betIndex=Math.max(0,Math.min(BETS.length-1,this.betIndex+d));}
 private room(){return Math.max(0,MAX_WIN_UNITS-this.roundWinUnits);}
 private credit(units:number){const u=Math.min(units,this.room());const c=u*(this.roundBet/UNITS_PER_BET);this.balance+=c;this.ledger.paid+=c;this.roundWinUnits+=u;if(this.roundWinUnits>=MAX_WIN_UNITS)this.capReached=true;return c;}
 spin(){
  if(this.phase!=='ready'&&this.phase!=='free-spins')throw new Error('Invalid spin state');
  const free=this.phase==='free-spins'&&this.freeSpins>0;
  if(!free){if(this.balance<this.bet)throw new Error('Insufficient credits');this.balance-=this.bet;this.ledger.wagered+=this.bet;this.roundNo++;this.roundBet=this.bet;this.roundWinUnits=0;this.capReached=false;this.featureAwarded=0;}
  this.phase='spinning';this.spinNo++;this.pendingSettled=false;
  const o=generateOutcome(this.rng,free?'free':'base');this.last=o;return o;
 }
 /** Credits the committed outcome exactly once. Returns cents credited for this spin. */
 settle(){
  const o=this.last;if(this.phase!=='spinning'||!o||this.pendingSettled)throw new Error('No unsettled outcome');
  this.pendingSettled=true;const free=o.mode==='free';
  const wasCapped=this.capReached,cents=this.credit(o.evaluation.totalUnits);o.evaluation.capped=this.capReached;
  if(free)this.freeSpins--;
  const sc=o.evaluation.scatterCount;
  let awardedSpins=0;
  if(!this.capReached){
   if(!free&&sc>=3){awardedSpins=freeSpinsInitial(sc);this.freeSpins+=awardedSpins;this.featureAwarded+=awardedSpins;}
   else if(free&&sc>=3){awardedSpins=Math.min(freeSpinsRetrigger(sc),Math.max(0,FREE_SPINS.maxAwardedPerFeature-this.featureAwarded));this.freeSpins+=awardedSpins;this.featureAwarded+=awardedSpins;}
  }else this.freeSpins=0;
  if(!this.capReached&&o.chest){this.chest={roundId:`R${this.roundNo}`,prizes:[...o.chest.prizes] as [number,number,number],selected:null,awardedUnits:null,closed:false};this.phase='chest';}
  else this.afterStep();
  if(!this.capReached){const chest=!!o.chest;if(!free&&sc>=3&&chest)this.events.push({type:'DUAL_BONUS_TRIGGERED',roundId:`R${this.roundNo}`,spinNo:this.spinNo,scatterCount:sc,chestBonusCount:o.evaluation.chestBonusCount,awardedSpins});else if(!free&&chest)this.events.push({type:'CHEST_BONUS_TRIGGERED',roundId:`R${this.roundNo}`,spinNo:this.spinNo,chestBonusCount:o.evaluation.chestBonusCount});else if(sc>=3&&awardedSpins>0)this.events.push({type:'FREE_SPINS_TRIGGERED',roundId:`R${this.roundNo}`,spinNo:this.spinNo,source:free?'RETRIGGER':'BASE',scatterCount:sc,awardedSpins});}
  if(!wasCapped&&this.capReached)this.events.push({type:'MAX_WIN',roundId:`R${this.roundNo}`,spinNo:this.spinNo,totalWinX:5000});
  return cents;
 }
 private afterStep(){if(this.freeSpins>0)this.phase='free-spins';else{this.phase='ready';this.featureAwarded=0;}}
 /** Player picks a chest. Credits the pre-committed prize exactly once; any further call is a no-op returning null. */
 pickChest(i:number){
  const c=this.chest;if(this.phase!=='chest'||!c||c.selected!==null||!Number.isInteger(i)||i<0||i>2)return null;
  c.selected=i;const units=c.prizes[i]!*UNITS_PER_BET,before=this.balance,wasCapped=this.capReached;this.credit(units);c.awardedUnits=Math.round((this.balance-before)/this.unitCents);const best=c.prizes[i]===Math.max(...c.prizes);
  if(best)this.events.push({type:'BEST_CHEST_PICK',roundId:c.roundId,spinNo:this.spinNo,selectedIndex:i,prizeX:c.prizes[i]!});if(!wasCapped&&this.capReached)this.events.push({type:'MAX_WIN',roundId:c.roundId,spinNo:this.spinNo,totalWinX:5000});
  return {index:i,prize:c.prizes[i]!,credited:this.balance-before,best};
 }
 /** Leaves the chest bonus after the pick was made and shown. */
 closeChest(){const c=this.chest;if(this.phase!=='chest'||!c||c.selected===null)return false;c.closed=true;this.chest=null;if(this.capReached)this.freeSpins=0;this.afterStep();return true;}
 reset(){if(this.phase==='spinning')throw new Error('Cannot reset during a spin');this.balance=this.startBalance;this.phase='ready';this.freeSpins=0;this.featureAwarded=0;this.last=undefined;this.chest=null;this.roundWinUnits=0;this.capReached=false;this.ledger.wagered=0;this.ledger.paid=0;this.pendingSettled=true;this.events=[];}
 /** Presentation consumes committed facts once. Events remain snapshot-safe until drained. */
 drainEvents(){const out=this.events;this.events=[];return out;}
 /** Interruption/restore: everything needed to continue is serialisable; results are never re-drawn. */
 snapshot():Snapshot{return JSON.parse(JSON.stringify({v:MATH_VERSION,balance:this.balance,betIndex:this.betIndex,phase:this.phase,freeSpins:this.freeSpins,featureAwarded:this.featureAwarded,roundWinUnits:this.roundWinUnits,roundBet:this.roundBet,roundNo:this.roundNo,spinNo:this.spinNo,pending:this.last??null,pendingSettled:this.pendingSettled,chest:this.chest,ledger:this.ledger,capReached:this.capReached,events:this.events}));}
 restore(s:Snapshot){if(s.v!==MATH_VERSION)throw new Error('Snapshot from a different math version');Object.assign(this,{balance:s.balance,betIndex:s.betIndex,phase:s.phase,freeSpins:s.freeSpins,featureAwarded:s.featureAwarded,roundWinUnits:s.roundWinUnits,roundBet:s.roundBet,roundNo:s.roundNo,spinNo:s.spinNo,pendingSettled:s.pendingSettled,chest:s.chest,capReached:s.capReached});this.last=s.pending??undefined;this.events=[...(s.events??[])];this.ledger.wagered=s.ledger.wagered;this.ledger.paid=s.ledger.paid;}
 /** Accounting invariant: balance = start − wagered + paid. */
 get conserved(){return this.balance===this.startBalance-this.ledger.wagered+this.ledger.paid;}
}
