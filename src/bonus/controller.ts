/**
 * Hide & Seek chest bonus — pure state machine (no DOM, no Three.js, no balance access).
 * The UI only displays/selects/animates; prize values come from an explicit data object (ChestBonusRound).
 * DEVELOPMENT PREVIEW: nothing here touches credits; crediting goes through a BonusAdapter that the host provides.
 */
export type BonusStatus='READY'|'OPENING_SELECTED'|'REVEAL_SELECTED'|'WAITING_3_SECONDS'|'REVEALING_UNSELECTED'|'CELEBRATION'|'COMPLETE'|'CLOSED';
export interface ChestBonusRound{roundId:string;prizes:[number,number,number];selectedIndex:number|null;awardedPrize:number|null;status:BonusStatus}
/** Source of rounds. A verified bonus engine will implement this; the demo uses fixed TEST data. */
export interface BonusRoundProvider{nextRound():ChestBonusRound}
/** Accounting boundary. Returns true only the first time a round is awarded. The preview adapter never touches the slot balance. */
export interface BonusAdapter{award(roundId:string,prize:number):boolean}
export interface BonusPorts{
 setInteractive(on:boolean):void;
 openChest(index:number):Promise<void>;                                   // resolves when the opening animation has really finished
 showPrize(index:number,kind:'selected'|'unselected',value:number):Promise<void>; // resolves when the value is really visible
 celebrate():Promise<void>;
 showSummary(round:ChestBonusRound,bestPick:boolean):void;
 schedule(ms:number,fn:()=>void):()=>void;                                 // returns a cancel function
 dispose?():void;
 onError?(e:unknown):void;
}
const ORDER:BonusStatus[]=['READY','OPENING_SELECTED','REVEAL_SELECTED','WAITING_3_SECONDS','REVEALING_UNSELECTED','CELEBRATION','COMPLETE'];
export interface ControllerOptions{waitMs?:number;staggerMs?:number}
export class ChestBonusController{
 readonly round:ChestBonusRound;readonly log:BonusStatus[]=[];
 private epoch=0;private cancels:(()=>void)[]=[];private locked=false;private done=false;private bestPick=false;
 private waitMs:number;private staggerMs:number;
 constructor(round:ChestBonusRound,private ports:BonusPorts,private adapter:BonusAdapter,opts:ControllerOptions={}){
  this.round=round;this.waitMs=opts.waitMs??3000;this.staggerMs=opts.staggerMs??400;
  this.round.selectedIndex=null;this.round.awardedPrize=null;this.round.status='READY';this.log.push('READY');ports.setInteractive(true);}
 get status(){return this.round.status;}
 get isBestPick(){return this.bestPick;}
 private go(next:BonusStatus){const cur=this.round.status;if(next==='CLOSED'){this.round.status='CLOSED';this.log.push('CLOSED');return;}
  const a=ORDER.indexOf(cur),b=ORDER.indexOf(next);
  // forward only; CELEBRATION may be skipped (not best pick)
  if(a<0||b<=a||(b-a>1&&!(cur==='REVEALING_UNSELECTED'&&next==='COMPLETE')))throw new Error(`Illegal bonus transition ${cur} → ${next}`);
  this.round.status=next;this.log.push(next);}
 private live(e:number){return e===this.epoch&&this.round.status!=='CLOSED';}
 private timer(ms:number,fn:()=>void){const c=this.ports.schedule(ms,fn);this.cancels.push(c);}
 private fail(e:unknown){this.ports.onError?.(e);}
 /** Player picks a chest. Synchronously locks input; any further call is ignored. */
 select(index:number):boolean{
  if(this.locked||this.round.status!=='READY'||!Number.isInteger(index)||index<0||index>2)return false;
  this.locked=true;this.round.selectedIndex=index;this.go('OPENING_SELECTED');this.ports.setInteractive(false);
  const e=this.epoch,prizes=this.round.prizes;this.bestPick=prizes[index]===Math.max(...prizes);
  this.ports.openChest(index).then(()=>{
   if(!this.live(e))return;this.go('REVEAL_SELECTED');
   return this.ports.showPrize(index,'selected',prizes[index]).then(()=>{
    if(!this.live(e))return;
    if(!this.done){this.done=true;if(this.adapter.award(this.round.roundId,prizes[index]))this.round.awardedPrize=prizes[index];else this.round.awardedPrize=prizes[index];}
    this.go('WAITING_3_SECONDS');this.timer(this.waitMs,()=>this.revealRest(e));});
  }).catch(err=>this.fail(err));
  return true;}
 private revealRest(e:number){
  if(!this.live(e))return;this.go('REVEALING_UNSELECTED');
  const sel=this.round.selectedIndex!,others=[0,1,2].filter(i=>i!==sel);const prizes=this.round.prizes;
  const reveal=(j:number)=>this.ports.openChest(j).then(()=>this.live(e)?this.ports.showPrize(j,'unselected',prizes[j]):undefined);
  const jobs:Promise<unknown>[]=[reveal(others[0])];
  jobs.push(new Promise<void>(res=>this.timer(this.staggerMs,()=>{if(!this.live(e))return res();reveal(others[1]).then(()=>res(),()=>res());})));
  Promise.all(jobs).then(()=>{
   if(!this.live(e))return;
   if(this.bestPick){this.go('CELEBRATION');return this.ports.celebrate().then(()=>{if(this.live(e))this.finish();});}
   this.finish();
  }).catch(err=>this.fail(err));}
 private finish(){this.go('COMPLETE');this.ports.showSummary(this.round,this.bestPick);}
 /** Leave the bonus: cancels every timer/pending callback. Safe to call at any time, any number of times. */
 close(){if(this.round.status==='CLOSED')return;this.epoch++;this.cancels.forEach(c=>c());this.cancels=[];this.go('CLOSED');this.ports.setInteractive(false);this.ports.dispose?.();}
}
