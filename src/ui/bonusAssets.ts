import {artUrl} from '../view/assets';
export const BONUS_UI={buyFrame:artUrl('buy-bonus-frame'),hudFrame:artUrl('chest-free-spins-hud'),medals:{1:artUrl('multiplier-x1'),2:artUrl('multiplier-x2'),5:artUrl('multiplier-x5')} as Record<number,string>};
/** The medal of the package that was really picked. No permanent fallback: an unknown multiplier yields no medal. */
export const medalFor=(multiplier:number):string|null=>BONUS_UI.medals[multiplier]??null;
/** Warm the browser cache (decode ahead of the first open). */
export async function preloadBonusUi(){for(const u of [BONUS_UI.buyFrame,BONUS_UI.hudFrame,...Object.values(BONUS_UI.medals)]){await new Promise<void>(r=>{const i=new Image();i.decoding='async';i.onload=i.onerror=()=>r();i.src=u;});await new Promise(r=>setTimeout(r,250));}}   // one image at a time
