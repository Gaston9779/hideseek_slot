import { BETS } from '../config/game'; import { generateOutcome, type Outcome } from '../math/slot'; import type { Rng } from '../math/rng';
export type Phase='ready'|'spinning'|'paying'|'free-spins'|'error';
export class SlotGame {
 balance=100000;betIndex=2;phase:Phase='ready';freeSpins=0;featureAwarded=0;last?:Outcome;
 constructor(private rng:Rng){}
 get bet(){return BETS[this.betIndex]!;}
 changeBet(d:number){if(this.phase==='ready')this.betIndex=Math.max(0,Math.min(BETS.length-1,this.betIndex+d));}
 spin(){if(this.phase!=='ready'&&this.phase!=='free-spins')throw new Error('Invalid spin state');const isFree=this.freeSpins>0;if(!isFree){if(this.balance<this.bet)throw new Error('Insufficient credits');this.balance-=this.bet;}this.phase='spinning';const outcome=generateOutcome(this.rng,isFree);this.last=outcome;return outcome;}
 settle(){if(this.phase!=='spinning'||!this.last)throw new Error('No unsettled outcome');const isFree=this.freeSpins>0;const award=this.last.evaluation.totalMultiplier*this.bet;this.balance+=award;if(isFree)this.freeSpins--;if(this.last.evaluation.scatterCount>=3){const add=isFree?5:10;const permitted=Math.max(0,30-this.featureAwarded);this.freeSpins+=Math.min(add,permitted);this.featureAwarded+=Math.min(add,permitted);}if(this.freeSpins===0)this.featureAwarded=0;this.phase=this.freeSpins?'free-spins':'ready';return award;}
 reset(){if(this.phase==='spinning')throw new Error('Cannot reset during a spin');this.balance=100000;this.phase='ready';this.freeSpins=0;this.featureAwarded=0;this.last=undefined;}
}
