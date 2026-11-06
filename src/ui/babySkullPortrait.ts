import * as T from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {RigPoser} from '../chase/rigPose';import * as P from '../chase/poses';
/**
 * Baby Skull "peeking" portrait for the Buy Bonus modal. Re-uses the ORIGINAL rigged GLB that is already loaded for the in-slot Skull (SkeletonUtils clone of its
 * template: no second download, shared geometry/materials) and the same procedural rig poser as the chase. A native <dialog> lives in the browser's top layer, so
 * the slot's own canvases cannot be drawn above it: the portrait therefore owns ONE small renderer that exists only for the dialog.
 * Lifecycle: start() on open (resets the sequence), stop() on close (cancels the frame, resets the rig), dispose() frees the renderer.
 * Sequence: emerges → looks left → looks right → curious tilt/hop → idle.
 */
export const PORTRAIT_T={emerge:.7,left:[.7,1.5] as const,right:[1.5,2.3] as const,curious:[2.4,3.5] as const};
const ease=(u:number)=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
/** Pure pose parameters at time t (tested): rise (0 hidden → 1 fully out), head yaw (rad, negative = viewer's left), tilt, hop. */
export function portraitPose(t:number){
 const rise=ease(t/PORTRAIT_T.emerge);let yaw=0,tilt=0,hop=0;
 const [l0,l1]=PORTRAIT_T.left,[r0,r1]=PORTRAIT_T.right,[c0,c1]=PORTRAIT_T.curious;
 if(t>=l0&&t<l1)yaw=-.62*Math.sin(Math.PI*(t-l0)/(l1-l0));else if(t>=r0&&t<r1)yaw=.62*Math.sin(Math.PI*(t-r0)/(r1-r0));
 if(t>=c0&&t<c1){const u=(t-c0)/(c1-c0);tilt=.3*Math.sin(Math.PI*u);hop=.035*Math.abs(Math.sin(2*Math.PI*u));}
 return {rise,yaw,tilt,hop};
}
export interface PortraitDeps{canvas:HTMLCanvasElement;template:()=>{scene:T.Object3D;animations:T.AnimationClip[]}|null;reduced:boolean}
export function createBabySkullPortrait(d:PortraitDeps){
 let renderer:T.WebGLRenderer|undefined,scene:T.Scene,cam:T.OrthographicCamera,root:T.Group,poser:RigPoser|undefined,raf=0,t0=0,running=false,ro:ResizeObserver|undefined,failed=false;
 const lights:T.Light[]=[];
 function build(){
  if(renderer||failed)return !failed;const tpl=d.template();if(!tpl){return false;}
  try{
   renderer=new T.WebGLRenderer({canvas:d.canvas,antialias:true,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
   scene=new T.Scene();lights.push(new T.HemisphereLight('#9a8cff','#4a3050',.95));const key=new T.DirectionalLight('#ffb36b',3.1);key.position.set(-2,3,4);const rim=new T.DirectionalLight('#7b5cff',3);rim.position.set(2,1.5,-2.5);const fill=new T.DirectionalLight('#ff8f4a',.8);fill.position.set(3,-1,3);lights.push(key,rim,fill);scene.add(...lights);
   const model=SkeletonUtils.clone(tpl.scene);model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);model.visible=true;model.traverse(o=>{if((o as T.Mesh).isMesh)o.frustumCulled=false;});
   const inner=new T.Group();inner.add(model);inner.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),s=1/size.y;
   model.scale.multiplyScalar(s);model.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(s));       // feet at y=0, height 1
   const frame=new T.Group();frame.add(inner);root=new T.Group();root.add(frame);scene.add(root);root.updateMatrixWorld(true);poser=new RigPoser(model,frame);
   cam=new T.OrthographicCamera(-1,1,1,-1,-10,10);cam.position.set(0,0,5);if(import.meta.env.DEV)(window as unknown as Record<string,unknown>).__ptr={root,cam,scene,renderer,model,T};ro=new ResizeObserver(()=>fit());ro.observe(d.canvas);fit();return true;
  }catch(e){failed=true;console.warn('[baby-skull] portrait unavailable',e);return false;}
 }
 /** canvas box = the square + headroom: show the upper ~62 % of the character, head near the top, horns can reach the canvas top edge */
 function fit(){if(!renderer)return;const w=Math.max(2,d.canvas.clientWidth),h=Math.max(2,d.canvas.clientHeight),dpr=Math.min(2,window.devicePixelRatio||1);renderer.setPixelRatio(1);renderer.setSize(Math.round(w*dpr),Math.round(h*dpr),false);
  const vh=1.0,aspect=w/h;cam.top=1.30;cam.bottom=1.30-vh;cam.left=-vh*aspect/2;cam.right=vh*aspect/2;cam.updateProjectionMatrix();}
 function frame(now:number){if(!running||!renderer||!poser)return;raf=requestAnimationFrame(frame);if(document.hidden)return;const t=(now-t0)/1000,p=d.reduced?portraitPose(99):portraitPose(t);
  const ctx={p:poser,gun:false},o=P.idle(ctx,t);const q=(ax:'x'|'y'|'z',a:number)=>new T.Quaternion().setFromAxisAngle(new T.Vector3(ax==='x'?1:0,ax==='y'?1:0,ax==='z'?1:0),a);
  o.d.Head=q('y',p.yaw).multiply(q('z',p.tilt)).multiply(q('x',-.1*p.tilt));o.d.Spine=(o.d.Spine??new T.Quaternion()).clone().multiply(q('y',p.yaw*.25));poser.apply(o.d);
  root.position.y=-.55*(1-p.rise)+p.hop;root.rotation.y=.18;renderer.render(scene,cam);}
 return {
  /** (Re)starts the sequence. Safe to call repeatedly; never creates a second loop. */
  start(){if(!build())return false;if(running)return true;running=true;t0=performance.now();fit();raf=requestAnimationFrame(frame);return true;},
  /** Hides/ends the portrait: loop cancelled, rig back to rest. */
  stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;poser?.reset();if(renderer){renderer.clear();}},
  get running(){return running;},get hasRenderer(){return !!renderer;},
  dispose(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;ro?.disconnect();ro=undefined;poser?.reset();poser=undefined;if(renderer){renderer.dispose();renderer.forceContextLoss();renderer=undefined;}for(const l of lights)l.removeFromParent();lights.length=0;},
 };
}
