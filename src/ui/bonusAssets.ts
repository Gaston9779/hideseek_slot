import buyFrame from '../../assets-2d/ui/bonus-v2/buy-bonus-frame.png';
import hudFrame from '../../assets-2d/ui/bonus-v2/chest-free-spins-hud.png';
import x1 from '../../assets-2d/ui/bonus-v2/multiplier-x1.png';
import x2 from '../../assets-2d/ui/bonus-v2/multiplier-x2.png';
import x5 from '../../assets-2d/ui/bonus-v2/multiplier-x5.png';
export const BONUS_UI={buyFrame,hudFrame,medals:{1:x1,2:x2,5:x5} as Record<number,string>};
/** The medal of the package that was really picked. No permanent fallback: an unknown multiplier yields no medal. */
export const medalFor=(multiplier:number):string|null=>BONUS_UI.medals[multiplier]??null;
/** Warm the browser cache (decode ahead of the first open). */
export async function preloadBonusUi(){for(const u of [BONUS_UI.buyFrame,BONUS_UI.hudFrame,...Object.values(BONUS_UI.medals)]){await new Promise<void>(r=>{const i=new Image();i.decoding='async';i.onload=i.onerror=()=>r();i.src=u;});await new Promise(r=>setTimeout(r,250));}}   // one image at a time
