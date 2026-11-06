import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Openable bonus chest. The lid node origin is the hinge line, so the lid just rotates about X.
 * The chest only PLAYS an animation and reveals a result that was already decided elsewhere.
 */
export const OPEN_ANGLE=T.MathUtils.degToRad(-105),OPEN_MS=1500,CLOSE_MS=1000;
const smooth=(t:number)=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;      // easeInOutCubic
const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!,r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'#fff');r.addColorStop(.3,'#ffffffaa');r.addColorStop(1,'#ffffff00');g.fillStyle=r;g.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();

/** Load the GLB once; every chest instance clones the node tree but SHARES geometry, material and texture. */
export async function loadChestTemplate(url:string){const gltf=await new GLTFLoader().loadAsync(url);return gltf.scene;}
export async function createChest(url:string){return buildChest(await loadChestTemplate(url));}
export function buildChest(template:T.Object3D){
 const root=template.clone(true);
 const pivot=root.getObjectByName('Chest_Lid_Pivot')!;if(!pivot)throw new Error('Chest_Lid_Pivot missing');
 const base=root.getObjectByName('Chest_Base')!;
 root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 const group=new T.Group();group.add(root);
 // ---- golden interior light: glow disc on the opening, volumetric-looking cone, point light, rising particles
 // the original base is a closed box: add a lining/treasure-glow surface inside the rim so the opening reads as hollow
 const lc=document.createElement('canvas');lc.width=lc.height=256;{const g=lc.getContext('2d')!,r=g.createRadialGradient(128,128,4,128,128,150);r.addColorStop(0,'#ffd878');r.addColorStop(.35,'#e0781a');r.addColorStop(.75,'#6a1408');r.addColorStop(1,'#6a1a2c');g.fillStyle=r;g.fillRect(0,0,256,256);}
 const lt=new T.CanvasTexture(lc);lt.colorSpace=T.SRGBColorSpace;const lining=new T.Mesh(new T.PlaneGeometry(.76,.68),new T.MeshBasicMaterial({map:lt,toneMapped:false}));lining.rotation.x=-Math.PI/2;lining.position.set(0,.525,-.02);group.add(lining);
 // matching lining under the lid (the original underside UV island is unpainted scribble)
 const lidLining=new T.Mesh(new T.PlaneGeometry(.84,.78),new T.MeshBasicMaterial({map:lt,color:'#7a4a44',toneMapped:false}));lidLining.rotation.x=Math.PI/2;lidLining.position.set(0,-.133,.43);pivot.add(lidLining);
 const inner=new T.Group();inner.position.set(0,.56,-.02);group.add(inner);
 const light=new T.PointLight('#ffb52e',0,2.6,1.8);light.position.set(0,.62,0);inner.add(light);
 const disc=new T.Mesh(new T.CircleGeometry(.36,40),new T.MeshBasicMaterial({map:glowTex,color:'#ffcc55',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.004;inner.add(disc);
 const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:'#ffb12a',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));halo.position.y=.35;halo.scale.setScalar(1.6);inner.add(halo);
 const beam=new T.Mesh(new T.CylinderGeometry(.34,.18,1.2,32,1,true),new T.MeshBasicMaterial({color:'#ffc65a',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false}));beam.position.y=.6;inner.add(beam);
 const N=70;const pts=new T.BufferGeometry(),pp=new Float32Array(N*3);pts.setAttribute('position',new T.BufferAttribute(pp,3));
 const pm=new T.PointsMaterial({map:glowTex,color:'#ffd27a',size:.11,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});const points=new T.Points(pts,pm);points.frustumCulled=false;inner.add(points);
 const pv=Array.from({length:N},()=>({age:Math.random()*2,vx:0,vy:0,vz:0,life:1.6}));
 const reset=(i:number)=>{const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.28;pp.set([Math.cos(a)*r,0,Math.sin(a)*r*.8],i*3);const p=pv[i];p.age=0;p.life=1.2+Math.random()*1.2;p.vx=(Math.random()-.5)*.1;p.vz=(Math.random()-.5)*.08;p.vy=.35+Math.random()*.6;};
 pv.forEach((_,i)=>{reset(i);pv[i].age=Math.random()*pv[i].life;});
 // ---- state machine
 let progress=0,target=0,dir=0,speedMs=OPEN_MS,lastTime=0,glowAmt=0,boost=0;let resolver:(()=>void)|undefined;
 const state=()=>progress>=1?'open':progress<=0?'closed':dir>0?'opening':dir<0?'closing':'partial';
 function apply(){pivot.rotation.x=OPEN_ANGLE*smooth(progress);}
 apply();
 const api={glowScale:1,burst(){boost=1;pv.forEach((p,i)=>{reset(i);p.vy*=2.1;p.life*=.8;});},object:group,base,pivot,get progress(){return progress;},get state(){return state();},get angleDeg(){return T.MathUtils.radToDeg(pivot.rotation.x);},
  open(){if(progress>=1||dir>0)return Promise.resolve();dir=1;speedMs=OPEN_MS;return new Promise<void>(r=>{resolver=r;});},
  close(){if(progress<=0||dir<0)return Promise.resolve();dir=-1;speedMs=CLOSE_MS;return new Promise<void>(r=>{resolver=r;});},
  seek(p:number){dir=0;progress=Math.min(1,Math.max(0,p));apply();},
  reset(){dir=0;progress=0;apply();glowAmt=0;boost=0;api.glowScale=1;resolver?.();resolver=undefined;pm.opacity=0;},
  update(dt:number){
   if(dir!==0){progress=Math.min(1,Math.max(0,progress+dir*dt*1000/speedMs));apply();if((dir>0&&progress>=1)||(dir<0&&progress<=0)){dir=0;resolver?.();resolver=undefined;}}
   // glow follows how far the lid has opened (starts after ~12° so nothing leaks through a closed seam)
   boost=Math.max(0,boost-dt*1.1);const p=Math.max(0,(progress-.1)/.9);const want=smooth(Math.min(1,p))*api.glowScale*(1+boost*.9);glowAmt+=(want-glowAmt)*Math.min(1,dt*6);const g=glowAmt;const tm=performance.now()/1000;const flick=1+.06*Math.sin(tm*11)+.04*Math.sin(tm*5.3);
   light.intensity=g*3.2*flick;(disc.material as T.MeshBasicMaterial).opacity=g*.55;(halo.material as T.SpriteMaterial).opacity=g*.38*flick;halo.scale.setScalar(1.2+g*.9);
   (beam.material as T.MeshBasicMaterial).opacity=g*.07;beam.scale.set(1,.4+g*.8,1);beam.position.y=.2+.6*(.4+g*.8);
   pm.opacity=Math.min(1,g*1.4);(lidLining.material as T.MeshBasicMaterial).color.setRGB(.8+.2*Math.min(g,1),.5+.3*Math.min(g,1),.45+.25*Math.min(g,1));
   for(let i=0;i<N;i++){const p=pv[i];p.age+=dt*(g>.02?1:0);if(p.age>p.life){if(g>.3)reset(i);else p.age=p.life;continue;}pp[i*3]+=p.vx*dt;pp[i*3+1]+=p.vy*dt*g;pp[i*3+2]+=p.vz*dt;}
   pts.attributes.position.needsUpdate=true;
  }};
 return api;
}
