import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {buildChest,loadChestTemplate} from '../bonus-chest/chest';
import {MascotController,type SkullState} from '../animation/mascot';
import {BONUS_IMG,CAMERA_PITCH_DEG,CHEST_PX,PEDESTALS,SKULL_ANCHOR} from './bonusLayout';

type Chest=ReturnType<typeof buildChest>;
const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!,r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'#fff');r.addColorStop(.4,'#ffffff77');r.addColorStop(1,'#ffffff00');g.fillStyle=r;g.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();
function normalize(obj:T.Object3D,height:number){const w=new T.Group();w.add(obj);obj.updateMatrixWorld(true);const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());const s=height/size.y;obj.scale.multiplyScalar(s);obj.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(s));return w;}

export interface BonusScene{
 chests:Chest[];readonly skullClips:string[];
 setInteractive(on:boolean):void;setSelected(i:number):void;setUnselected(i:number):void;highlightBest(i:number):void;
 openChest(i:number):Promise<void>;skullAppear(state:SkullState):void;skullHide():void;
 reset():void;start():void;stop():void;resize():void;dispose():void;
 inspect():{running:boolean,chests:{progress:number,angle:number,state:string,pos:number[],scale:number}[],skull:{visible:boolean,state:string,pos:number[]},errors:string[]};
}
export async function createBonusScene(o:{canvas:HTMLCanvasElement,chestUrl:string,skullUrl:string,renderScale:()=>number,onPick:(i:number)=>void}):Promise<BonusScene>{
 const errors:string[]=[];
 const renderer=new T.WebGLRenderer({canvas:o.canvas,antialias:true,alpha:true,premultipliedAlpha:true});renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.5;
 // chest unit = 1; the camera frustum is expressed in chest units so on-screen size is CHEST_PX per unit and identical for all three
 const halfW=BONUS_IMG.w/CHEST_PX/2,halfH=BONUS_IMG.h/CHEST_PX/2;const cam=new T.OrthographicCamera(-halfW,halfW,halfH,-halfH,.1,100);
 const pitch=T.MathUtils.degToRad(CAMERA_PITCH_DEG);cam.position.set(0,Math.sin(pitch)*30,Math.cos(pitch)*30);cam.lookAt(0,0,0);cam.updateMatrixWorld(true);
 scene.add(new T.HemisphereLight('#a79bff','#5a3a58',.9));const key=new T.DirectionalLight('#ffd7a0',2.6);key.position.set(-3,5,6);scene.add(key);const rim=new T.DirectionalLight('#7b5cff',2.6);rim.position.set(4,3,-4);scene.add(rim);
 // image pixel → point on the pedestal plane (y = 0) through the very same camera: one coordinate system for art and 3D
 const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
 const ground=(u:number,v:number)=>{const ndc=new T.Vector2(u/BONUS_IMG.w*2-1,1-v/BONUS_IMG.h*2);ray.setFromCamera(ndc,cam);const p=new T.Vector3();ray.ray.intersectPlane(plane,p);return p;};
 const template=await loadChestTemplate(o.chestUrl);
 const bb=new T.Box3().setFromObject(template),footCenter=bb.getCenter(new T.Vector3());           // real bounding box → real footing
 const chests:Chest[]=[];const hit:T.Mesh[]=[];const discs:T.Mesh[]=[];const rings:T.Mesh[]=[];
 const interact=[1,1,1].map(()=>0);let hover=-1,interactive=false;
 PEDESTALS.forEach((ped,i)=>{
  const c=buildChest(template);const P=ground(ped.u,ped.v);
  c.object.position.set(P.x-footCenter.x,P.y-bb.min.y,P.z-footCenter.z);                                    // underside of the real bbox sits on the pedestal surface
  c.object.name=`Chest ${i}`;scene.add(c.object);chests.push(c);
  const sh=document.createElement('canvas');sh.width=sh.height=128;{const g=sh.getContext('2d')!,r=g.createRadialGradient(64,64,4,64,64,64);r.addColorStop(0,'rgba(6,0,16,.65)');r.addColorStop(1,'rgba(6,0,16,0)');g.fillStyle=r;g.fillRect(0,0,128,128);}
  const shadow=new T.Mesh(new T.PlaneGeometry(1.55,1.2),new T.MeshBasicMaterial({map:new T.CanvasTexture(sh),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(P.x,.004,P.z);scene.add(shadow);
  const disc=new T.Mesh(new T.CircleGeometry(.95,40),new T.MeshBasicMaterial({map:glowTex,color:'#ffcc55',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));disc.rotation.x=-Math.PI/2;disc.position.set(P.x,.006,P.z);scene.add(disc);discs.push(disc);
  const ring=new T.Mesh(new T.RingGeometry(.6,.68,64),new T.MeshBasicMaterial({color:'#ffd36a',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(P.x,.008,P.z);scene.add(ring);rings.push(ring);
  const box=new T.Mesh(new T.BoxGeometry(1.2,1.5,1.2),new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}));box.position.set(P.x,.7,P.z);box.userData.index=i;scene.add(box);hit.push(box);
 });
 // ---- Skull actor: the real rigged GLB + existing MascotController (no root motion)
 const sg=await new GLTFLoader().loadAsync(o.skullUrl);for(const c of sg.animations)c.tracks=c.tracks.filter(t=>!t.name.endsWith('.position'));
 const skullRoot=normalize(sg.scene,SKULL_ANCHOR.heightPx/CHEST_PX);const skullCtl=new MascotController(sg.scene,sg.animations);
 const SP=ground(SKULL_ANCHOR.u,SKULL_ANCHOR.v);skullRoot.position.copy(SP);skullRoot.rotation.y=.35;skullRoot.visible=false;scene.add(skullRoot);
 const skShadow=new T.Mesh(new T.PlaneGeometry(1.1,.6),new T.MeshBasicMaterial({map:glowTex,color:'#000',transparent:true,opacity:.5,depthWrite:false}));skShadow.rotation.x=-Math.PI/2;skShadow.position.set(SP.x,.004,SP.z);skShadow.visible=false;scene.add(skShadow);
 let skAppear=-1,skHop=0;
 // ---- picking
 const rc=new T.Raycaster();const pick=(e:PointerEvent)=>{const r=o.canvas.getBoundingClientRect();rc.setFromCamera(new T.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1),cam);const h=rc.intersectObjects(hit,false)[0];return h?h.object.userData.index as number:-1;};
 const onMove=(e:PointerEvent)=>{hover=interactive?pick(e):-1;o.canvas.style.cursor=hover>=0?'pointer':'default';};
 const onDown=(e:PointerEvent)=>{if(!interactive)return;const i=pick(e);if(i>=0){hover=i;o.onPick(i);}};
 const onLeave=()=>{hover=-1;o.canvas.style.cursor='default';};
 o.canvas.addEventListener('pointermove',onMove);o.canvas.addEventListener('pointerdown',onDown);o.canvas.addEventListener('pointerleave',onLeave);
 // ---- loop
 let raf=0,running=false,last=0,t=0;const selected={i:-1};const dimmed=new Set<number>();
 const resize=()=>{const s=o.renderScale(),w=Math.round(BONUS_IMG.w*s),h=Math.round(BONUS_IMG.h*s);if(o.canvas.width!==w||o.canvas.height!==h){renderer.setPixelRatio(1);renderer.setSize(w,h,false);}};
 const base=chests.map(c=>c.object.scale.x);
 function frame(now:number){raf=requestAnimationFrame(frame);if(document.hidden){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;t+=dt;
  chests.forEach((c,i)=>{c.update(dt);
   const closed=c.state==='closed';
   // idle: tiny breathing + lid rattle about the hinge; the base never leaves the pedestal
   const hv=i===hover&&interactive?1:0;interact[i]+=(hv-interact[i])*Math.min(1,dt*10);
   if(closed&&interactive){c.pivot.rotation.x=-0.012-0.014*Math.sin(t*1.6+i*2.1)*(1+interact[i]*1.6);c.object.scale.setScalar(base[i]*(1+.006*Math.sin(t*1.3+i)+.022*interact[i]));}
   else if(closed){c.pivot.rotation.x=0;c.object.scale.setScalar(base[i]);}
   else c.object.scale.setScalar(base[i]);
   const d=discs[i].material as T.MeshBasicMaterial;const pulse=.5+.5*Math.sin(t*2.2+i*1.7);
   d.opacity=closed&&interactive?.16+.1*pulse+.35*interact[i]:selected.i===i?.55:dimmed.has(i)?.12:.2;
   const rg=rings[i].material as T.MeshBasicMaterial;rg.opacity=selected.i===i?.75+.2*Math.sin(t*4):0;
  });
  if(skAppear>=0){skAppear=Math.min(1,skAppear+dt/.4);const e=1-Math.pow(1-skAppear,3);skullRoot.scale.setScalar(Math.max(.001,e*(1+.08*Math.sin(skAppear*Math.PI))));}
  if(skullRoot.visible){skullCtl.update(dt);if(skHop>0){skHop=Math.max(0,skHop-dt);const k=1-skHop/1.6;skullRoot.position.y=SP.y+Math.abs(Math.sin(k*Math.PI*4))*.12*(1-k*.5);}else skullRoot.position.y=SP.y;}
  resize();renderer.render(scene,cam);
 }
 const api:BonusScene={chests,skullClips:skullCtl.clips.map(c=>c.name),
  setInteractive(on){interactive=on;if(!on){hover=-1;o.canvas.style.cursor='default';}},
  setSelected(i){selected.i=i;chests[i].glowScale=1.25;chests[i].burst();dimmed.clear();[0,1,2].filter(x=>x!==i).forEach(x=>dimmed.add(x));},
  setUnselected(i){chests[i].glowScale=.42;},
  highlightBest(i){chests[i].glowScale=1.6;chests[i].burst();setTimeout(()=>{if(chests[i].state==='open')chests[i].glowScale=1.25;},900);},
  openChest(i){return chests[i].open();},
  skullAppear(state){skullRoot.visible=true;skShadow.visible=true;skAppear=0;skullRoot.scale.setScalar(.001);skullCtl.setState(state);skHop=1.6;},
  skullHide(){skullRoot.visible=false;skShadow.visible=false;skAppear=-1;},
  reset(){chests.forEach(c=>c.reset());selected.i=-1;dimmed.clear();hover=-1;interactive=false;api.skullHide();skullCtl.setState('idle');rings.forEach(r=>(r.material as T.MeshBasicMaterial).opacity=0);},
  start(){if(running)return;running=true;last=performance.now();raf=requestAnimationFrame(frame);},
  stop(){running=false;cancelAnimationFrame(raf);},
  resize,
  dispose(){api.stop();o.canvas.removeEventListener('pointermove',onMove);o.canvas.removeEventListener('pointerdown',onDown);o.canvas.removeEventListener('pointerleave',onLeave);renderer.dispose();renderer.forceContextLoss();},
  inspect(){return {running,chests:chests.map(c=>({progress:c.progress,angle:c.angleDeg,state:c.state,pos:c.object.position.toArray(),scale:c.object.scale.x})),skull:{visible:skullRoot.visible,state:skullCtl.state,pos:skullRoot.position.toArray()},errors};},
 };
 // route GL problems into the inspector
 renderer.debug.checkShaderErrors=true;const oe=console.error;console.error=(...a:unknown[])=>{if(String(a[0]).includes('THREE'))errors.push(String(a[0]).slice(0,200));oe(...a);};
 resize();return api;
}
