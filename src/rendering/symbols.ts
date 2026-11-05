import * as T from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {SymbolId} from '../config/game';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {normalized} from './geometry';

/**
 * Premium symbol kit: every symbol is painted once into a 256px canvas with a consistent
 * dark outline / rim-light language. WILD, SCATTER and GARGOYLE use a one-off offscreen render
 * of the real 3D models so the artwork stays faithful to the supplied assets.
 */
const S=256,OUT='#2a1226',FONT='"Arial Rounded MT Bold","Trebuchet MS",Georgia,sans-serif';
type Ctx=CanvasRenderingContext2D;
const lin=(c:Ctx,x0:number,y0:number,x1:number,y1:number,stops:[number,string][])=>{const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,col])=>g.addColorStop(o,col));return g;};
const rad=(c:Ctx,x:number,y:number,r0:number,r1:number,stops:[number,string][],fx=x,fy=y)=>{const g=c.createRadialGradient(fx,fy,r0,x,y,r1);stops.forEach(([o,col])=>g.addColorStop(o,col));return g;};
function rr(c:Ctx,x:number,y:number,w:number,h:number,r:number){c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
/** Outline pass first (thick), fill after: unions overlapping sub-shapes without inner seams. */
function fat(c:Ctx,build:()=>void,fill:string|CanvasGradient,lw=14,stroke=OUT){c.save();c.lineJoin='round';c.lineCap='round';c.beginPath();build();c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();c.fillStyle=fill;c.fill();c.restore();}
function shape(c:Ctx,build:()=>void,fill:string|CanvasGradient,lw=8,stroke=OUT){c.save();c.lineJoin='round';c.beginPath();build();c.fillStyle=fill;c.fill();if(lw){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke();}c.restore();}
function glowBehind(c:Ctx,color:string,r=112,a=.55,cy=128){c.save();const g=c.createRadialGradient(128,cy,6,128,cy,r);g.addColorStop(0,color+Math.round(a*255).toString(16).padStart(2,'0'));g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,S,S);c.restore();}
function groundShadow(c:Ctx,w=88,y=226,a=.38){c.save();c.fillStyle=`rgba(8,2,18,${a})`;c.beginPath();c.ellipse(128,y,w,11,0,0,Math.PI*2);c.fill();c.restore();}
const circ=(c:Ctx,x:number,y:number,r:number)=>{c.moveTo(x+r,y);c.arc(x,y,r,0,Math.PI*2);};
const ell=(c:Ctx,x:number,y:number,rx:number,ry:number,rot=0)=>{c.moveTo(x+rx,y);c.ellipse(x,y,rx,ry,rot,0,Math.PI*2);};
function shine(c:Ctx,x:number,y:number,rx:number,ry:number,rot=0,a=.8){c.save();c.fillStyle=`rgba(255,255,255,${a})`;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,Math.PI*2);c.fill();c.restore();}
function skullMark(c:Ctx,cx:number,cy:number,s:number,fill:[string,string]|string,hole:string){c.save();c.translate(cx,cy);c.scale(s,s);fat(c,()=>{circ(c,0,-6,46);rr(c,-26,22,52,34,10);},typeof fill==='string'?fill:lin(c,0,-50,0,56,[[0,fill[0]],[1,fill[1]]]),10,hole);c.fillStyle=hole;for(const x of [-19,19]){c.beginPath();c.ellipse(x,-4,13,16,0,0,Math.PI*2);c.fill();}c.beginPath();c.moveTo(0,10);c.lineTo(-7,24);c.lineTo(7,24);c.closePath();c.fill();c.strokeStyle=hole;c.lineWidth=5;c.lineCap='round';for(const x of [-13,0,13]){c.beginPath();c.moveTo(x,38);c.lineTo(x,54);c.stroke();}c.restore();}
function label(c:Ctx,text:string,y:number,size:number,fill:[string,string],stroke=OUT){c.save();c.font=`900 ${size}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=size*.2;c.strokeStyle=stroke;c.strokeText(text,128,y+3);c.fillStyle=lin(c,0,y-size/2,0,y+size/2,[[0,fill[0]],[1,fill[1]]]);c.fillText(text,128,y);c.restore();}

const painters:Partial<Record<SymbolId,(c:Ctx)=>void>>={
 TOMB(c){groundShadow(c);glowBehind(c,'#9a8cff',100,.25);
  shape(c,()=>rr(c,56,194,144,32,12),lin(c,0,194,0,226,[[0,'#a29cbc'],[1,'#5d5679']]),7);
  shape(c,()=>{c.moveTo(78,204);c.lineTo(78,100);c.quadraticCurveTo(78,44,128,44);c.quadraticCurveTo(178,44,178,100);c.lineTo(178,204);c.closePath();},lin(c,60,40,190,210,[[0,'#e2ddf2'],[.45,'#aaa3c8'],[1,'#7a7399']]),8);
  c.save();c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(88,190);c.lineTo(88,102);c.quadraticCurveTo(88,58,122,52);c.stroke();c.restore();
  shape(c,()=>{c.rect(118,78,20,76);c.rect(98,98,60,20);},lin(c,0,80,0,150,[[0,'#7c7599'],[1,'#5b5479']]),5,'#3d3158');
  for(const [x,y,r] of [[70,200,16],[96,206,12],[176,200,13]] as const)shape(c,()=>{c.ellipse(x,y,r,r*.7,0,0,Math.PI*2);},lin(c,0,y-r,0,y+r,[[0,'#9fe05a'],[1,'#4f9a34']]),5,'#264417');
  c.save();c.strokeStyle='#3f8a2e';c.lineWidth=6;c.lineCap='round';for(const x of [186,196,206]){c.beginPath();c.moveTo(x,222);c.lineTo(x+(x-196)*.6,198);c.stroke();}c.restore();},
 LANTERN(c){glowBehind(c,'#ffa530',118,.7,116);groundShadow(c,60);
  c.save();c.strokeStyle=OUT;c.lineWidth=11;c.beginPath();c.arc(128,38,17,Math.PI,0);c.stroke();c.strokeStyle='#d8933a';c.lineWidth=5;c.stroke();c.restore();
  shape(c,()=>{c.moveTo(92,72);c.lineTo(164,72);c.lineTo(146,48);c.lineTo(110,48);c.closePath();},lin(c,0,48,0,72,[[0,'#f6c25a'],[1,'#a8581a']]),8);
  shape(c,()=>rr(c,98,70,60,112,10),rad(c,128,118,4,70,[[0,'#fffbd0'],[.35,'#ffd24a'],[.75,'#ff8f1c'],[1,'#d2540a']]),8);
  c.save();c.fillStyle='#fff6c8';c.beginPath();c.ellipse(128,128,9,20,0,0,Math.PI*2);c.fill();c.restore();
  c.save();c.strokeStyle='#5a2c10';c.lineWidth=7;for(const x of [98,128,158]){c.beginPath();c.moveTo(x,74);c.lineTo(x,180);c.stroke();}c.restore();
  shape(c,()=>rr(c,90,66,76,16,6),lin(c,0,66,0,82,[[0,'#ffd878'],[1,'#b8681e']]),7);
  shape(c,()=>{c.moveTo(88,178);c.lineTo(168,178);c.lineTo(152,206);c.lineTo(104,206);c.closePath();},lin(c,0,178,0,206,[[0,'#ffd070'],[1,'#a45a1a']]),8);
  shine(c,108,100,5,22,.1,.65);},
 CHEST(c){glowBehind(c,'#ffb23a',100,.3);groundShadow(c,96);
  shape(c,()=>rr(c,44,112,168,92,12),lin(c,0,112,0,204,[[0,'#b86a2c'],[1,'#6a3416']]),8);
  c.save();c.strokeStyle='rgba(40,12,8,.45)';c.lineWidth=3;for(const y of [140,170]){c.beginPath();c.moveTo(50,y);c.lineTo(206,y);c.stroke();}c.restore();
  shape(c,()=>{c.moveTo(44,116);c.quadraticCurveTo(44,56,128,56);c.quadraticCurveTo(212,56,212,116);c.closePath();},lin(c,0,56,0,116,[[0,'#d98a42'],[1,'#8a4620']]),8);
  c.save();c.strokeStyle='rgba(255,230,160,.55)';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(58,108);c.quadraticCurveTo(62,72,110,66);c.stroke();c.restore();
  for(const x of [62,176]){shape(c,()=>{c.moveTo(x,112);c.lineTo(x,76);c.quadraticCurveTo(x+9,66,x+18,70);c.lineTo(x+18,112);c.lineTo(x+18,204);c.lineTo(x,204);c.closePath();},lin(c,x,0,x+18,0,[[0,'#ffe08a'],[1,'#c4781c']]),6);}
  shape(c,()=>rr(c,40,184,176,22,8),lin(c,0,184,0,206,[[0,'#ffd878'],[1,'#b8681e']]),7);
  shape(c,()=>rr(c,102,104,52,60,10),lin(c,0,104,0,164,[[0,'#ffe590'],[1,'#d08a22']]),7);
  skullMark(c,128,130,.36,'#5a2a10','#ffd88a');},
 POTION(c){glowBehind(c,'#e04bff',108,.55,150);groundShadow(c,70);
  fat(c,()=>{circ(c,128,152,62);rr(c,110,60,36,60,8);},rad(c,114,134,6,78,[[0,'#ff9bf6'],[.45,'#d02ae0'],[1,'#6a0e92']]),16);
  c.save();c.beginPath();c.arc(128,152,56,0,Math.PI*2);c.clip();c.fillStyle='rgba(255,255,255,.12)';c.fillRect(60,100,140,30);c.restore();
  shape(c,()=>rr(c,100,50,56,16,6),lin(c,0,50,0,66,[[0,'#ffd878'],[1,'#b8681e']]),7);
  shape(c,()=>rr(c,108,26,40,28,7),lin(c,0,26,0,54,[[0,'#b87040'],[1,'#6e3818']]),7);
  shine(c,100,142,10,30,.35,.85);shine(c,116,196,16,6,-.4,.35);
  for(const [x,y,r] of [[150,168,7],[160,148,4],[140,192,5]] as const){c.save();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=3;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.restore();}},
 KEY(c){glowBehind(c,'#ffc23a',108,.45);groundShadow(c,70,230,.25);
  c.save();c.translate(128,128);c.rotate(-.72);
  const gold=lin(c,-40,0,40,0,[[0,'#fff1a8'],[.45,'#f6b92a'],[1,'#b8681e']]);
  fat(c,()=>{circ(c,0,-70,28);circ(c,-26,-52,20);circ(c,26,-52,20);circ(c,0,-98,20);rr(c,-10,-52,20,150,5);rr(c,10,52,30,16,3);rr(c,10,76,22,14,3);},gold,14);
  c.fillStyle='#5a2c10';c.beginPath();c.arc(0,-70,13,0,Math.PI*2);c.fill();
  c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(-4,-40);c.lineTo(-4,80);c.stroke();c.restore();},
 GHOST(c){glowBehind(c,'#4cd8ff',116,.6);
  const body=()=>{c.moveTo(66,196);c.bezierCurveTo(56,92,84,44,128,44);c.bezierCurveTo(172,44,200,92,190,196);c.quadraticCurveTo(180,222,162,200);c.quadraticCurveTo(145,184,128,208);c.quadraticCurveTo(111,184,94,200);c.quadraticCurveTo(76,222,66,196);c.closePath();};
  fat(c,()=>{body();ell(c,60,130,24,14,.55);ell(c,196,130,24,14,-.55);},rad(c,122,100,6,110,[[0,'#eaffff'],[.5,'#6adcff'],[1,'#2493e6']]),14);
  shine(c,98,76,16,9,-.6,.8);
  c.save();c.fillStyle=OUT;for(const x of [106,150]){c.beginPath();c.ellipse(x,112,11,17,0,0,Math.PI*2);c.fill();}c.fillStyle='#fff';for(const x of [102,146]){c.beginPath();c.arc(x,105,4,0,Math.PI*2);c.fill();}
  c.beginPath();c.moveTo(106,140);c.quadraticCurveTo(128,176,152,140);c.quadraticCurveTo(128,148,106,140);c.fill();c.fillStyle='#ff8fb0';c.beginPath();c.ellipse(129,157,10,6,0,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(255,130,180,.45)';for(const x of [88,168]){c.beginPath();c.ellipse(x,138,9,5,0,0,Math.PI*2);c.fill();}c.restore();},
 MAUSOLEUM(c){glowBehind(c,'#ff5a3a',100,.25);groundShadow(c,80);
  c.save();c.translate(128,124);c.rotate(-.1);c.translate(-128,-124);
  shape(c,()=>rr(c,62,40,140,176,12),lin(c,0,40,0,216,[[0,'#e24444'],[1,'#8a1620']]),8);
  shape(c,()=>rr(c,62,40,26,176,10),lin(c,62,0,88,0,[[0,'#6d0e1a'],[1,'#b02530']]),8);
  shape(c,()=>rr(c,198,52,10,152,4),'#f4e6c0',5);shape(c,()=>rr(c,74,206,128,12,4),'#f4e6c0',5);
  for(const [x,y] of [[62,40],[202,40],[62,216],[202,216]] as const)shape(c,()=>c.arc(x,y,13,0,Math.PI*2),lin(c,0,y-13,0,y+13,[[0,'#ffe590'],[1,'#c4781c']]),5);
  c.strokeStyle='#ffd070';c.lineWidth=5;c.beginPath();rr(c,100,62,88,132,8);c.stroke();
  skullMark(c,144,124,.9,['#fff2c0','#e0a63a'],'#5a1018');c.restore();},
 BLASTER(c){glowBehind(c,'#4aa8ff',108,.4);groundShadow(c,80);
  c.save();c.translate(128,128);c.rotate(-.18);c.translate(-128,-128);
  shape(c,()=>{c.moveTo(78,150);c.lineTo(118,150);c.lineTo(110,222);c.quadraticCurveTo(100,230,86,226);c.closePath();},lin(c,0,150,0,226,[[0,'#8a4a26'],[1,'#552812']]),8);
  shape(c,()=>rr(c,44,92,132,70,30),lin(c,0,92,0,162,[[0,'#7cc4ff'],[.5,'#2f80f0'],[1,'#1a48b8']]),8);
  shape(c,()=>rr(c,166,84,44,86,10),lin(c,0,84,0,170,[[0,'#ffb060'],[1,'#e0560e']]),8);
  shape(c,()=>c.ellipse(210,127,10,28,0,0,Math.PI*2),'#2a1226',5);
  shape(c,()=>rr(c,150,88,20,78,6),lin(c,0,88,0,166,[[0,'#ffe590'],[1,'#c4781c']]),6);
  shape(c,()=>rr(c,66,78,52,18,7),lin(c,0,78,0,96,[[0,'#ffe590'],[1,'#c4781c']]),6);
  c.fillStyle='rgba(255,255,255,.85)';c.beginPath();rr(c,62,100,80,10,5);c.fill();c.fillStyle='#fff';for(const x of [72,96,120]){c.beginPath();c.arc(x,134,6,0,Math.PI*2);c.fill();}c.restore();},
 SKULL(c){glowBehind(c,'#ffc23a',112,.5);groundShadow(c,80,232,.3);
  fat(c,()=>c.arc(128,126,92,0,Math.PI*2),lin(c,60,40,200,220,[[0,'#fff0a0'],[.4,'#f6b92a'],[1,'#a85a14']]),12);
  shape(c,()=>c.arc(128,126,72,0,Math.PI*2),lin(c,0,54,0,198,[[0,'#d08a22'],[1,'#f6c444']]),5,'#7a3a10');
  c.save();c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=6;c.lineCap='round';c.beginPath();c.arc(128,126,84,Math.PI*1.05,Math.PI*1.45);c.stroke();c.restore();
  skullMark(c,128,126,.95,['#7a3a10','#4a2006'],'#ffe08a');},
};

function frameTexture(color:string,inner:string){const c=document.createElement('canvas');c.width=320;c.height=272;const g=c.getContext('2d')!;g.save();g.shadowColor=color;g.shadowBlur=26;g.lineWidth=11;g.strokeStyle=color;g.beginPath();rr(g,22,22,276,228,22);g.stroke();g.stroke();g.restore();g.lineWidth=4;g.strokeStyle=inner;g.beginPath();rr(g,22,22,276,228,22);g.stroke();const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function tileTexture(){const c=document.createElement('canvas');c.width=320;c.height=272;const g=c.getContext('2d')!;
 g.fillStyle=lin(g,0,0,0,272,[[0,'#46285f'],[.5,'#33194a'],[1,'#27123a']]);g.beginPath();rr(g,0,0,320,272,26);g.fill();
 g.fillStyle=rad(g,160,136,20,230,[[0,'rgba(150,100,220,.28)'],[1,'rgba(150,100,220,0)']]);g.fillRect(0,0,320,272);
 g.lineWidth=5;g.strokeStyle='rgba(176,130,235,.5)';g.beginPath();rr(g,6,6,308,260,22);g.stroke();
 g.strokeStyle='rgba(10,2,24,.85)';g.lineWidth=14;g.beginPath();rr(g,14,14,292,244,18);g.stroke();
 g.strokeStyle='rgba(255,220,170,.10)';g.lineWidth=3;g.beginPath();g.moveTo(26,252);g.lineTo(294,252);g.stroke();
 const t=new T.CanvasTexture(g.canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function render3d(models:Record<string,T.Object3D>,jobs:{id:SymbolId,model:string,height:number,rotY:number,tilt?:number,warm?:number,light?:[number,number,number]}[]){
 const out:Partial<Record<SymbolId,HTMLCanvasElement>>={};const r=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(512,512,false);r.setClearColor(0,0);r.outputColorSpace=T.SRGBColorSpace;
 const pm=new T.PMREMGenerator(r);const env=pm.fromScene(new RoomEnvironment(),.04).texture;
 for(const j of jobs){const sc=new T.Scene();sc.environment=env;sc.environmentIntensity=j.id==='WILD'?.9:.42;sc.add(new T.HemisphereLight('#d5ccff','#6a4a44',j.id==='WILD'?1.1:.7));const key=new T.DirectionalLight('#ffe2b0',3.1);key.position.set(-3,4,5);sc.add(key);const rim=new T.DirectionalLight('#8f6bff',3);rim.position.set(3,2,-4);sc.add(rim);const fill=new T.DirectionalLight('#ff9d52',1.1);fill.position.set(4,-1,4);sc.add(fill);
  if(j.id==='SCATTER'){const door=new T.PointLight('#ff9a30',9,6,1.6);door.position.set(0,j.height*.3,j.height*.5);sc.add(door);}
  const m=normalized(clone(models[j.model]),j.height);m.rotation.y=j.rotY;m.rotation.x=j.tilt??0;sc.add(m);sc.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(m),size=b.getSize(new T.Vector3()),ctr=b.getCenter(new T.Vector3());const cam=new T.PerspectiveCamera(26,1,.1,100);const dist=Math.max(size.y,size.x*1.05)/(2*Math.tan(T.MathUtils.degToRad(13)))*1.04+size.z/2;cam.position.set(ctr.x,ctr.y+size.y*.02,ctr.z+dist);cam.lookAt(ctr);r.render(sc,cam);
  const cv=document.createElement('canvas');cv.width=cv.height=S;cv.getContext('2d')!.drawImage(r.domElement,0,0,S,S);out[j.id]=cv;}
 env.dispose();pm.dispose();r.dispose();r.forceContextLoss();return out;}

export type SymbolKit=ReturnType<typeof createSymbolKit>;
export function createSymbolKit(models:Record<string,T.Object3D>){
 const shots=render3d(models,[{id:'WILD',model:'skull',height:1.4,rotY:-.35},{id:'SCATTER',model:'mausoleum',height:1.4,rotY:.0,light:[0,0,0]},{id:'GARGOYLE',model:'gargoyle',height:1.4,rotY:-.25}]);
 const canvases={} as Record<SymbolId,HTMLCanvasElement>;
 for(const id of ['TOMB','LANTERN','CHEST','POTION','KEY','GHOST','MAUSOLEUM','BLASTER','SKULL','WILD','SCATTER','GARGOYLE'] as SymbolId[]){
  const cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d')!;
  if(id==='WILD'){glowBehind(c,'#ffb43a',116,.62,112);groundShadow(c,70,214,.35);c.drawImage(shots.WILD!,8,-14,240,240);label(c,'WILD',226,62,['#fff3c8','#ffb830']);}
  else if(id==='SCATTER'){glowBehind(c,'#a45cff',116,.6,112);c.drawImage(shots.SCATTER!,12,-12,232,232);label(c,'SCATTER',226,46,['#ffe9ff','#d38bff']);}
  else if(id==='GARGOYLE'){glowBehind(c,'#7f78ff',104,.4);groundShadow(c,84,228,.35);c.drawImage(shots.GARGOYLE!,4,-6,248,248);}
  else painters[id]!(c);
  canvases[id]=cv;}
 const textures=new Map<SymbolId,T.CanvasTexture>(),materials=new Map<SymbolId,T.MeshBasicMaterial>(),clipped=new Map<SymbolId,T.MeshBasicMaterial>();
 const texture=(id:SymbolId)=>{let t=textures.get(id);if(!t){t=new T.CanvasTexture(canvases[id]);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;textures.set(id,t);}return t;};
 const material=(id:SymbolId)=>{let m=materials.get(id);if(!m){m=new T.MeshBasicMaterial({map:texture(id),transparent:true,depthWrite:false,toneMapped:false});materials.set(id,m);}return m;};
 const clippedMaterial=(id:SymbolId,planes:T.Plane[])=>{let m=clipped.get(id);if(!m){m=material(id).clone();m.clippingPlanes=planes;clipped.set(id,m);}return m;};
 const geometry=new T.PlaneGeometry(1.86,1.86);
 return {canvases,material,clippedMaterial,geometry,tile:tileTexture(),frameGold:frameTexture('#ffb21e','#fff0b0'),framePurple:frameTexture('#c44bff','#f6d2ff'),
  makeSymbol(id:SymbolId){const g=new T.Group();g.name=`symbol-${id}`;const m=new T.Mesh(geometry,material(id));g.add(m);return g;}};
}
