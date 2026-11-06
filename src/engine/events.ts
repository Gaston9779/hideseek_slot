/** Stable presentation contract. These events describe committed engine facts and never alter math/accounting. */
export const GAME_EVENT_NAME='skull-hunt:game-event';
export type GameEvent=
 |{type:'FREE_SPINS_TRIGGERED';roundId:string;spinNo:number;source:'BASE'|'RETRIGGER';scatterCount:number;awardedSpins:number}
 |{type:'CHEST_BONUS_TRIGGERED';roundId:string;spinNo:number;chestBonusCount:number}
 |{type:'DUAL_BONUS_TRIGGERED';roundId:string;spinNo:number;scatterCount:number;chestBonusCount:number;awardedSpins:number}
 |{type:'MAX_WIN';roundId:string;spinNo:number;totalWinX:5000}
 |{type:'BEST_CHEST_PICK';roundId:string;spinNo:number;selectedIndex:number;prizeX:number};
