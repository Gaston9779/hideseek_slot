/** Independent V4 line evaluator; intentionally does not import production evaluate(). */
import {FEATURE_LINE_PAYS,LINE_PAYS,SCATTER_FREE_SPINS,SCATTER_PAY_X,type SymbolId} from '../../../src/math/v4/config';
export function refLine(v:readonly SymbolId[],mode:'base'|'feature'){const lead=v.find(s=>s!=='WILD');if(!lead||lead==='SCATTER'||lead==='CHEST_BONUS')return 0;let n=0,w=0;for(const s of v){if(s===lead||s==='WILD'){n++;if(s==='WILD')w++;}else break;}const p=n>=3?(mode==='base'?LINE_PAYS:FEATURE_LINE_PAYS)[lead]?.[n-3]??0:0;return mode==='feature'&&w?p*SCATTER_FREE_SPINS.wildMultiplier:p;}
export const refScatter=(n:number)=>n>=3?SCATTER_PAY_X[Math.min(n,5)-3]!*20:0;
