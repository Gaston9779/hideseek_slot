import {BASE_STRIPS as V3_BASE,FS_STRIPS as V3_FREE,CHEST_BONUS_POSITIONS} from '../v3/strips';
import type {SymbolId} from './config';
const map=(s:readonly string[])=>s.map(x=>(x==='MAUSOLEUM'?'MAGIC_BOOK':x) as SymbolId);
/** Exact V3 stop positions retained; only the ordinary book ID is renamed for the V4 hierarchy. */
export const BASE_STRIPS=V3_BASE.map(map);
/** V4.1 rule change: CHEST_BONUS also exists on the feature strips (one per reel, same density as the base game) so that a Chest Bonus can be found INSIDE a feature.
 *  Position = the first ordinary-symbol stop at/after the base position with no SCATTER within ±2 (so a 3-row window never shows two specials of the same kind). Deterministic, pinned by tests. */
const LOW=['POTION','KEY','TOMB'] as const;   // replace the cheapest symbols first so the line EV of the feature barely moves
const withChest=(strip:SymbolId[],reel:number)=>{const out=[...strip],n=out.length;
 for(const pool of [LOW,['GHOST','LANTERN'],['CHEST','GARGOYLE']] as readonly (readonly string[])[])for(let k=0;k<n;k++){const i=(CHEST_BONUS_POSITIONS[reel]!+k)%n;if(!pool.includes(out[i]!))continue;let ok=true;for(let d=-2;d<=2;d++)if(out[(i+d+n)%n]==='SCATTER')ok=false;if(ok){out[i]='CHEST_BONUS' as SymbolId;return out;}}return out;};
export const FS_STRIPS_NO_CHEST=V3_FREE.map(map);
export const FS_STRIPS=FS_STRIPS_NO_CHEST.map(withChest);
export {CHEST_BONUS_POSITIONS};
