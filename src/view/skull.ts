import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {MascotController,type SkullState} from '../animation/mascot';
import {SKULL} from '../layout';

/** The real rigged Skull GLB in a transparent WebGL canvas, lit to match the 2D scene (warm lantern key, violet moon rim). */
function normalize(obj:T.Object3D,height:number){const w=new T.Group();w.add(obj);obj.updateMatrixWorld(true);const b=new T.Box3().setFromObject(obj),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());const s=height/size.y;obj.scale.multiplyScalar(s);obj.position.sub(new T.Vector3(c.x,b.min.y,c.z).multiplyScalar(s));return w;}
export async function createSkull(canvas:HTMLCanvasElement,glbUrl:string,renderScale:()=>number){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,premultipliedAlpha:true});renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.55;
 const {w,h,height,foot}=SKULL;const cam=new T.OrthographicCamera(-w/2,w/2,h/2,-h/2,-2000,2000);cam.position.set(0,0,1000);
 scene.add(new T.HemisphereLight('#9a8cff','#4a3050',.9));
 const key=new T.DirectionalLight('#ffb36b',3.1);key.position.set(-500,600,700);scene.add(key);       // lantern from the upper left
 const rim=new T.DirectionalLight('#7b5cff',3.2);rim.position.set(500,300,-500);scene.add(rim);      // moonlit rim
 const fill=new T.DirectionalLight('#ff8f4a',.8);fill.position.set(600,-200,600);scene.add(fill);
 const gltf=await new GLTFLoader().loadAsync(glbUrl);gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.frustumCulled=false;}});
 const root=normalize(gltf.scene,height);const base=new T.Vector3(0,-h/2+foot,0);root.position.copy(base);root.rotation.y=.38;scene.add(root);
 const controller=new MascotController(gltf.scene,gltf.animations);
 // soft contact shadow (camera-facing, behind the feet)
 const sc=document.createElement('canvas');sc.width=256;sc.height=64;{const g=sc.getContext('2d')!;const r=g.createRadialGradient(128,32,4,128,32,128);r.addColorStop(0,'rgba(8,2,20,.7)');r.addColorStop(1,'rgba(8,2,20,0)');g.save();g.scale(1,.26);g.fillStyle=r;g.fillRect(0,0,256,246);g.restore();}
 const shadow=new T.Mesh(new T.PlaneGeometry(430,110),new T.MeshBasicMaterial({map:new T.CanvasTexture(sc),transparent:true,depthWrite:false}));shadow.position.set(base.x,base.y+4,-300);scene.add(shadow);
 let hop=0,elapsed=0,raf=0,last=performance.now(),running=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function resize(){const s=renderScale();renderer.setPixelRatio(1);renderer.setSize(w*s,h*s,false);}
 resize();
 function tick(now:number){if(!running)return;raf=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;controller.update(dt);
  if(hop>0){hop=Math.max(0,hop-dt);const k=1-hop/1.2;root.position.y=base.y+Math.abs(Math.sin(k*Math.PI*3))*(reduced?0:38)*(1-k*.4);}else root.position.y=base.y+Math.sin(elapsed*1.8)*(reduced?0:3);
  root.scale.y=1+Math.sin(elapsed*1.8)*(reduced?0:.006);renderer.render(scene,cam);}
 raf=requestAnimationFrame(tick);
 return {controller,resize,set(state:SkullState){controller.setState(state);if(state==='bigwin')hop=1.2;},inspect:()=>controller.inspect(),dispose(){running=false;cancelAnimationFrame(raf);renderer.dispose();}};
}
