import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {box,cylinder,sphere,lantern,tomb,leaves,normalized,palette,mat,batchStatic} from './geometry';
import {createSymbolKit} from './symbols';
import {MascotController} from '../animation/mascot';
import {paylines,type SymbolId} from '../config/game';
import type {Outcome} from '../math/slot';
import {glow,sky,moon,silhouetteLayer,foliage,sparkTexture,glowTexture} from './atmosphere';

const INITIAL:SymbolId[][]=[['TOMB','CHEST','LANTERN'],['WILD','GHOST','SKULL'],['LANTERN','KEY','SCATTER'],['CHEST','POTION','MAUSOLEUM'],['POTION','SCATTER','GARGOYLE']];
const U=.85;            // camera / composition centre (x)
const CX=1.25,CY=4.45;  // reel window centre
const PITCH_X=2.1,PITCH_Y=1.76;
const easeBack=(q:number)=>{const c1=1.2,c3=c1+1;return 1+c3*Math.pow(q-1,3)+c1*Math.pow(q-1,2);};
const FILLER:SymbolId[]=['TOMB','LANTERN','CHEST','POTION','KEY','GHOST','MAUSOLEUM','BLASTER','SKULL','GARGOYLE','WILD','SCATTER','TOMB','LANTERN','CHEST','POTION','KEY','GHOST'];
const hash=(n:number)=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};

interface Cell{root:T.Group,sym:T.Mesh,frame:T.Mesh,dim:T.Mesh,halo:T.Sprite,id:SymbolId,x:number,y:number,landed:number,win:number}
interface Particle{s:T.Sprite,vx:number,vy:number,life:number,max:number,size:number,spin:number}

export async function startScene(canvas:HTMLCanvasElement,onProgress:(s:string)=>void){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.localClippingEnabled=true;
 const scene=new T.Scene();scene.background=new T.Color('#1a1040');scene.fog=new T.Fog('#35246a',34,64);
 const camera=new T.OrthographicCamera(-9.956,9.956,5.6,-5.6,.1,90);const camBase=new T.Vector3(U,8.4,28);camera.position.copy(camBase);camera.lookAt(U,4.8,0);camera.updateMatrixWorld();

 // ---- lighting: cold moonlit ambient + warm amber accents + violet rim
 const hemi=new T.HemisphereLight('#9d90ff','#4a3050',1.05);scene.add(hemi);
 const key=new T.DirectionalLight('#ffd7a0',2.7);key.position.set(-7,10,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:13,bottom:-6});key.shadow.normalBias=.025;key.shadow.bias=-.0002;scene.add(key);
 const rim=new T.DirectionalLight('#7b5cff',3.1);rim.position.set(8,10,-8);scene.add(rim);
 const fill=new T.DirectionalLight('#ff9b52',.9);fill.position.set(10,4,9);scene.add(fill);
 const flickers:{l:T.PointLight|T.Sprite,base:number,ph:number,amp:number}[]=[];
 const warm=(x:number,y:number,z:number,i=22,d=8,sprite=3.2,spriteOp=.55)=>{const l=new T.PointLight('#ff9a2e',i,d,2);l.position.set(x,y,z);scene.add(l);flickers.push({l,base:i,ph:x*3.1,amp:.14});const g=glow(scene,x,y,z+.3,'#ff8f1f',sprite,spriteOp);flickers.push({l:g,base:spriteOp,ph:x*3.1+1,amp:.18});return l;};

 // ---- models
 const modelFiles={skull:'Skull_Horned_Creature.glb',mascot:'scenery/Skull_Horned_Creature_Rigged.glb',mausoleum:'scenery/gothic_mausoleum.glb',gargoyle:'scenery/gargoyle_3d_model.glb'};
 const models:Record<string,T.Object3D>={};let mascotClips:T.AnimationClip[]=[];const loaded:unknown[]=[];
 await Promise.all(Object.entries(modelFiles).map(async([id,file])=>{onProgress(`Opening the crypt… ${id}`);const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/${file}`);models[id]=gltf.scene;if(id==='mascot')mascotClips=gltf.animations;let meshes=0,triangles=0;gltf.scene.traverse(o=>{if(o instanceof T.Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.castShadow=true;o.receiveShadow=true;}});loaded.push({id,file,meshes,triangles,clips:gltf.animations.map(a=>a.name)});}));
 onProgress('Polishing the symbols…');
 const kit=createSymbolKit(models);

 // ---- environment
 const environment=new T.Group();environment.name='Cemetery courtyard';scene.add(environment);
 const skyMat=sky(environment);
 moon(environment,6.3,7.2,-14,1.25);
 silhouetteLayer(environment,-17,'#3c2b82',11,2.2,1.5);
 silhouetteLayer(environment,-13,'#2a1c63',29,1.2,1.35,-18,16);
 glow(environment,-5.5,3,-12,'#7a52ff',9,.16);glow(environment,10,3.5,-12,'#6a4cff',8,.14);
 // ground: dark earth + cobbles that catch the warm light
 box(environment,48,.4,40,0,-.7,-8,mat('#2f2542'),.1);
 const tileMats=['#7a6788','#6a5878','#8d7596','#5c4c70'].map(c=>mat(c,.8));
 for(let r=0;r<8;r++)for(let c=0;c<17;c++){const tile=box(environment,1.28,.14,1.04,(c-8)*1.32+(r%2)*.45,-.42+(r%3)*.012,3-r*1.12,tileMats[(r*7+c)%4],.08);tile.rotation.y=Math.sin(r*4+c)*.055;}
 // back wall + graves behind the cabinet
 for(let i=0;i<25;i++){box(environment,.95,1.6,.6,(i-12)*1.04+U,.3,-9,palette.mortar);if(i%3===0){const t=tomb(environment,(i-12)*1.05+U,1,-11,1.1+(i%4)*.3);t.rotation.y=(i%3-1)*.2;}}
 for(let i=0;i<9;i++){const t=tomb(environment,-9+i*2.4,-.3,-4.5-(i%3)*1.3,.75+(i%4)*.22);t.rotation.y=(i%3-1)*.2;}
 // left: stone pillar with iron bracket + hanging lantern (warm key light on the mascot)
 for(let i=0;i<9;i++)box(environment,1.35,.82,1.5,-9.15+(i%2)*.05,i*.82-.1,-1.4,i%2?palette.stone:palette.edge,.08);box(environment,1.7,.3,1.8,-9.15,7.4,-1.4,palette.edge);
 box(environment,2.1,.12,.12,-8.2,6.9,-1.2,palette.bronze);const hang=new T.Group();hang.position.set(-7.4,6.15,-1.1);environment.add(hang);lantern(hang,0,0,0,1.25,false);glow(hang,0,0,.4,'#ffa030',4.6,.85);
 warm(-7.4,6.1,.6,26,12,0,0);
 // right: mausoleum with warm door, steps and a pedestal for the gargoyle
 const mausoleum=normalized(clone(models.mausoleum),5.4);mausoleum.traverse(o=>{if(o instanceof T.Mesh){const m=(o.material as T.MeshStandardMaterial).clone();m.color.multiplyScalar(.72).lerp(new T.Color('#b8a6e8'),.12);o.material=m;}});mausoleum.position.set(8.3,.1,-6.2);mausoleum.rotation.y=-.3;environment.add(mausoleum);
 for(let i=0;i<4;i++)box(environment,3.4-i*.2,.28,1.1,8.1,.05+i*.27,-2.3-i*.5,palette.stone,.05);
 warm(7.55,2.2,-3.6,30,9,3.6,.75);
 // right-front: gargoyle on pedestal
 for(let i=0;i<3;i++)box(environment,1.35,.55,1.25,8.9,.1+i*.55,1.4,i%2?palette.edge:palette.stone,.07);box(environment,1.65,.2,1.5,8.9,1.72,1.4,palette.edge);
 const gargoyle=normalized(clone(models.gargoyle),2.7);gargoyle.position.set(8.9,1.85,1.4);gargoyle.rotation.y=-.35;environment.add(gargoyle);
 // candles (flickering) near the gargoyle
 for(const [x,y,z,s] of [[7.45,.08,2.7,.8],[8.0,-.02,3.1,1.2],[8.75,-.02,2.8,.55],[-4.6,-.1,2.2,.55]] as const){cylinder(environment,.13,.14,s,x,y+s/2,z,palette.ivory,12);const f=sphere(environment,.075,x,y+s+.12,z,new T.MeshBasicMaterial({color:'#fff3ad'}));f.scale.set(.7,2.3,.7);warm(x,y+s+.18,z+.2,3,3.5,.9,.7);}
 // foliage frames: top-left overhang, bottom corners; rocks + clover
 foliage(environment,-9.4,10.2,-2,3,7,1.6,.8);foliage(environment,10.6,10.2,-4,5,5,1.3,.8);
 foliage(environment,-9.9,-.1,6,17,7,1.5,.9,['#14302a','#1f5336','#2f7a40','#10261f']);foliage(environment,10.4,.1,6,23,7,1.5,.9,['#14302a','#1f5336','#2f7a40','#10261f']);
 for(let i=0;i<14;i++){const x=Math.sin(i*7.9)*10+U,z=Math.cos(i*3.1)*2.4+.4;leaves(environment,x,-.1,z,4,i);const rock=new T.Mesh(new T.DodecahedronGeometry(.22+(i%3)*.15),palette.stone);rock.position.set(x,-.3,z);rock.scale.y=.6;environment.add(rock);}
 // a few faint cobweb of fireflies
 const FF=40;const ffPos=new Float32Array(FF*3);const ffGeo=new T.BufferGeometry();ffGeo.setAttribute('position',new T.BufferAttribute(ffPos,3));
 const ff=new T.Points(ffGeo,new T.PointsMaterial({map:glowTexture(),color:'#ffd27a',size:.34,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:false}));ff.frustumCulled=false;scene.add(ff);
 (ff.material as T.PointsMaterial).size=9;(ff.material as T.PointsMaterial).opacity=.8;

 // ---- machine / cabinet
 const machine=new T.Group();machine.name='Carved stone reel machine';scene.add(machine);
 const backMat=mat('#1a0f2b',.9);
 box(machine,11.95,6.4,1.25,CX,CY,-.45,palette.mortar,.16);box(machine,10.9,5.58,.4,CX,CY,.25,backMat,.16);
 for(const side of [-1,1]){const x=CX+side*5.75;for(let i=0;i<7;i++){const b=box(machine,.72,.78,1.3,x+(i%2)*side*.04,1.9+i*.8,.18,i%2?palette.stone:palette.edge,.09);b.rotation.z=side*Math.sin(i)*.018;}box(machine,1.2,.3,1.5,x,1.2,.22,palette.edge);box(machine,1.2,.34,1.5,x,7.3,.22,palette.edge);}
 for(let i=0;i<10;i++){const x=CX-5.25+i*1.17;box(machine,1.15,.52,1.4,x,7.14,.25,i%3?palette.stone:palette.edge);box(machine,1.15,.45,1.45,x,1.5,.25,palette.stone);}
 box(machine,11.2,.12,.3,CX,6.88,.98,palette.bronze,.05);box(machine,11.2,.12,.3,CX,1.9,.98,palette.bronze,.05);
 for(let i=1;i<5;i++){box(machine,.1,5.3,.34,CX-5.25+i*2.1,4.47,.7,palette.bronze,.03);sphere(machine,.075,CX-5.25+i*2.1,7,.93,palette.gold);}
 for(const [x,y,s] of [[-4.2,7.35,1],[6.8,7.35,2],[-4.55,5.9,3],[6.95,2.1,4]] as const)leaves(machine,x,y,1,14,s);
 // soft inner shadows so the window feels recessed
 const shadeCanvas=document.createElement('canvas');shadeCanvas.width=8;shadeCanvas.height=128;{const g=shadeCanvas.getContext('2d')!;const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(5,0,15,.55)');gr.addColorStop(.12,'rgba(5,0,15,.14)');gr.addColorStop(.5,'rgba(5,0,15,0)');gr.addColorStop(.88,'rgba(5,0,15,.1)');gr.addColorStop(1,'rgba(5,0,15,.4)');g.fillStyle=gr;g.fillRect(0,0,8,128);}
 const shade=new T.Mesh(new T.PlaneGeometry(10.5,5.3),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadeCanvas),transparent:true,depthWrite:false,toneMapped:false}));shade.position.set(CX,CY,1.78);shade.renderOrder=5;scene.add(shade);
 const rimGlow=glow(scene,CX,CY,1.2,'#ff9a3a',14,.1);rimGlow.scale.set(14,8,1);

 // ---- cells
 const cells:Cell[][]=[];const clipping=[new T.Plane(new T.Vector3(0,-1,0),CY+2.62),new T.Plane(new T.Vector3(0,1,0),-(CY-2.62))];
 const frameMats={gold:new T.MeshBasicMaterial({map:kit.frameGold,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,opacity:0}),purple:new T.MeshBasicMaterial({map:kit.framePurple,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,opacity:0})};
 for(let c=0;c<5;c++){cells[c]=[];for(let row=0;row<3;row++){
  const x=CX+(c-2)*PITCH_X,y=CY+(1-row)*PITCH_Y;const root=new T.Group();root.position.set(x,y,.85);root.name=`Reel ${c+1} row ${row+1}`;machine.add(root);
  box(root,2.02,1.69,.22,0,0,0,mat('#241338'),.13);
  const tile=new T.Mesh(new T.PlaneGeometry(2.0,1.68),new T.MeshBasicMaterial({map:kit.tile,transparent:true,toneMapped:false}));tile.position.z=.125;root.add(tile);
  const halo=glow(root,0,0,.3,'#ffffff',3.2,0);
  const sym=new T.Mesh(kit.geometry,kit.material(INITIAL[c][row]));sym.position.z=.47;root.add(sym);
  const dim=new T.Mesh(new T.PlaneGeometry(2.0,1.68),new T.MeshBasicMaterial({color:'#080212',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));dim.position.z=.6;root.add(dim);
  const frame=new T.Mesh(new T.PlaneGeometry(2.06,1.75),frameMats.gold.clone());frame.position.z=.66;frame.visible=false;root.add(frame);
  cells[c].push({root,sym,frame,dim,halo,id:INITIAL[c][row],x,y,landed:-9,win:0});}}
 const setSymbol=(cell:Cell,id:SymbolId)=>{cell.id=id;cell.sym.material=kit.material(id);cell.sym.scale.set(1,1,1);};

 // ---- mascot
 const mascot=normalized(models.mascot,5.05);mascot.name='Original animated Skull mascot';const mascotBase=new T.Vector3(-6.95,1.05,2.7);mascot.position.copy(mascotBase);mascot.rotation.y=.34;scene.add(mascot);
 const controller=new MascotController(models.mascot,mascotClips);
 box(environment,4.6,.55,3.2,-6.85,.72,2.1,palette.stone,.15);
 const blob=new T.Mesh(new T.CircleGeometry(1.6,24),new T.MeshBasicMaterial({color:'#05010c',transparent:true,opacity:.45,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.position.set(-6.8,1.03,2.6);blob.scale.set(1.2,.6,1);scene.add(blob);
 warm(-5.6,3.6,5.2,14,9,0,0);

 // ---- stone console
 const controls=new T.Group();controls.name='Stone console';scene.add(controls);
 box(controls,18.9,.6,2.9,U,-.4,2.1,palette.mortar,.2);box(controls,18.4,1.2,1.3,U,.15,3.45,palette.stone,.22);box(controls,17.9,.95,.28,U,.2,4.12,mat('#2a1c38',.7),.24);
 for(let i=0;i<14;i++)box(controls,1.31,.26,1.38,U-8.55+i*1.317,.88,3.6,i%2?palette.stone:palette.edge,.06);
 box(controls,17.95,.06,.1,U,.62,4.2,mat('#ff9a3a',.4,.2),.02);
 const buttonAnchors:Record<string,T.Vector3>={spin:new T.Vector3(U,.52,4.65),info:new T.Vector3(U-8.2,.2,4.65),balance:new T.Vector3(U-6.5,.2,4.65),'bet-down':new T.Vector3(U-4.75,.2,4.65),bet:new T.Vector3(U-3.55,.2,4.65),'bet-up':new T.Vector3(U-2.35,.2,4.65),win:new T.Vector3(U+4.7,.2,4.65),menu:new T.Vector3(U+8.2,.2,4.65)};
 batchStatic(environment);batchStatic(machine);batchStatic(controls);controls.position.y=.35;
 function positionOverlays(){for(const[id,v]of Object.entries(buttonAnchors)){const el=document.querySelector<HTMLElement>(`[data-anchor="${id}"]`);if(el){const p=v.clone().add(controls.position).project(camera);el.style.left=`${(p.x+1)*50}%`;el.style.top=`${(1-p.y)*50}%`;}}}

 // ---- reels (scrolling strips), win path, particles
 const strips=Array.from({length:5},(_,c)=>{const g=new T.Group();g.visible=false;scene.add(g);const meshes=Array.from({length:5},()=>{const m=new T.Mesh(kit.geometry,kit.clippedMaterial('TOMB',clipping));m.position.x=CX+(c-2)*PITCH_X;m.position.z=1.32;g.add(m);return m;});return {g,meshes,pos:0,N:0,done:true,ids:[] as SymbolId[]};});
 const path=new T.Group();scene.add(path);let lines:{core:T.Mesh,halo:T.Mesh,count:number}[]=[];
 const particles:Particle[]=[];const sparkMat=(color:string)=>new T.SpriteMaterial({map:sparkTexture(),color,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 for(let i=0;i<140;i++){const s=new T.Sprite(sparkMat('#ffd36a'));s.visible=false;s.renderOrder=20;scene.add(s);particles.push({s,vx:0,vy:0,life:0,max:1,size:.3,spin:0});}
 let pCursor=0;
 function emit(x:number,y:number,color:string,n:number,speed=2.4,size=.34,up=0){for(let i=0;i<n;i++){const p=particles[pCursor++%particles.length];const a=Math.random()*Math.PI*2,v=speed*(.35+Math.random()*.9);p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v+up;p.life=p.max=.5+Math.random()*.55;p.size=size*(.5+Math.random()*.9);p.spin=(Math.random()-.5)*6;(p.s.material as T.SpriteMaterial).color.set(color);p.s.position.set(x+(Math.random()-.5)*.4,y+(Math.random()-.5)*.4,2.3);p.s.visible=true;}}

 // ---- state
 let width=0,height=0;const clock=new T.Clock();let disposed=false,frame=0,elapsed=0;
 let spinning:{start:number,outcome:Outcome,resolve:()=>void,landed:boolean[],finish?:number}|undefined;
 let winState:{cells:Set<Cell>,scatter:Set<Cell>,t0:number}|undefined;let boost=0,boostTarget=0,shake=0,sparkTimer=0,level=0,bigUntil=0;
 const WILDISH=(id:SymbolId)=>id==='WILD'||id==='SCATTER';

 function clearWin(){winState=undefined;for(const col of cells)for(const cell of col){cell.win=0;cell.sym.scale.set(1,1,1);(cell.dim.material as T.MeshBasicMaterial).opacity=0;}path.clear();lines=[];level=0;boostTarget=0;}
 function present(outcome:Outcome){
  const winCells=new Set<Cell>(),scatterCells=new Set<Cell>();path.clear();lines=[];
  for(const w of outcome.evaluation.lineWins){const pts:T.Vector3[]=[];for(let c=0;c<w.count;c++){const cell=cells[c][paylines[w.line-1][c]];winCells.add(cell);pts.push(new T.Vector3(cell.x,cell.y,2.0));}
   if(pts.length>1){const curve=new T.CatmullRomCurve3(pts,false,'catmullrom',.1);const geo=new T.TubeGeometry(curve,48,.05,6,false),geo2=new T.TubeGeometry(curve,48,.15,6,false);
    const core=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#fff0b0',toneMapped:false,transparent:true}));const halo=new T.Mesh(geo2,new T.MeshBasicMaterial({color:'#ffa020',toneMapped:false,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false}));core.renderOrder=12;halo.renderOrder=11;path.add(halo,core);lines.push({core,halo,count:geo.index!.count});}}
  if(outcome.evaluation.scatterAmount>0||outcome.evaluation.scatterCount>=3)for(const col of cells)for(const cell of col)if(cell.id==='SCATTER'){scatterCells.add(cell);winCells.add(cell);}
  const any=winCells.size>0;
  for(const col of cells)for(const cell of col){const isWin=winCells.has(cell);cell.win=isWin?1:0;(cell.dim.material as T.MeshBasicMaterial).opacity=any&&!isWin?.55:0;
   if(isWin){emit(cell.x,cell.y,scatterCells.has(cell)?'#e08cff':'#ffd36a',14,3.2,.4);}}
  winState={cells:winCells,scatter:scatterCells,t0:elapsed};
 }

 function tick(){if(disposed)return;frame=requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;controller.update(dt);
  const w=canvas.clientWidth,h=canvas.clientHeight;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);positionOverlays();}
  skyMat.uniforms.uTime.value=elapsed;
  boost+=(boostTarget-boost)*Math.min(1,dt*3);
  // idle polish: flickering lights, breathing mascot, gently swaying lantern, drifting fireflies
  for(const f of flickers){const k=1+f.amp*(Math.sin(elapsed*9+f.ph)*.5+Math.sin(elapsed*5.3+f.ph*2)*.35+Math.sin(elapsed*17+f.ph)*.15);if(f.l instanceof T.PointLight)f.l.intensity=f.base*k*(1+boost*.4);else (f.l.material as T.SpriteMaterial).opacity=f.base*k;}
  hang.rotation.z=Math.sin(elapsed*1.3)*.035;mascot.position.y=mascotBase.y+Math.sin(elapsed*1.8)*.025;mascot.scale.y=1+Math.sin(elapsed*1.8)*.006;
  for(let i=0;i<FF;i++){const t=elapsed*.15+i*1.7;ffPos[i*3]=Math.sin(t*1.3+i)*9+U;ffPos[i*3+1]=1.6+((i*37)%34)/10+Math.sin(t*2.1+i*2)*.5;ffPos[i*3+2]=-6+Math.cos(t+i)*4;}ffGeo.attributes.position.needsUpdate=true;
  hemi.intensity=1.05+boost*.35;key.intensity=2.7+boost*.8;rimGlow.material.opacity=.1+boost*.22+Math.sin(elapsed*2)*.015;
  // reel animation
  if(spinning){const a=spinning,t=elapsed-a.start;let allDone=true;
   for(let c=0;c<5;c++){const st=strips[c];if(st.done)continue;allDone=false;const tt=t-c*.07,V=19;let pos:number,speed=V;
    if(tt<=0)pos=0,speed=0;else{const t0=(st.N-2.2)/V+.09;if(tt<.18){pos=V*tt*tt/(2*.18);speed=V*tt/.18;}else if(tt<t0){pos=V*(tt-.09);}else{const q=Math.min((tt-t0)/.5,1);pos=st.N-2.2+2.2*easeBack(q);speed=q<1?V*(1-q):0;if(q>=1){pos=st.N;}}}
    st.pos=pos;const base=Math.floor(pos),frac=pos-base;
    for(let i=0;i<5;i++){const r=i-1,n=base-r;const id=(n<=st.N&&n>st.N-3)?a.outcome.grid[c][st.N-n]:FILLER[Math.floor(hash(n*13.7+c*5.3+a.outcome.stops[c])*FILLER.length)];const m=st.meshes[i];m.material=kit.clippedMaterial(id,clipping);m.position.y=CY+(1-(r+frac))*PITCH_Y;m.scale.y=1+Math.min(.2,speed/120);m.scale.x=1-Math.min(.06,speed/400);}
    if(tt>=(st.N-2.2)/V+.09+.5){st.done=true;st.g.visible=false;a.landed[c]=true;for(let r=0;r<3;r++){const cell=cells[c][r];setSymbol(cell,a.outcome.grid[c][r]);cell.sym.visible=true;cell.landed=elapsed;if(WILDISH(cell.id))emit(cell.x,cell.y,cell.id==='WILD'?'#ffc844':'#d58cff',16,3.4,.45);}}}
   if(allDone&&a.finish===undefined)a.finish=elapsed+.32;
   if(a.finish!==undefined&&elapsed>=a.finish){const done=a;spinning=undefined;controller.setState(done.outcome.evaluation.scatterCount>=3?'anticipation':done.outcome.evaluation.totalMultiplier>0?'win':'idle');present(done.outcome);done.resolve();}}
  // settled cells: landing squash, special-symbol idle FX, win pulses
  for(let c=0;c<5;c++)for(const cell of cells[c]){const k=(elapsed-cell.landed)/.34;let sx=1,sy=1;if(k>=0&&k<1){const s=Math.sin(k*Math.PI);sy=1-.1*s;sx=1+.06*s;}
   const special=WILDISH(cell.id),halo=cell.halo.material as T.SpriteMaterial;
   if(special&&!spinning){const p=Math.sin(elapsed*3+c*1.7);sx*=1+.035*p;sy*=1+.035*p;halo.color.set(cell.id==='WILD'?'#ffb52e':'#b54bff');halo.opacity=.42+.2*p;cell.frame.visible=true;(cell.frame.material as T.MeshBasicMaterial).map=cell.id==='WILD'?kit.frameGold:kit.framePurple;(cell.frame.material as T.MeshBasicMaterial).opacity=.5+.3*p;}
   else if(cell.win&&!spinning){const p=Math.sin((elapsed-(winState?.t0??0))*6);sx*=1.05+.045*p;sy*=1.05+.045*p;halo.color.set('#ffb52e');halo.opacity=.55+.25*p;cell.frame.visible=true;(cell.frame.material as T.MeshBasicMaterial).map=kit.frameGold;(cell.frame.material as T.MeshBasicMaterial).opacity=.75+.25*p;}
   else{halo.opacity=0;cell.frame.visible=false;}
   cell.sym.scale.set(sx,sy,1);cell.sym.position.z=cell.win?.55:.47;}
  // win line cycling with draw-in
  if(winState&&lines.length&&!spinning){const ts=elapsed-winState.t0,per=1.1,show=Math.floor(ts/per)%lines.length,p=Math.min(1,(ts%per)/.45);
   lines.forEach((l,i)=>{const on=lines.length===1||i===show;l.core.visible=l.halo.visible=on;if(on){const n=Math.floor(l.count*p/3)*3;l.core.geometry.setDrawRange(0,n);l.halo.geometry.setDrawRange(0,n);(l.halo.material as T.MeshBasicMaterial).opacity=.28+.12*Math.sin(elapsed*8);}});}
  // continuous sparks while winning; confetti-style shower on big wins
  if(winState&&!spinning){sparkTimer-=dt;if(sparkTimer<=0){sparkTimer=level>=2?.04:.12;const arr=[...winState.cells];const cell=arr[Math.floor(Math.random()*arr.length)];if(cell)emit(cell.x,cell.y,winState.scatter.has(cell)?'#e08cff':'#ffd36a',2,1.6,.3,.8);if(level>=2&&elapsed<bigUntil)emit(CX+(Math.random()-.5)*10,CY+3.1,Math.random()<.5?'#ffd36a':'#ff9ae8',2,1.2,.45,-1.4);}}
  for(const p of particles){if(!p.s.visible)continue;p.life-=dt;if(p.life<=0){p.s.visible=false;continue;}p.s.position.x+=p.vx*dt;p.s.position.y+=p.vy*dt;p.vy-=2.2*dt;const k=p.life/p.max;p.s.scale.setScalar(p.size*(.4+k));(p.s.material as T.SpriteMaterial).opacity=Math.min(1,k*1.6);(p.s.material as T.SpriteMaterial).rotation=p.spin*elapsed;}
  // tiny camera shake on big wins
  shake*=Math.pow(.02,dt);camera.position.set(camBase.x+(Math.random()-.5)*shake,camBase.y+(Math.random()-.5)*shake,camBase.z);
  renderer.render(scene,camera);
 }
 tick();
 return {scene,camera,renderer,controller,loaded,symbolSheet:kit.canvases,
  spin(outcome:Outcome){if(spinning)throw new Error('Reels already spinning');clearWin();
   for(const col of cells)for(const cell of col){cell.sym.visible=false;cell.frame.visible=false;(cell.halo.material as T.SpriteMaterial).opacity=0;}
   strips.forEach((st,c)=>{st.N=15+c*4;st.done=false;st.pos=0;st.g.visible=true;});controller.setState('attention');
   return new Promise<void>(resolve=>{spinning={start:elapsed,outcome,resolve,landed:[false,false,false,false,false]};});},
  /** 0 = nothing, 1 = win, 2 = big win, 3 = mega win */
  celebrate(l:number){level=l;boostTarget=l>=3?1.4:l>=2?1:l>=1?.35:0;if(l>=2){shake=.22;bigUntil=elapsed+3.2;emit(CX,CY+2.4,'#ffd36a',18,6.5,.28);emit(CX,CY+2.4,'#ff9ae8',12,5,.24);}if(l>=1)emit(CX,CY-2.7,'#ffd36a',10,2.5,.4);},
  hover(_id?:string,_pressed?:boolean){},unhover(){},
  inspect(){const b=new T.Box3().setFromObject(mascot),min=b.min.clone().project(camera),max=b.max.clone().project(camera);return {loaded,animation:controller.inspect(),mascotBounds:{min:b.min.toArray(),max:b.max.toArray(),screen:{left:(min.x+1)/2,right:(max.x+1)/2,bottom:(1-min.y)/2,top:(1-max.y)/2}},grid:cells.map(c=>c.map(x=>x.id)),spinning:!!spinning,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,sceneObjects:scene.getObjectsByProperty('isMesh',true).length,elapsed};},
  dispose(){disposed=true;cancelAnimationFrame(frame);renderer.dispose();}
 };
}
