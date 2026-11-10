import {SYMBOLS,type SymbolId} from '../config/game';
import {SYMBOL_ART} from '../config/presentation';
import bg from '../../assets-2d/background/cemetery-background.png';
import frame from '../../assets-2d/frame/reel-frame.png';
import panel from '../../assets-2d/ui/control-panel-audio.png';   // original panel; only the rotation icon of the audio button is blanked (scripts/blank-audio-button.py)
import bonus from '../../assets-2d/bonus/hide-seek-bonus.png';
import freeSpins from '../../assets-2d/bonus/free-spins.png';
const logo=`${import.meta.env.BASE_URL}assets/ui/skull-hunt-logo-cropped.png`;
const symbolUrls=import.meta.glob('../../assets-2d/symbols/exported/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const symbolUrl=(id:SymbolId)=>Object.entries(symbolUrls).find(([k])=>k.endsWith(`/${SYMBOL_ART[id].file}.png`))?.[1]??'';
export const urls={bg,frame,panel,logo,bonus,freeSpins};
/** A request which neither loads nor errors used to hold the loading screen forever. */
export function loadImage(src:string,timeoutMs=15_000){return new Promise<HTMLImageElement>((res,rej)=>{const i=new Image();let done=false;
 const finish=(fn:()=>void)=>{if(done)return;done=true;clearTimeout(timeout);i.onload=null;i.onerror=null;fn();};
 const timeout=window.setTimeout(()=>finish(()=>rej(new Error(`Timed out loading image: ${src}`))),timeoutMs);
 i.decoding='async';i.onload=()=>finish(()=>res(i));i.onerror=()=>finish(()=>rej(new Error(`Missing asset: ${src}`)));i.src=src;
});}
export async function loadSymbolImages(){
 const out={} as Record<SymbolId,HTMLImageElement>;
 // Safari keeps decoded image surfaces while Image instances are live. Serial loading keeps
 // the first-frame memory peak predictable instead of decoding every reel symbol at once.
 for(const id of SYMBOLS){const file=SYMBOL_ART[id].file;const url=Object.entries(symbolUrls).find(([k])=>k.endsWith(`/${file}.png`))?.[1];if(!url)throw new Error(`Missing symbol art for ${id} (${file}.png)`);out[id]=await loadImage(url);}
 return out;
}
const layerUrls=import.meta.glob('../../assets-2d/symbols/layers/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
/** Derived animation layers for WILD / SCATTER / CHEST_BONUS (scripts/extract-symbol-layers.py). A missing layer disables the animation, never the game. */
export async function loadFxLayers(files:Record<string,string>){
 const out:Record<string,HTMLImageElement>={};
 for(const [k,f] of Object.entries(files)){const u=Object.entries(layerUrls).find(([p])=>p.endsWith(`/${f}.png`))?.[1];if(!u)return null;out[k]=await loadImage(u);}
 return out;
}
