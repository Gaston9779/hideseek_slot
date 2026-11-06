import type {FeatureState} from '../engine/game';
/**
 * Presentation accounting for the Chest feature (display only — the ledger is never touched).
 * The engine credits `effective` (= base × multiplier, after cap) spin by spin. To keep the surprise for the finale, the UI shows the BASE win and holds back
 * the difference (effective − base) from the displayed balance until the reveal. After the reveal displayed balance == real balance == ledger.
 * Units: 1 unit = round bet / 20.
 */
export const hiddenBonusCents=(f:Pick<FeatureState,'effectiveBonusWinUnits'|'baseBonusWinUnits'>|null,roundBet:number)=>f?Math.max(0,f.effectiveBonusWinUnits-f.baseBonusWinUnits)*roundBet/20:0;
export const shownSpinCents=(f:Pick<FeatureState,'baseSpinWinUnits'>|null,roundBet:number,creditedCents:number)=>f?f.baseSpinWinUnits*roundBet/20:creditedCents;
