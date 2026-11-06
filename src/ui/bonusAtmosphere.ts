import {PLAY_AREA,DESIGN} from '../layout';
/**
 * Bonus "wheel" atmosphere: the machine itself changes while a feature is running.
 * CHEST = gold + magic violet · SCATTER = spectral violet + moonlight. Purely visual: one glow ring, one light sweep, one small particle canvas
 * (≤40 motes, drawn from the existing frame loop — no render loop of its own), pulses on real reel stops, restrained shake on big wins (no strobing).
 */
export type AtmosMode='chest'|'scatter'|null;
export function createBonusAtmosphere(d:{world:HTMLElement;after:HTMLElement;reduced:boolean}){
 const root=document.createElement('div');root.className='ba';root.hidden=true;root.setAttribute('aria-hidden','true');
 const pad=26;const box=(c:string,css:string)=>{const e=document.createElement('div');e.className=c;e.style.cssText=css;root.appendChild(e);return e;};
 const geo=`left:${PLAY_AREA.x-pad}px;top:${PLAY_AREA.y-pad}px;width:${PLAY_AREA.w+pad*2}px;height:${PLAY_AREA.h+pad*2}px`;
 const glow=box('ba-glow',geo);const sweepBox=box('ba-sweepbox',`left:${PLAY_AREA.x}px;top:${PLAY_AREA.y}px;width:${PLAY_AREA.w}px;height:${PLAY_AREA.h}px`);box('ba-sweep','').remove();const sweep=document.createElement('div');sweep.className='ba-sweep';sweepBox.appendChild(sweep);
 const cv=document.createElement('canvas');cv.width=DESIGN.w/2;cv.height=DESIGN.h/2;cv.className='ba-fx';root.appendChild(cv);const c=cv.getContext('2d')!;
 d.after.insertAdjacentElement('afterend',root);
 let mode:AtmosMode=null,t=0;type M={x:number;y:number;v:number;s:number;ph:number;tr:number};const N=d.reduced?0:36;
 const motes:M[]=Array.from({length:N},()=>({x:0,y:0,v:0,s:0,ph:0,tr:0}));
 const respawn=(m:M,init:boolean)=>{const left=Math.random()<.5;m.x=(left?60+Math.random()*(PLAY_AREA.x-80):PLAY_AREA.x+PLAY_AREA.w+20+Math.random()*(DESIGN.w-PLAY_AREA.x-PLAY_AREA.w-80))/2;m.y=(init?Math.random()*DESIGN.h:DESIGN.h+10)/2;m.v=(18+Math.random()*30)*(mode==='scatter'?1.3:1)/2;m.s=1+Math.random()*2.4;m.ph=Math.random()*6.28;m.tr=mode==='scatter'?8+Math.random()*14:0;};
 motes.forEach(m=>respawn(m,true));
 const api={
  get mode(){return mode;},
  set(m:AtmosMode){mode=m;root.hidden=!m;root.classList.toggle('chest',m==='chest');root.classList.toggle('scatter',m==='scatter');if(m)motes.forEach(x=>respawn(x,true));else c.clearRect(0,0,cv.width,cv.height);},
  /** frame loop hook */
  update(dt:number){if(!mode||document.hidden||!N)return;t+=dt;c.clearRect(0,0,cv.width,cv.height);const gold=mode==='chest';
   for(const m of motes){m.y-=m.v*dt;m.x+=Math.sin(t*.8+m.ph)*.18;if(m.y<-12)respawn(m,false);const a=.35+.35*Math.sin(t*2+m.ph);
    c.globalCompositeOperation='lighter';
    if(m.tr){const g=c.createLinearGradient(m.x,m.y,m.x,m.y+m.tr);g.addColorStop(0,'rgba(205,190,255,.55)');g.addColorStop(1,'rgba(205,190,255,0)');c.fillStyle=g;c.fillRect(m.x-.6,m.y,1.2,m.tr);}
    const r=m.s*3;const gr=c.createRadialGradient(m.x,m.y,0,m.x,m.y,r);gr.addColorStop(0,gold?`rgba(255,220,130,${a})`:`rgba(215,200,255,${a})`);gr.addColorStop(1,'rgba(255,200,100,0)');c.fillStyle=gr;c.beginPath();c.arc(m.x,m.y,r,0,6.283);c.fill();}
  },
  /** reel stop / small win: the frame breathes brighter for a moment */
  pulse(k=1){if(!mode||d.reduced)return;glow.animate([{filter:'brightness(1)'},{filter:`brightness(${1+.7*k})`},{filter:'brightness(1)'}],{duration:420,easing:'ease-out'});},
  /** bigger events (retrigger, big win): stronger pulse + restrained, short shake (no strobing) */
  surge(){if(!mode)return;api.pulse(1.6);if(d.reduced)return;sweep.animate([{transform:'translateX(-130%) skewX(-18deg)'},{transform:'translateX(260%) skewX(-18deg)'}],{duration:900,easing:'ease-in-out'});},
  impact(tier:'none'|'small'|'medium'|'big'|'mega'|'max'){if(!mode)return;if(tier==='medium')api.pulse(1.1);else if(tier==='big'||tier==='mega'||tier==='max'){api.surge();if(!d.reduced)d.world.animate([{translate:'0 0'},{translate:'4px -3px'},{translate:'-3px 3px'},{translate:'2px -1px'},{translate:'0 0'}],{duration:520,easing:'ease-out'});}},
  dispose(){root.remove();},
 };
 return api;
}
