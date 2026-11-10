import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {DESIGN,FRAME,HUD,PANEL,SKULL,SKULL_ANCHOR} from '../layout';
import {CHASE,HOLO_INTRO,HOLO_INTRO_TOTAL} from '../config/chase';import {cue} from '../audio/cues';import {HologramMaterialization,HoloBeamFx,introState} from './hologram';
import {RigPoser} from './rigPose';
import * as P from './poses';
import {mobileDebug} from '../mobileDebug';import {createEnvironment,createGlRenderer} from '../view/quality';
/**
 * 3D "Seeker chase" gag. One extra transparent WebGL canvas covering the whole 1920×1080 design space (1 unit = 1 design px, y up),
 * driven by the existing main loop (no second rAF). Occlusion is explicit and depth-based:
 *   – two invisible, alpha-tested "occluder" planes at z=0 reproduce the exact silhouettes of the 2D machine frame and control panel (their own PNG alpha);
 *   – characters walk on a FRONT lane (z>0, in front of the occluders) or a BACK lane (z<0, hidden wherever the machine/ledge art is opaque);
 *   – the SPIN button (art lives inside the panel PNG) is protected by a CSS mask hole on the canvas.
 * Purely cosmetic: no import of math/engine code.
 */
const ZF=250,ZB=-250,YF=SKULL_ANCHOR.y,YB=SKULL_ANCHOR.y-52;       // lane depth / feet line on the plinth (front = original Skull's standing line)
const HOME={x:SKULL_ANCHOR.x,y:SKULL_ANCHOR.y,yaw:.38};
const FACE_L=-1.25,FACE_R=1.25;
/** Where the Seeker materialises and lands: the original Skull's plinth mirrored across the machine, same stone level (feet line YF). Derived from the layout, never absolute pixels. */
export const SEEKER_LANDING={x:DESIGN.w-SKULL_ANCHOR.x,y:YF};
const LX=SEEKER_LANDING.x;
export type ChaseKind='skull'|'seeker';
type Anim='look'|'idle'|'alert'|'panic'|'run'|'scan'|'lunge'|'trip'|'tumble'|'brake'|'settle'|'hidden';
interface Seg{t0:number;t1:number;x0:number;x1:number;l0:number;l1:number;yaw0:number;yaw1:number;anim:Anim;cad?:number;amp?:number}
const S=(t0:number,t1:number,x0:number,x1:number,l0:number,l1:number,yaw0:number,yaw1:number,anim:Anim,cad?:number,amp?:number):Seg=>({t0,t1,x0,x1,l0,l1,yaw0,yaw1,anim,cad,amp});
// ---- storyboard (seconds). lane 0 = front, 1 = back (hidden behind the machine for x∈[385,1535]) -------------------------------------------------
const SEEKER:Seg[]=[
 S(0,.5,LX,LX,0,0,HOME.yaw,FACE_L,'idle'),                   // A: (after the hologram landing, t<0) turns towards the original Skull
 S(.5,2.5,LX,LX,0,0,FACE_L,FACE_L,'look'),                 //    searching from the plinth
 S(2.5,3.5,LX,330,0,0,FACE_L,FACE_L,'lunge'),             // C: spots Skull fleeing, gives chase (same route, ~0.6 s later)
 S(3.5,3.8,330,250,0,1,FACE_L,FACE_R,'run',3.2,1),         //    steps back behind the left side and turns
 S(3.8,5.4,250,1580,1,1,FACE_R,FACE_R,'run',3.6,1.0),     //    behind the machine (occluded by the frame art)
 S(5.4,5.65,1580,1650,1,0,FACE_R,FACE_R,'run',3.4,1),      // E: re-emerges on the right, still launched
 S(5.65,6.1,1650,1700,0,0,FACE_R,FACE_R,'trip'),           //    trips on the plinth step (after Skull is home)
];
const SKULLSEG:Seg[]=[
 S(0,1.5,HOME.x,HOME.x,0,0,HOME.yaw,HOME.yaw,'idle'),
 S(1.5,2.1,HOME.x,HOME.x,0,0,HOME.yaw,.95,'alert'),        // B: sees the seeker (clip "afraid"), hops
 S(2.1,2.7,HOME.x,HOME.x,0,0,.95,FACE_L,'panic'),          //    flails and turns to flee
 S(2.7,2.95,HOME.x,335,0,0,FACE_L,FACE_L,'run',3.4,1),
 S(2.95,3.2,335,260,0,1,FACE_L,FACE_R,'run',3.4,1),        // C: steps behind the left side
 S(3.2,4.1,260,1560,1,1,FACE_R,FACE_R,'run',3.8,1.05),     //    behind the machine
 S(4.1,4.4,1560,1620,1,0,FACE_R,FACE_L,'run',3.4,1),       // D: pops out on the right, spins around
 S(4.4,5.5,1620,HOME.x+20,0,0,FACE_L,FACE_L,'run',3.6,1.05),     //    dashes home along the front of the plinth
 S(5.5,5.8,HOME.x+20,HOME.x,0,0,FACE_L,HOME.yaw,'brake'),
 S(5.8,6.2,HOME.x,HOME.x,0,0,HOME.yaw,HOME.yaw,'settle'),
 S(6.2,7.0,HOME.x,HOME.x,0,0,HOME.yaw,HOME.yaw,'idle'),
];
const TUMBLE={t0:6.1,t1:6.95,x0:1700,vx:380,v0:420,g:1000,turns:1.2};
export const CHASE_END=7.0;
/** Story-time marks reported to the caller (bonus endings hook their effects here). */
export const CHASE_MARKS={crateDrop:5.35,impact:6.1,skullHome:5.8};
const CRATE_X=1730;
class Actor{
 readonly model:T.Object3D;readonly root=new T.Group();private mid=new T.Group();readonly mdl=new T.Group();readonly shadow:T.Mesh;
 poser:RigPoser;mixer?:T.AnimationMixer;alert?:T.AnimationAction;height:number;gun:boolean;
 constructor(model:T.Object3D,height:number,gun:boolean,anims:T.AnimationClip[],shadowTex:T.Texture){
  this.height=height;this.gun=gun;this.model=model;
  // normalise: feet centre at origin, requested height (same recipe as the in-slot Skull → identical scale/foot contact)
  const inner=new T.Group();inner.add(model);inner.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
  const s=height/size.y;model.scale.multiplyScalar(s);model.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(s));
  this.mdl.add(inner);this.mid.position.y=height/2;this.mdl.position.y=-height/2;this.mid.add(this.mdl);this.root.add(this.mid);
  this.root.updateMatrixWorld(true);this.poser=new RigPoser(model,this.mdl);
  model.traverse(o=>{if((o as T.Mesh).isMesh)o.frustumCulled=false;});
  if(anims.length){this.mixer=new T.AnimationMixer(model);const a=anims.find(x=>x.name==='afraid');if(a){this.alert=this.mixer.clipAction(a);this.alert.setLoop(T.LoopOnce,1);this.alert.clampWhenFinished=true;}}
  this.shadow=new T.Mesh(new T.PlaneGeometry(height*1.0,height*.26),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));
  this.root.visible=false;this.shadow.visible=false;
 }
 setVisible(v:boolean){this.root.visible=v;this.shadow.visible=v;}
}
export type ChaseMark='crateDrop'|'impact'|'skullHome';
export interface StartOpts{speed?:number;crate?:boolean;onMark?:(m:ChaseMark,at:{x:number,y:number})=>void}
export interface Chase{
 /** Loads models (once) and plays the gag. Resolves true when it ran to completion, false if aborted/unavailable. */
 start(opts?:StartOpts):Promise<boolean>;abort():void;readonly running:boolean;ready():Promise<void>;
 /** Finale party: the original Skull and the Seeker (blaster at rest) jump and cheer at the given FEET positions (design px) until stopCelebrate(). Never resumes the chase. */
 celebrate(o:{skull:{x:number;y:number};seeker:{x:number;y:number}}):Promise<boolean>;stopCelebrate():void;readonly celebrating:boolean;
  /** DEV/QA: render the gag at an exact time (frame-accurate screenshots); stays paused until abort(). */
 scrub(time:number,dt?:number,crate?:boolean):Promise<void>;update(dt:number):void;resize():void;inspect():unknown;dispose():void;
}
export function createChase(d:{world:HTMLElement,skullCanvas:HTMLCanvasElement,renderScale:()=>number,skullTemplate:()=>{scene:T.Object3D,animations:T.AnimationClip[]},frameImg:HTMLImageElement,panelImg:HTMLImageElement,seekerUrl:string,skullHeight:number,crateUrl?:string}):Chase{
 const canvas=document.createElement('canvas');canvas.id='chase';canvas.setAttribute('aria-hidden','true');d.world.appendChild(canvas);
 const hole=HUD.spin;const R=hole.r*1.04;const mask=`radial-gradient(circle at ${hole.cx}px ${hole.cy}px, transparent ${R}px, #000 ${R+1.5}px)`;
 canvas.style.cssText=`position:absolute;left:0;top:0;width:${DESIGN.w}px;height:${DESIGN.h}px;z-index:5;pointer-events:none;visibility:hidden;-webkit-mask-image:${mask};mask-image:${mask}`;
 let renderer:T.WebGLRenderer|undefined,scene:T.Scene,cam:T.OrthographicCamera,skull:Actor,seeker:Actor,occluders:T.Mesh[]=[],tex:T.Texture[]=[],loading:Promise<void>|undefined,loaded=false;
 let t=0,running=false,resolveRun:((ok:boolean)=>void)|undefined,runs=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const lights:T.Light[]=[];
 function occluder(img:HTMLImageElement,x:number,y:number,w:number,h:number){
  const tx=new T.Texture(img);tx.colorSpace=T.SRGBColorSpace;tx.needsUpdate=true;tex.push(tx);
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,alphaTest:.5,colorWrite:false,depthWrite:true,side:T.DoubleSide}));
  m.position.set(x+w/2,DESIGN.h-(y+h/2),0);m.renderOrder=-10;scene.add(m);occluders.push(m);
 }
 const isolated=import.meta.env.DEV&&new URLSearchParams(location.search).has('debugNoChase');
 async function load(){
  if(isolated){mobileDebug.event('chase:isolated');return;}
  const gl=createGlRenderer('chase',canvas);renderer=gl;
  scene=new T.Scene();scene.environment=createEnvironment(gl);scene.environmentIntensity=.55;
  cam=new T.OrthographicCamera(0,DESIGN.w,DESIGN.h,0,-2000,2000);cam.position.set(0,0,1000);
  // identical lighting recipe as the in-slot Skull so the two stay visually matched
  lights.push(new T.HemisphereLight('#9a8cff','#4a3050',.9));const key=new T.DirectionalLight('#ffb36b',3.1);key.position.set(-500,600,700);const rim=new T.DirectionalLight('#7b5cff',3.2);rim.position.set(500,300,-500);const fill=new T.DirectionalLight('#ff8f4a',.8);fill.position.set(600,-200,600);lights.push(key,rim,fill);scene.add(...lights);
  occluder(d.frameImg,FRAME.x,FRAME.y,FRAME.src[0]*FRAME.scale,FRAME.src[1]*FRAME.scale);occluder(d.panelImg,PANEL.x,PANEL.y,PANEL.src[0]*PANEL.scale,PANEL.src[1]*PANEL.scale);
  const sc=document.createElement('canvas');sc.width=256;sc.height=64;{const g=sc.getContext('2d')!;const r=g.createRadialGradient(128,32,4,128,32,128);r.addColorStop(0,'rgba(8,2,20,.7)');r.addColorStop(1,'rgba(8,2,20,0)');g.save();g.scale(1,.26);g.fillStyle=r;g.fillRect(0,0,256,246);g.restore();}
  const shTex=new T.CanvasTexture(sc);tex.push(shTex);
  mobileDebug.asset('Skull_Seeker.glb','start');const gltf=await new GLTFLoader().loadAsync(d.seekerUrl);mobileDebug.asset('Skull_Seeker.glb','success');                    // loaded once, reused by every run
  const tpl=d.skullTemplate();
  skull=new Actor(SkeletonUtils.clone(tpl.scene),d.skullHeight,false,tpl.animations,shTex);
  seeker=new Actor(gltf.scene,d.skullHeight*CHASE.seekerHeightRatio,true,[],shTex);
  for(const a of [skull,seeker]){scene.add(a.root,a.shadow);}
  beamFx=new HoloBeamFx(SEEKER_LANDING.x,DESIGN.h-YF,DESIGN.h,ZF+20,d.renderScale()<.8?18:44);scene.add(beamFx.group);
  if(d.crateUrl){try{const cg=await new GLTFLoader().loadAsync(d.crateUrl);const m=cg.scene;m.traverse(o=>{if((o as T.Mesh).isMesh)o.frustumCulled=false;});const b=new T.Box3().setFromObject(m),sz=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),k=140/sz.y;m.scale.multiplyScalar(k);m.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(k));m.rotation.y=0;crate=new T.Group();const w=new T.Group();w.add(m);w.rotation.y=-.35;crate.add(w);crate.visible=false;scene.add(crate);}catch(e){console.warn('[chase] crate prop unavailable',e);}}
  loaded=true;resize();mobileDebug.renderer('chase:ready',{...renderer.info.memory,programs:renderer.info.programs?.length??0});
 }
 function resize(){if(!renderer)return;const s=d.renderScale(),w=Math.round(DESIGN.w*s),h=Math.round(DESIGN.h*s);renderer.setPixelRatio(1);renderer.setSize(w,h,false);mobileDebug.canvas('chase',w,h);}
 function pick(segs:Seg[],time:number){for(const s of segs)if(time>=s.t0&&time<s.t1)return s;return null;}
 const lerp=(a:number,b:number,u:number)=>a+(b-a)*u;
 let groundY=YF;     // feet line used by place(); the finale celebration temporarily moves it
 function place(a:Actor,x:number,lane:number,yawv:number,bounce:number,squash:number,wobble=0,roll=0){
  const gy=lerp(groundY,groundY-(YF-YB),lane),z=lerp(ZF,ZB,lane);a.root.position.set(x,DESIGN.h-gy+bounce*a.height,z);
  a.root.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),roll).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yawv));
  a.root.scale.set(1-squash*.5,1+squash,1-squash*.5);a.shadow.position.set(x,DESIGN.h-gy+3,z-8);a.shadow.visible=a.root.visible;a.shadow.scale.setScalar(Math.max(.4,1-Math.max(0,bounce)*2.2));void wobble;
 }
 function drive(a:Actor,segs:Seg[],time:number,isSkull:boolean){
  const seg=pick(segs,time);
  if(time>=TUMBLE.t0&&!isSkull){ // ballistic tumble: intentional trajectory + somersault, limbs flailing, exits right
   const u=time-TUMBLE.t0,dur=TUMBLE.t1-TUMBLE.t0;if(u>dur+.05){a.setVisible(false);return;}
   const x=TUMBLE.x0+TUMBLE.vx*u,up=Math.max(0,TUMBLE.v0*u-.5*TUMBLE.g*u*u),k=P.smooth(u/dur),theta=TUMBLE.turns*Math.PI*2*k;
   a.setVisible(true);const o=P.tumble({p:a.poser,gun:true},u);a.poser.apply(o.d);
   a.root.position.set(x,DESIGN.h-YF+up,ZF);a.root.quaternion.setFromAxisAngle(new T.Vector3(0,0,1),-theta).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),FACE_R));a.root.scale.set(1,1,1);
   a.shadow.position.set(x,DESIGN.h-YF+3,ZF-8);a.shadow.visible=true;a.shadow.scale.setScalar(Math.max(.35,1-up/260));return;}
  if(!seg){a.setVisible(time<0?false:isSkull);if(isSkull&&time>=CHASE_END)a.setVisible(false);return;}
  a.setVisible(true);const u=(time-seg.t0)/(seg.t1-seg.t0),lt=time-seg.t0,e=P.smooth(u);
  const x=lerp(seg.x0,seg.x1,seg.anim==='run'||seg.anim==='lunge'||seg.anim==='scan'?u:e),lane=lerp(seg.l0,seg.l1,e),yaw=lerp(seg.yaw0,seg.yaw1,P.smooth(Math.min(1,u*1.3)));
  const ctx={p:a.poser,gun:a.gun};let o:P.PoseOut;let squash=0,mix=0;
  switch(seg.anim){
   case 'run':o=P.run(ctx,time,seg.cad,seg.amp);break;
   case 'look':{o=P.idle(ctx,time);const sc=P.scan(ctx,time);if(sc.d.Head)o.d.Head=sc.d.Head;break;}
   case 'lunge':o=P.lunge(ctx,time);break;case 'scan':o=P.scan(ctx,time);break;
   case 'trip':o=P.trip(ctx,u);break;case 'brake':o=P.brake(ctx,u);break;
   case 'panic':o=P.panic(ctx,lt);break;
   case 'alert':o=P.idle(ctx,time);mix=1;{ // clip "afraid" (real GLB clip) + a surprise hop with squash & stretch
     const hopT=.3,hu=(lt-hopT)/.3;if(hu>0&&hu<1){a.root.position.y+=0;squash=hu<.25?.08*(hu/.25):.08*(1-hu)*-.9;} }break;
   default:o=P.idle(ctx,time);
  }
  // blend: the procedural pose takes the share the mixer clip ("afraid") is not using → smooth crossfade in and out of the real clip
  const mw=a.alert?a.alert.getEffectiveWeight():0;void mix;
  if(seg.anim==='settle'){a.poser.apply(o.d,Math.max(.12,P.smooth(u)));}
  else if(mw<.999)a.poser.apply(o.d,1-mw);
  let bounce=o.bounce;
  if(seg.anim==='alert'){const hu=(lt-.3)/.45;if(hu>0&&hu<1)bounce+=Math.sin(hu*Math.PI)*.16;squash=hu>0&&hu<1?(hu<.2?.1*(hu/.2):-.06*Math.sin(hu*Math.PI)):0;}
  if(seg.anim==='panic'){squash=.03*Math.sin(lt*17);}
  place(a,x,lane,yaw,bounce,squash+o.squash);
 }
 let celeb:{t:number;sk:{x:number;y:number};se:{x:number;y:number}}|null=null;
 let alertStarted=false,alertFaded=false,scrubbing=false,opts:StartOpts={},speed=1;const holo=new HologramMaterialization();let beamFx:HoloBeamFx|undefined;const fired=new Set<ChaseMark>();
 let crate:T.Group|undefined;
 function driveCrate(time:number){
  if(!crate)return;if(!opts.crate||time<CHASE_MARKS.crateDrop||time>=CHASE_END){crate.visible=false;return;}
  crate.visible=true;const u=Math.min(1,(time-CHASE_MARKS.crateDrop)/.3),landed=time-CHASE_MARKS.crateDrop-.3;let y=0,sq=0,rz=0;
  if(u<1)y=480*(1-u*u);else if(landed<.22){const k=landed/.22;y=22*Math.sin(k*Math.PI);sq=-.1*(1-k)*Math.cos(k*Math.PI*2);}
  if(time>=CHASE_MARKS.impact){const w=time-CHASE_MARKS.impact;y+=Math.max(0,60*Math.sin(Math.min(1,w/.35)*Math.PI));rz=.35*Math.exp(-w*4)*Math.sin(w*22);}
  crate.position.set(CRATE_X,DESIGN.h-YF+y,ZF+60);crate.rotation.z=rz;crate.scale.set(1-sq*.5,1+sq,1-sq*.5);
 }
 /** Seeker hologram arrival (t < 0): beam → materialise → descent → landing on SEEKER_LANDING. */
 function driveIntro(time:number){
  const u=time+HOLO_INTRO_TOTAL,s=introState(u);
  const gy=YF;seeker.setVisible(s.visible);
  if(s.visible){const o=P.idle({p:seeker.poser,gun:true},u);seeker.poser.apply(o.d);place(seeker,LX,0,HOME.yaw,(s.lift+s.bounce)/seeker.height,s.squash+o.squash);
   seeker.shadow.visible=true;seeker.shadow.position.set(LX,DESIGN.h-gy+3,ZF-8);seeker.shadow.scale.setScalar(Math.max(.4,1-(s.lift/260))*s.alpha);}
  holo.apply(s,u,DESIGN.h-gy,seeker.height);beamFx?.update(s,u);
 }
 function driveSeekerAt(time:number){
  if(time<0){if(!holo.isActive)holo.begin(seeker.model);driveIntro(time);}
  else{if(holo.isActive){holo.end();}
   if(time<.9){const s=introState(HOLO_INTRO_TOTAL+time);beamFx?.update(s,HOLO_INTRO_TOTAL+time);}else beamFx?.setVisible(false);   // ring finishes its glow
   drive(seeker,SEEKER,time,false);}
 }
 function driveSkullAt(time:number){drive(skull,SKULLSEG,time<0?.05+(time+HOLO_INTRO_TOTAL)*.5:time,true);}   // idles on its plinth while the Seeker arrives
 /** Sound cues on the REAL phases of the chase (no timers of their own: they follow the same clock, skip/abort stops them). */
 const aud=new Set<string>();
 function audioMarks(){const once=(k:string,at:number,fn:()=>void)=>{if(t>=at&&!aud.has(k)){aud.add(k);fn();}};
  once('beam',-HOLO_INTRO_TOTAL,()=>cue.hologramBeam());once('land',-HOLO_INTRO.land,()=>cue.skullLand());
  once('look',.5,()=>cue.voice('searching'));once('scared',1.5,()=>cue.voice('scared'));
  once('run',2.5,()=>cue.skullRun(true));once('runOff',6.0,()=>cue.skullRun(false));once('fall',TUMBLE.t0,()=>cue.skullFall());}
 function marks(){const at={crateDrop:{x:CRATE_X,y:YF-20},impact:{x:CRATE_X-30,y:YF-70},skullHome:{x:HOME.x,y:HOME.y-120}};for(const k of Object.keys(CHASE_MARKS) as ChaseMark[])if(!fired.has(k)&&t>=CHASE_MARKS[k]){fired.add(k);opts.onMark?.(k,at[k]);}}
 function end(ok:boolean){running=false;aud.clear();if(!ok)cue.cinematicAbort();holo.end();beamFx?.setVisible(false);if(crate)crate.visible=false;scrubbing=false;canvas.style.visibility='hidden';d.skullCanvas.style.visibility='';skull?.setVisible(false);seeker?.setVisible(false);for(const a of [skull,seeker]){a?.poser.reset();a?.alert?.stop();a?.mixer?.stopAllAction();}alertStarted=false;alertFaded=false;const r=resolveRun;resolveRun=undefined;r?.(ok);}
 function driveCelebration(dt:number){
  const c=celeb!;c.t+=Math.min(dt,.05);const t=c.t,enter=Math.min(1,t/.4),ease=1-Math.pow(1-enter,3);
  for(const [a,pos,ph,yaw] of [[skull,c.sk,0,.4],[seeker,c.se,.45,-.4]] as const){
   a.setVisible(true);groundY=pos.y;const o=P.cheer({p:a.poser,gun:a.gun},t,ph);a.poser.apply(o.d);
   place(a,pos.x,0,yaw+Math.sin(t*1.6+ph*6)*.14,o.bounce*ease,o.squash*ease);}
  groundY=YF;renderer!.render(scene,cam);
 }
 function endCelebration(){if(!celeb)return;celeb=null;groundY=YF;canvas.style.zIndex='5';canvas.style.visibility='hidden';d.skullCanvas.style.visibility='';skull?.setVisible(false);seeker?.setVisible(false);for(const a of [skull,seeker])a?.poser.reset();}
 const api:Chase={
  async celebrate(o){if(running||reduced||celeb)return false;await api.ready();if(!loaded||running||celeb)return false;holo.end();beamFx?.setVisible(false);
   for(const a of [skull,seeker]){a.poser.reset();a.mixer?.stopAllAction();}if(crate)crate.visible=false;resize();celeb={t:0,sk:o.skull,se:o.seeker};d.skullCanvas.style.visibility='hidden';canvas.style.zIndex='9';canvas.style.visibility='visible';return true;},
  stopCelebrate(){endCelebration();},get celebrating(){return !!celeb;},
  ready(){if(!loading)loading=load().catch(e=>{console.error('[chase] load failed',e);loading=undefined;});return loading;},
  async start(o={}){
   if(running||reduced)return false;await api.ready();if(!loaded||running)return false;
   opts=o;speed=o.speed??1;fired.clear();running=true;t=-HOLO_INTRO_TOTAL;runs++;alertStarted=false;alertFaded=false;resize();d.skullCanvas.style.visibility='hidden';canvas.style.visibility='visible';
   for(const a of [skull,seeker]){a.poser.reset();a.mixer?.stopAllAction();}
   return new Promise<boolean>(res=>{resolveRun=res;});
  },
  async scrub(time,dt=1/60,crate=false){opts={crate};await api.ready();if(!loaded)return;if(!running){running=true;scrubbing=true;t=time<0?-HOLO_INTRO_TOTAL:0;resize();d.skullCanvas.style.visibility='hidden';canvas.style.visibility='visible';for(const a of [skull,seeker]){a.poser.reset();a.mixer?.stopAllAction();}alertStarted=false;alertFaded=false;}
   scrubbing=true;while(t<time-1e-6){t=Math.min(time,t+dt);const seg=pick(SKULLSEG,t);if(seg?.anim==='alert'&&skull.alert&&!alertStarted){skull.alert.reset().fadeIn(.15).play();alertStarted=true;}if(seg?.anim==='panic'&&skull.alert&&alertStarted&&!alertFaded){skull.alert.fadeOut(.25);alertFaded=true;}skull.mixer?.update(dt);driveSkullAt(t);driveSeekerAt(t);}driveCrate(t);renderer!.render(scene,cam);},
  abort(){if(running){scrubbing=false;end(false);}},
  get running(){return running;},
  update(dt){
   if(celeb&&renderer&&!running){driveCelebration(dt);return;}
   if(!running||!renderer||scrubbing)return;const sdt=Math.min(dt,.05)*speed;t+=sdt;
   // skull's alert clip runs through the AnimationMixer (real GLB clip "afraid"); procedural poses take over afterwards
   const seg=pick(SKULLSEG,t);if(seg?.anim==='alert'&&skull.alert&&!alertStarted){skull.alert.reset().fadeIn(.15).play();alertStarted=true;}
   if(seg?.anim==='panic'&&skull.alert&&alertStarted&&!alertFaded){skull.alert.fadeOut(.25);alertFaded=true;}
   skull.mixer?.update(sdt);
   driveSkullAt(t);driveSeekerAt(t);driveCrate(t);marks();audioMarks();
   renderer.render(scene,cam);
   if(t>=CHASE_END)end(true);
  },
  resize,
  inspect(){return {running,t,runs,loaded,memory:renderer?{...renderer.info.memory}:null,programs:renderer?.info.programs?.length,skull:skull&&{x:skull.root.position.x,y:skull.root.position.y,z:skull.root.position.z,visible:skull.root.visible,yaw:skull.root.rotation.y},seeker:seeker&&{x:seeker.root.position.x,y:seeker.root.position.y,z:seeker.root.position.z,visible:seeker.root.visible}};},
  dispose(){endCelebration();end(false);holo.dispose();beamFx?.dispose();for(const m of occluders){m.geometry.dispose();(m.material as T.Material).dispose();}tex.forEach(x=>x.dispose());renderer?.dispose();canvas.remove();},
 };
 void SKULL;void reduced;
 return api;
}
