/**
 * Per-market PRESENTATION / CONTROL profiles. These never change probabilities, paytable or RTP (one math model, math v2.0.0).
 * Values are provider-facing starting points to be confirmed against the current text of the applicable standard (GLI-19, UKGC RTS, local rules) — see 05-docs/PROVIDER_READINESS.md.
 */
export interface MarketProfile{id:string;minSpinCycleMs:number;autoplay:boolean;turbo:boolean;slamStop:boolean;showRtp:boolean;showNetPosition:boolean;celebrateSubBetReturns:boolean;quickSpin:boolean;buyBonus:boolean;/** the already-awarded free spins of a feature start by themselves (never autoplay of paid spins) */featureAutoSpins:boolean}
export const MARKETS:Record<string,MarketProfile>={
 demo:{id:'demo',minSpinCycleMs:0,autoplay:false,turbo:false,slamStop:false,showRtp:true,showNetPosition:false,celebrateSubBetReturns:false,quickSpin:true,buyBonus:true,featureAutoSpins:true},
 uk:{id:'uk',minSpinCycleMs:2500,autoplay:false,turbo:false,slamStop:false,showRtp:true,showNetPosition:true,celebrateSubBetReturns:false,quickSpin:false,buyBonus:false,featureAutoSpins:false},
};
export function currentMarket():MarketProfile{const q=new URLSearchParams(location.search).get('market')??'demo';return MARKETS[q]??MARKETS.demo!;}
