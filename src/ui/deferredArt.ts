/**
 * Heavy full-frame bonus art (1-2 MB PNG each, ~6 MB decoded) is only needed when a bonus appears.
 * Desktop keeps the old eager behaviour. On phones the <img> keeps a data-src and is loaded, one at a time, by
 * loadDeferredArt() right before a bonus / the buy dialog / the finale is shown, so the first SPIN does not compete with
 * ~15 MB of downloads and ~48 MB of image decoding.
 */
import {mobileDebug} from '../mobileDebug';
import {isMobile} from '../view/quality';
const defer=isMobile();
/** attribute text for an <img> inside an innerHTML template */
export const artAttr=(url:string)=>defer?`data-src="${url}"`:`src="${url}"`;
/** assign an image source now (desktop) or on demand (phones) */
export function deferSrc(img:HTMLImageElement,url:string){if(defer)img.dataset.src=url;else img.src=url;}
let running:Promise<void>|null=null;
/** Loads every pending image (serially). Never rejects and never waits longer than `maxMs` in total. */
export function loadDeferredArt(maxMs=6000):Promise<void>{
 if(!defer)return Promise.resolve();
 if(running)return running;
 running=(async()=>{const t0=performance.now();const imgs=[...document.querySelectorAll<HTMLImageElement>('img[data-src]')];if(!imgs.length)return;mobileDebug.event('art:deferred-start',{count:imgs.length});
  for(const img of imgs){const left=maxMs-(performance.now()-t0);if(left<=0)break;const url=img.dataset.src!;delete img.dataset.src;
   await new Promise<void>(res=>{const t=window.setTimeout(res,left);const done=()=>{clearTimeout(t);res();};img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});img.decoding='async';img.src=url;});}
  mobileDebug.event('art:deferred-done',{ms:Math.round(performance.now()-t0)});})().finally(()=>{running=null;});
 return running;}
