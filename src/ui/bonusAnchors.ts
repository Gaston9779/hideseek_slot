/**
 * Normalised anchors for the bonus-v2 UI artwork. Every rectangle was MEASURED on the PNGs (flood fill of the empty decorated areas / ring detection),
 * in the pixel space of each image, and is exposed as percentages of the image — so the picture and its interactive areas scale together.
 */
export interface Rect{x:number;y:number;w:number;h:number}
export interface Disc{cx:number;cy:number;r:number}
export const BUY_FRAME={w:1122,h:1402,
 title:{x:266,y:291,w:587,h:84} as Rect,                    // wooden plaque
 intro:{x:150,y:394,w:822,h:58} as Rect,                     // free strip between plaque and the panel (descriptive text)
 square:{x:188,y:526,w:163,h:148} as Rect,                   // dark portrait square (Baby Skull)
 skullCanvas:{x:178,y:438,w:183,h:236} as Rect,              // portrait canvas: same bottom/centre as the square, extends upward so horns may overflow its top edge
 medals:[{cx:561,cy:613,r:58},{cx:693,cy:613,r:58},{cx:824,cy:613,r:58}] as Disc[],
 minus:{cx:347,cy:781,r:34} as Disc,plus:{cx:781,cy:781,r:34} as Disc,stake:{x:395,y:744,w:327,h:80} as Rect,
 cost:{x:126,y:854,w:418,h:121} as Rect,balance:{x:577,y:854,w:419,h:121} as Rect,
 cta:{x:211,y:1039,w:700,h:98} as Rect,cancel:{x:370,y:1197,w:381,h:65} as Rect,close:{cx:998,cy:363,r:48} as Disc};
export const HUD_FRAME={w:1672,h:941,
 title:{x:417,y:193,w:824,h:144} as Rect,orb:{cx:352,cy:523,r:165} as Disc,
 rows:{x:651,y:410,w:796,h:116} as Rect,base:{x:650,y:568,w:800,h:121} as Rect,mode:{x:585,y:751,w:510,h:79} as Rect};
/** Medal ring inside multiplier-x*.png (1254²): centre (612,710), radius 430 → placing the ring on a disc scales the whole picture (the Baby Skull on top overflows by design). */
export const MEDAL={size:1254,cx:612,cy:710,r:430};
export const pctRect=(r:Rect,f:{w:number;h:number})=>`left:${(r.x/f.w*100).toFixed(4)}%;top:${(r.y/f.h*100).toFixed(4)}%;width:${(r.w/f.w*100).toFixed(4)}%;height:${(r.h/f.h*100).toFixed(4)}%`;
export const pctDisc=(c:Disc,f:{w:number;h:number})=>pctRect({x:c.cx-c.r,y:c.cy-c.r,w:c.r*2,h:c.r*2},f);
/** Position of the whole medal image so that its ring covers `disc` (scale = disc.r×fit / ring radius). */
export function medalImgStyle(disc:Disc,f:{w:number;h:number},fit=1){const s=disc.r*fit/MEDAL.r,w=MEDAL.size*s,x=disc.cx-MEDAL.cx*s,y=disc.cy-MEDAL.cy*s;return pctRect({x,y,w,h:w},f);}
