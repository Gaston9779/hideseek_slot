import {BASE_STRIPS as V3_BASE,FS_STRIPS as V3_FREE,CHEST_BONUS_POSITIONS} from '../v3/strips';
import type {SymbolId} from './config';
const map=(s:readonly string[])=>s.map(x=>(x==='MAUSOLEUM'?'MAGIC_BOOK':x) as SymbolId);
/** Exact V3 stop positions retained; only the ordinary book ID is renamed for the V4 hierarchy. */
export const BASE_STRIPS=V3_BASE.map(map),FS_STRIPS=V3_FREE.map(map);
export {CHEST_BONUS_POSITIONS};
