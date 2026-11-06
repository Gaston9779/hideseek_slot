import type {BonusAdapter,BonusRoundProvider,ChestBonusRound} from './controller';
/** DEVELOPMENT PREVIEW data. These are explicit TEST values, never random, never connected to the slot balance. */
export const TEST_PRIZES:[number,number,number]=[5,20,10];
export class TestRoundProvider implements BonusRoundProvider{
 private n=0;constructor(private prizes:[number,number,number]=TEST_PRIZES){}
 nextRound():ChestBonusRound{this.n++;return {roundId:`TEST-ROUND-${this.n}`,prizes:[...this.prizes] as [number,number,number],selectedIndex:null,awardedPrize:null,status:'READY'};}
}
/** Preview ledger: remembers awarded rounds (idempotent) and records them for inspection only. */
export class PreviewAdapter implements BonusAdapter{
 readonly awards:{roundId:string,prize:number}[]=[];private seen=new Set<string>();
 award(roundId:string,prize:number){if(this.seen.has(roundId))return false;this.seen.add(roundId);this.awards.push({roundId,prize});return true;}
}
