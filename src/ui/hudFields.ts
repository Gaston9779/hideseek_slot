/**
 * BALANCE / BET / WIN value layout. The containers are placed on the measured pill recesses of the artwork (layout.ts FIELD_ART); here the text is
 * centred inside them: CSS flex centring + ONE optical correction derived from the real font metrics (Georgia has old-style figures, so the line box
 * centre is not the centre of the digits' x-height band) + width fitting so long values never touch the frame or neighbouring buttons.
 */
const IDS=['balance','bet','win'] as const;
export interface FieldMetrics{inkDyEm:number}
export function measureInk(family:string,weight='700'):FieldMetrics{
 const c=document.createElement('canvas').getContext('2d')!;c.font=`${weight} 200px ${family}`;
 const m=c.measureText('0'),A=m.fontBoundingBoxAscent??m.actualBoundingBoxAscent,D=m.fontBoundingBoxDescent??m.actualBoundingBoxDescent;
 const em=200,baseline=((em-(A+D))/2+A),inkCentre=baseline-(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;   // y from top of a line-height:1 box
 return {inkDyEm:(em/2-inkCentre)/em};
}
export function initHudFields(root:HTMLElement=document.documentElement){
 const b0=document.querySelector<HTMLElement>('#balance')!,cs=getComputedStyle(b0);
 const fm=measureInk(cs.fontFamily,cs.fontWeight);root.style.setProperty('--ink-dy',`${fm.inkDyEm.toFixed(4)}em`);
 const fit=(b:HTMLElement)=>{const field=b.parentElement!;const avail=field.clientWidth*.9;b.style.fontSize='';const w=b.offsetWidth;if(w>avail&&w>0)b.style.fontSize=`${(avail/w).toFixed(4)}em`;};
 const obs=new MutationObserver(ms=>{for(const m of ms)fit((m.target.nodeType===3?m.target.parentElement:m.target) as HTMLElement);});
 for(const id of IDS){const b=document.querySelector<HTMLElement>(`#${id}`)!;obs.observe(b,{childList:true,characterData:true,subtree:true});fit(b);}
 return {fit:()=>IDS.forEach(id=>fit(document.querySelector<HTMLElement>(`#${id}`)!)),metrics:fm};
}
