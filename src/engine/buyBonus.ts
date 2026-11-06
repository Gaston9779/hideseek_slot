import {BUY_BONUS} from '../config/buyBonus';import type {SlotGame} from './game';
/** UI boundary: the engine alone debits, commits the package permutation and records the round. */
export type BuyBonusQuote={available:true;priceX:number;priceCents:number}|{available:false;reason:string};export type BuyBonusResult={ok:true}|{ok:false;reason:string};
export interface BuyBonusAdapter{quote(betCents:number):BuyBonusQuote;purchase():Promise<BuyBonusResult>;afterPurchase?():Promise<void>;}
export const UNAVAILABLE_REASON='Buy Bonus non disponibile per questo mercato';
export class GameBuyBonusAdapter implements BuyBonusAdapter{
 private purchasing=false;
 constructor(private game:SlotGame,private allowed:()=>boolean,private afterCommit:()=>Promise<void>|void){}
 quote(betCents:number):BuyBonusQuote{if(!this.allowed()||!BUY_BONUS.mathValidated||BUY_BONUS.priceX===null)return {available:false,reason:UNAVAILABLE_REASON};const priceCents=betCents*BUY_BONUS.priceX;if(!Number.isInteger(priceCents))return {available:false,reason:'Prezzo non rappresentabile in centesimi'};return {available:true,priceX:BUY_BONUS.priceX,priceCents};}
 async purchase():Promise<BuyBonusResult>{if(this.purchasing)return {ok:false,reason:'Acquisto già in corso'};const q=this.quote(this.game.bet);if(!q.available)return {ok:false,reason:q.reason};this.purchasing=true;try{this.game.buyChestBonus();return {ok:true};}catch(e){return {ok:false,reason:e instanceof Error?e.message:'Acquisto non riuscito'};}finally{this.purchasing=false;}}
 async afterPurchase(){await this.afterCommit();}
}
/** Retained for explicit unavailable-market tests. */
export class DisabledBuyBonusAdapter implements BuyBonusAdapter{quote():BuyBonusQuote{return {available:false,reason:UNAVAILABLE_REASON};}async purchase():Promise<BuyBonusResult>{return {ok:false,reason:UNAVAILABLE_REASON};}}
