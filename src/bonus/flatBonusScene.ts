import type {BonusScene} from './bonusScene';
import {BONUS_IMG,PEDESTALS} from './bonusLayout';
import {symbolUrl} from '../view/assets';
/**
 * Phones: the Hide & Seek chest picker without WebGL. Same BonusScene contract as the 3D scene (the chest state machine, prizes, medals,
 * engine adapter and timing are untouched), but the three chests are plain <img> buttons on the pedestals of the bonus art, animated with
 * transform/opacity only. No canvas, no GL context, no GLB, no PMREM: nothing here can add GPU load.
 */
export function createFlatBonusScene(o:{root:HTMLElement;canvas:HTMLCanvasElement;reduced:boolean;onPick:(i:number)=>void}):BonusScene{
 const wrap=document.createElement('div');wrap.className='fc-wrap';wrap.setAttribute('aria-hidden','true');
 const url=symbolUrl('CHEST_BONUS');
 const els=PEDESTALS.map((p,i)=>{const b=document.createElement('button');b.type='button';b.className='fc';b.tabIndex=-1;b.style.left=`${p.u/BONUS_IMG.w*100}%`;b.style.top=`${(p.v+34)/BONUS_IMG.h*100}%`;
  const img=document.createElement('img');img.src=url;img.alt='';img.draggable=false;b.appendChild(img);b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.classList.contains('on'))o.onPick(i);});wrap.appendChild(b);return b;});
 o.canvas.style.display='none';o.root.appendChild(wrap);
 let running=false;
 const reset=()=>{for(const e of els)e.className='fc';};
 return {
  chests:[] as never,skullClips:[],
  setInteractive:on=>{for(const e of els)e.classList.toggle('on',on);},
  setSelected:i=>{els[i]?.classList.add('sel');},
  setUnselected:i=>{els[i]?.classList.add('dim');},
  highlightBest:i=>{els[i]?.classList.add('best');},
  openChest:i=>{els[i]?.classList.add('open');return new Promise<void>(r=>setTimeout(r,o.reduced?0:520));},
  skullAppear:()=>{},skullHide:()=>{},
  reset,start:()=>{running=true;},stop:()=>{running=false;},resize:()=>{},
  dispose:()=>{wrap.remove();o.canvas.style.display='';},
  inspect:()=>({running,chests:els.map(e=>({progress:+e.classList.contains('open'),angle:0,state:e.className,pos:[0,0,0],scale:1})),skull:{visible:false,state:'idle',pos:[0,0,0]},errors:[]}),
 };
}
