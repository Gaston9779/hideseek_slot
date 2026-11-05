import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {createChest} from './chest';
const q=new URLSearchParams(location.search);const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const canvas=$('#c') as HTMLCanvasElement;const r=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(Math.min(devicePixelRatio,2));r.shadowMap.enabled=true;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
const sc=new T.Scene();sc.background=new T.Color('#1a1030');const pm=new T.PMREMGenerator(r);sc.environment=pm.fromScene(new RoomEnvironment(),.04).texture;sc.environmentIntensity=.5;
sc.add(new T.HemisphereLight('#9a8cff','#4a3050',.8));const key=new T.DirectionalLight('#ffd7a0',2.6);key.position.set(-2.5,4,3.5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-2,right:2,top:2,bottom:-2});key.shadow.bias=-.0003;sc.add(key);
const rim=new T.DirectionalLight('#7b5cff',2.4);rim.position.set(3,2.5,-3);sc.add(rim);
const floor=new T.Mesh(new T.CircleGeometry(3,48),new T.MeshStandardMaterial({color:'#3a2a52',roughness:.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;sc.add(floor);
const cam=new T.PerspectiveCamera(32,1,.05,50);const az=+(q.get('az')??25)*Math.PI/180,el=+(q.get('el')??22)*Math.PI/180,dist=+(q.get('d')??3.4);cam.position.set(Math.sin(az)*Math.cos(el)*dist,.5+Math.sin(el)*dist,Math.cos(az)*Math.cos(el)*dist);
const ctl=new OrbitControls(cam,canvas);ctl.target.set(0,.5,0);ctl.enableDamping=true;ctl.minDistance=1.5;ctl.maxDistance=7;ctl.maxPolarAngle=Math.PI*.52;ctl.update();
function resize(){r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}resize();addEventListener('resize',resize);
const TEST_VALUE='25.00';   // stands in for the already-decided prize; supplied from outside the chest
let chest:Awaited<ReturnType<typeof createChest>>|undefined;
if(q.get('src')==='original'){const g=await new GLTFLoader().loadAsync('/bonus-chest/chest-original.glb');g.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});sc.add(g.scene);}
else{chest=await createChest('/bonus-chest/bonus-chest-animated.glb');sc.add(chest.object);}
const prize=$('#prize'),stateEl=$('#state'),angleEl=$('#angle');const btn=(id:string)=>$(id) as HTMLButtonElement;
async function open(){if(!chest)return;prize.classList.remove('on');await chest.open();if(chest.state!=='open')return;prize.textContent=`TEST VALUE ${TEST_VALUE}`;prize.classList.add('on');}
btn('#open').onclick=()=>void open();btn('#close').onclick=async()=>{prize.classList.remove('on');await chest?.close();};btn('#reset').onclick=()=>{prize.classList.remove('on');chest?.reset();};
(window as any).__chest=chest;
let last=performance.now();
function loop(now:number){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.05);last=now;chest?.update(dt);ctl.update();stateEl.textContent=chest?chest.state:'original';angleEl.textContent=chest?chest.angleDeg.toFixed(0):'-';r.render(sc,cam);}
requestAnimationFrame(loop);(window as any).done=true;
