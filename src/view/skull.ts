import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MascotController,type SkullEvent,type SkullState} from '../animation/mascot';
import {SKULL} from '../layout';
import {mobileDebug} from '../mobileDebug';import {createEnvironment,createGlRenderer} from './quality';

/** The real rigged Skull GLB in a transparent WebGL canvas, lit to match the 2D scene (warm lantern key, violet moon rim). */
function normalize(obj:T.Object3D,height:number){const w=new T.Group();w.add(obj);obj.updateMatrixWorld(true);const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());const s=height/size.y;obj.scale.multiplyScalar(s);obj.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(s));return w;}
export async function createSkull(canvas:HTMLCanvasElement,glbUrl:string,renderScale:()=>number){
 const renderer=createGlRenderer('skull',canvas);
  let contextLost=false;const onLost=(e:Event)=>{e.preventDefault();contextLost=true;mobileDebug.event('webgl:skull-lost');};const onRestored=()=>{contextLost=false;mobileDebug.event('webgl:skull-restored');resize();};canvas.addEventListener('webglcontextlost',onLost,false);canvas.addEventListener('webglcontextrestored',onRestored,false);
 const scene=new T.Scene();const env=createEnvironment(renderer);scene.environment=env;scene.environmentIntensity=.55;
 const {w,h,height,foot}=SKULL;const cam=new T.OrthographicCamera(-w/2,w/2,h/2,-h/2,-2000,2000);cam.position.set(0,0,1000);
 scene.add(new T.HemisphereLight('#9a8cff','#4a3050',.9));
 const key=new T.DirectionalLight('#ffb36b',3.1);key.position.set(-500,600,700);scene.add(key);       // lantern from the upper left
 const rim=new T.DirectionalLight('#7b5cff',3.2);rim.position.set(500,300,-500);scene.add(rim);      // moonlit rim
 const fill=new T.DirectionalLight('#ff8f4a',.8);fill.position.set(600,-200,600);scene.add(fill);
 // A static public URL can be served as a partial response after a CDN deploy. Validate the
 // GLB envelope before passing it to GLTFLoader so an invalid response has a useful error and
 // a bounded failure instead of an unhandled JSON.parse rejection.
 const controllerAbort=new AbortController();const timeout=window.setTimeout(()=>controllerAbort.abort(),15_000);
 let bytes:ArrayBuffer;
 try{mobileDebug.asset('Skull_Horned_Creature_Rigged.glb','start');const response=await fetch(glbUrl,{signal:controllerAbort.signal});if(!response.ok)throw new Error(`Skull model request failed: HTTP ${response.status}`);bytes=await response.arrayBuffer();mobileDebug.asset('Skull_Horned_Creature_Rigged.glb','success',{bytes:bytes.byteLength});}
 catch(error){mobileDebug.asset('Skull_Horned_Creature_Rigged.glb','failure');throw new Error(`Skull model unavailable (${glbUrl}): ${error instanceof Error?error.message:String(error)}`);}
 finally{clearTimeout(timeout);}
 if(bytes.byteLength<20)throw new Error(`Skull model is truncated (${bytes.byteLength} bytes)`);
 const header=new DataView(bytes);if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==bytes.byteLength)throw new Error(`Skull model has an invalid GLB header (${bytes.byteLength} bytes)`);
 const gltf=await new Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>((resolve,reject)=>new GLTFLoader().parse(bytes,glbUrl.slice(0,glbUrl.lastIndexOf('/')+1),resolve,reject));gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.frustumCulled=false;}});
 const root=normalize(gltf.scene,height);const base=new T.Vector3(0,-h/2+foot,0);root.position.copy(base);root.rotation.y=.38;scene.add(root);
 // no root motion: strip position tracks so clips can never move the feet off the anchor
 for(const c of gltf.animations)c.tracks=c.tracks.filter(t=>!t.name.endsWith('.position'));
 const controller=new MascotController(gltf.scene,gltf.animations);
 // soft contact shadow (camera-facing, behind the feet)
 const sc=document.createElement('canvas');sc.width=256;sc.height=64;{const g=sc.getContext('2d')!;const r=g.createRadialGradient(128,32,4,128,32,128);r.addColorStop(0,'rgba(8,2,20,.7)');r.addColorStop(1,'rgba(8,2,20,0)');g.save();g.scale(1,.26);g.fillStyle=r;g.fillRect(0,0,256,246);g.restore();}
 const shadow=new T.Mesh(new T.PlaneGeometry(height*1.0,height*.26),new T.MeshBasicMaterial({map:new T.CanvasTexture(sc),transparent:true,depthWrite:false}));shadow.position.set(base.x,base.y+4,-300);scene.add(shadow);
 const pulseColor=new T.Color('#ff8f4a');let pulseK=0;const fillBase=new T.Color('#ff8f4a');
 let hop=0,elapsed=0,raf=0,last=performance.now(),running=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function resize(){if(contextLost)return;const s=renderScale(),rw=Math.max(1,Math.round(w*s)),rh=Math.max(1,Math.round(h*s));renderer.setPixelRatio(1);renderer.setSize(rw,rh,false);mobileDebug.canvas('skull',rw,rh);}
 resize();
 function tick(now:number){if(!running)return;raf=requestAnimationFrame(tick);if(document.hidden){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;controller.update(dt);
  // dynamic light: the lantern key flickers in sync with the 2D lamps (same frequencies as the atmosphere layer); result-driven colour pulse on the fill light
  const fl=reduced?0:.06*Math.sin(elapsed*9)*Math.sin(elapsed*3.1)+.03*Math.sin(elapsed*17);key.intensity=3.1*(1+fl);pulseK=Math.max(0,pulseK-dt*1.1);fill.color.copy(fillBase).lerp(pulseColor,Math.min(1,pulseK));fill.intensity=.8+pulseK*2.4;rim.intensity=3.2+pulseK*1.2;
  if(hop>0){hop=Math.max(0,hop-dt);const k=1-hop/1.2;root.position.y=base.y+Math.abs(Math.sin(k*Math.PI*3))*(reduced?0:height*.04)*(1-k*.4);}else root.position.y=base.y+Math.sin(elapsed*1.8)*(reduced?0:height*.004);
  root.scale.y=1+Math.sin(elapsed*1.8)*(reduced?0:.006);if(!contextLost)renderer.render(scene,cam);}
 function pulse(e:SkullEvent){if(reduced)return;const m:Partial<Record<SkullEvent,[string,number]>>={WIN:['#ffd36a',.7],BIG_WIN:['#ffe08a',1.3],BONUS_TRIGGER:['#c06cff',1.1],BEST_CHEST_PICK:['#ffe08a',1.3]};const v=m[e];if(!v)return;pulseColor.set(v[0]);pulseK=v[1];}
 raf=requestAnimationFrame(tick);
 return {controller,resize,template:()=>({scene:gltf.scene,animations:gltf.animations}),set(state:SkullState){controller.setState(state);if(state==='bigwin')hop=1.2;},dispatch(e:SkullEvent,o?:{freeSpin?:boolean}){controller.dispatch(e,o);if(e==='BIG_WIN'||e==='BEST_CHEST_PICK')hop=1.2;pulse(e);},inspect:()=>controller.inspect(),dispose(){running=false;cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);env.dispose();shadow.geometry.dispose();(shadow.material as T.Material).dispose();renderer.dispose();renderer.forceContextLoss();}};
}
