/** Compatibility shim: presentation imports math identifiers from the production V4 package. */
import {LINE_PAYS,SCATTER_PAY_X} from '../math/v4/config';
export {SYMBOLS,BETS,paylines,MAX_WIN_X,type SymbolId} from '../math/v4/config';
export const paytable:Record<string,number[]>={...Object.fromEntries(Object.entries(LINE_PAYS).map(([k,v])=>[k,[0,0,0,...v]])),SCATTER:[0,0,0,...SCATTER_PAY_X],WILD:[0,0,0,0,0,0],CHEST_BONUS:[0,0,0,0,0,0]};
