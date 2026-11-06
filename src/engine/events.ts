/** Stable presentation contract. These events describe committed engine facts and never alter math/accounting. */
export const GAME_EVENT_NAME='skull-hunt:game-event';
export type GameEvent=
 |{type:'FREE_SPINS_TRIGGERED';roundId:string;spinNo:number;source:'BASE'|'RETRIGGER';scatterCount:number;awardedSpins:number}
 |{type:'CHEST_BONUS_TRIGGERED';roundId:string;spinNo:number;chestBonusCount:number;source:'BASE'|'BUY'}
 |{type:'DUAL_BONUS_TRIGGERED';roundId:string;spinNo:number;scatterCount:number;chestBonusCount:number;awardedSpins:number}
 |{type:'MAX_WIN';roundId:string;spinNo:number;totalWinX:5000}
 |{type:'BEST_CHEST_PICK';roundId:string;spinNo:number;selectedIndex:number;prizeX:5}
 |{type:'CHEST_PICK_COMPLETED';roundId:string;spinNo:number;selectedIndex:number;multiplier:number}
 |{type:'CHEST_FREE_SPINS_STARTED';roundId:string;spinNo:number;spinsAwarded:12;multiplier:number}
 |{type:'CHEST_FREE_SPINS_UPDATED';roundId:string;spinNo:number;spinsPlayed:number;spinsRemaining:number;multiplier:number;winUnits:number}
 |{type:'CHEST_FREE_SPINS_COMPLETED';roundId:string;spinNo:number;spinsPlayed:number;multiplier:number;totalWinUnits:number}
 |{type:'BUY_BONUS_PURCHASED';roundId:string;spinNo:number;priceCents:number;priceX:number};
