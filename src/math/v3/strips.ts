import type {SymbolId} from './config';
import {BASE_STRIPS as V2_BASE,FS_STRIPS as V2_FREE} from '../v2/strips';

/**
 * V3 uses 96 stops. Each V2 32-stop cycle is repeated three times to preserve the validated
 * symbol law, then one low symbol adjacent to the first SCATTER is replaced by CHEST_BONUS.
 * Bonus positions (0-based) are exported and pinned; expansion is deterministic and test-covered.
 */
export const CHEST_BONUS_POSITIONS=[9,12,13,15,15] as const;
const expandBase=(strip:readonly string[],reel:number):SymbolId[]=>{
 const out=[...strip,...strip,...strip] as SymbolId[];
 out[CHEST_BONUS_POSITIONS[reel]]='CHEST_BONUS';
 return out;
};
export const BASE_STRIPS:SymbolId[][]=V2_BASE.map(expandBase);
/** Dedicated Free Spin strips: exact V2 FS probabilities at 96 stops, CHEST_BONUS excluded. */
export const FS_STRIPS:SymbolId[][]=V2_FREE.map(s=>[...s,...s,...s] as SymbolId[]);
