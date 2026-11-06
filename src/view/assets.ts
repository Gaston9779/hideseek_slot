import {SYMBOLS,type SymbolId} from '../config/game';
import {SYMBOL_ART} from '../config/presentation';
import bg from '../../assets-2d/background/cemetery-background.png';
import frame from '../../assets-2d/frame/reel-frame.png';
import panel from '../../assets-2d/ui/control-panel-audio.png';   // original panel; only the rotation icon of the audio button is blanked (scripts/blank-audio-button.py)
import logo from '../../assets-2d/logo/skull-hunt-logo-cropped.png';
import bonus from '../../assets-2d/bonus/hide-seek-bonus.png';
import freeSpins from '../../assets-2d/bonus/free-spins.png';
const symbolUrls=import.meta.glob('../../assets-2d/symbols/exported/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const symbolUrl=(id:SymbolId)=>Object.entries(symbolUrls).find(([k])=>k.endsWith(`/${SYMBOL_ART[id].file}.png`))?.[1]??'';
export const urls={bg,frame,panel,logo,bonus,freeSpins};
export function loadImage(src:string){return new Promise<HTMLImageElement>((res,rej)=>{const i=new Image();i.decoding='async';i.onload=()=>res(i);i.onerror=()=>rej(new Error(`Missing asset: ${src}`));i.src=src;});}
export async function loadSymbolImages(){
 const out={} as Record<SymbolId,HTMLImageElement>;
 await Promise.all(SYMBOLS.map(async id=>{const file=SYMBOL_ART[id].file;const url=Object.entries(symbolUrls).find(([k])=>k.endsWith(`/${file}.png`))?.[1];if(!url)throw new Error(`Missing symbol art for ${id} (${file}.png)`);out[id]=await loadImage(url);}));
 return out;
}
