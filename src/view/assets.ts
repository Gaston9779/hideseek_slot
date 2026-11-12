import {SYMBOLS,type SymbolId} from '../config/game';
import {SYMBOL_ART} from '../config/presentation';
import {isMobile} from './quality';import {mobileDebug} from '../mobileDebug';
/** Art is shipped as WebP (assets-2d/optimized, produced by scripts/optimize-art.py from the PNG masters). Phones get the `.m` variant:
 *  fewer pixels = less decoded memory. Everything is resolved to a URL once, at module load. */
const optimized=import.meta.glob('../../assets-2d/optimized/*.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const phone=isMobile();
export function artUrl(name:string):string{const pick=(f:string)=>Object.entries(optimized).find(([k])=>k.endsWith(`/${f}.webp`))?.[1];const u=(phone?pick(`${name}.m`):undefined)??pick(name);if(!u)throw new Error(`Missing optimized art: ${name}`);return u;}
const bg=artUrl('cemetery-background'),frame=artUrl('reel-frame'),panel=artUrl('control-panel-audio'),bonus=artUrl('hide-seek-bonus'),freeSpins=artUrl('free-spins');const logo=`${import.meta.env.BASE_URL}assets/ui/skull-hunt-logo-cropped.webp`;   // one 840 px file shared with the loading screen (public/, produced by scripts/optimize-art.py)

const symbolUrls=import.meta.glob('../../assets-2d/optimized/symbols/*.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const symbolUrl=(id:SymbolId)=>Object.entries(symbolUrls).find(([k])=>k.endsWith(`/${SYMBOL_ART[id].file}.webp`))?.[1]??'';
export const urls={bg,frame,panel,logo,bonus,freeSpins};
/** A request which neither loads nor errors used to hold the loading screen forever. */
export function loadImage(src:string,timeoutMs=40_000){return new Promise<HTMLImageElement>((res,rej)=>{const i=new Image();let done=false;const name=src.split('/').pop()!.split('?')[0]!;mobileDebug.asset(name,'start');
 const finish=(fn:()=>void)=>{if(done)return;done=true;mobileDebug.asset(name,i.complete&&i.naturalWidth?'success':'failure');clearTimeout(timeout);i.onload=null;i.onerror=null;fn();};
 const timeout=window.setTimeout(()=>finish(()=>rej(new Error(`Timed out loading image: ${src}`))),timeoutMs);
 i.decoding='async';i.onload=()=>finish(()=>res(i));i.onerror=()=>finish(()=>rej(new Error(`Missing asset: ${src}`)));i.src=src;
});}
export async function loadSymbolImages(){
 const out={} as Record<SymbolId,HTMLImageElement>;
 // Safari keeps decoded image surfaces while Image instances are live. Serial loading keeps
 // the first-frame memory peak predictable instead of decoding every reel symbol at once.
 for(const id of SYMBOLS){const file=SYMBOL_ART[id].file;const url=Object.entries(symbolUrls).find(([k])=>k.endsWith(`/${file}.webp`))?.[1];if(!url)throw new Error(`Missing symbol art for ${id} (${file}.webp)`);out[id]=await loadImage(url);}
 return out;
}
const layerUrls=import.meta.glob('../../assets-2d/optimized/layers/*.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
/** Derived animation layers for WILD / SCATTER / CHEST_BONUS (scripts/extract-symbol-layers.py). A missing layer disables the animation, never the game. */
export async function loadFxLayers(files:Record<string,string>){
 const out:Record<string,HTMLImageElement>={};
 for(const [k,f] of Object.entries(files)){const u=Object.entries(layerUrls).find(([p])=>p.endsWith(`/${f}.webp`))?.[1];if(!u)return null;out[k]=await loadImage(u);}
 return out;
}
