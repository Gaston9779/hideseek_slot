/** Compatibility shim: UI code imports symbols/paylines/bets from here; the numbers live in src/math/v2/config.ts. */
import {LINE_PAYS,SCATTER_PAY_X} from '../math/v2/config';
export {SYMBOLS,BETS,paylines,MAX_WIN_X,type SymbolId} from '../math/v2/config';
export const paytable:Record<string,number[]>={...Object.fromEntries(Object.entries(LINE_PAYS).map(([k,v])=>[k,[0,0,0,...v]])),SCATTER:[0,0,0,...SCATTER_PAY_X],WILD:[0,0,0,0,0,0]};
