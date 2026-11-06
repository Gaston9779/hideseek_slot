import {BUY_BONUS} from '../config/buyBonus';
/**
 * Buy Bonus adapter boundary. The UI only calls quote()/purchase(); it never debits credits, never draws prizes and never forces symbols on the reels.
 * When the math is validated, a real adapter must wrap ONE atomic engine operation (debit price + commit chest round + emit event, exactly once).
 */
export type BuyBonusQuote={available:true;priceX:number}|{available:false;reason:string};
export type BuyBonusResult={ok:false;reason:string};
export interface BuyBonusAdapter{quote(betCents:number):BuyBonusQuote;purchase():Promise<BuyBonusResult>;}
export const UNAVAILABLE_REASON='Modello matematico del Buy Bonus non ancora validato';
export class DisabledBuyBonusAdapter implements BuyBonusAdapter{
 quote():BuyBonusQuote{return BUY_BONUS.mathValidated&&BUY_BONUS.priceX!==null?{available:true,priceX:BUY_BONUS.priceX}:{available:false,reason:UNAVAILABLE_REASON};}
 async purchase():Promise<BuyBonusResult>{return {ok:false,reason:UNAVAILABLE_REASON};}   // never touches balance or RNG
}
