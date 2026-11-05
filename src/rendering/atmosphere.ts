import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let glowTex:T.CanvasTexture|undefined,sparkTex:T.CanvasTexture|undefined;
export function glowTexture(){if(!glowTex){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!,g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff');g.addColorStop(.12,'#ffffffdd');g.addColorStop(.4,'#ffffff44');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);glowTex=new T.CanvasTexture(c);glowTex.colorSpace=T.SRGBColorSpace;}return glowTex;}
export function sparkTexture(){if(!sparkTex){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')!;const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'#fff');r.addColorStop(.2,'#ffffffcc');r.addColorStop(1,'#ffffff00');g.fillStyle=r;g.fillRect(0,0,64,64);g.fillStyle='#fff';g.beginPath();g.moveTo(32,0);g.quadraticCurveTo(34,30,64,32);g.quadraticCurveTo(34,34,32,64);g.quadraticCurveTo(30,34,0,32);g.quadraticCurveTo(30,30,32,0);g.fill();sparkTex=new T.CanvasTexture(c);sparkTex.colorSpace=T.SRGBColorSpace;}return sparkTex;}
export function glow(parent:T.Object3D,x:number,y:number,z:number,color:string,size:number,opacity=.5){const s=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,fog:false}));s.position.set(x,y,z);s.scale.setScalar(size);parent.add(s);return s;}

/** Night sky: deep indigo to violet with a warm-magenta horizon, twinkling stars and soft cloud wisps. */
export function sky(parent:T.Object3D){
 const material=new T.ShaderMaterial({depthWrite:false,fog:false,uniforms:{uTime:{value:0}},
  vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 vUv;uniform float uTime;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  void main(){
   float y=vUv.y;
   vec3 top=vec3(.045,.02,.16),mid=vec3(.2,.1,.46),low=vec3(.42,.2,.62);
   vec3 col=mix(low,mid,smoothstep(.22,.55,y));col=mix(col,top,smoothstep(.5,.95,y));
   col+=vec3(.5,.2,.18)*smoothstep(.34,.1,y)*.35;
   float cl=n(vUv*vec2(5.,3.)+vec2(uTime*.004,0.))*.6+n(vUv*vec2(11.,6.)-vec2(uTime*.006,0.))*.3;
   col+=vec3(.12,.07,.24)*smoothstep(.38,.9,cl)*smoothstep(.15,.55,y)*.9;
   vec2 sp=vUv*vec2(110.,60.);vec2 id=floor(sp);float r=h(id);
   float star=step(.965,r)*smoothstep(.5,.0,length(fract(sp)-.5))*(.6+.4*sin(uTime*(1.2+r*3.)+r*40.));
   col+=vec3(.85,.85,1.)*star*smoothstep(.45,.8,y);
   gl_FragColor=vec4(col,1.);
  }`});
 const plane=new T.Mesh(new T.PlaneGeometry(46,15),material);plane.position.set(0,1.6,-25);parent.add(plane);return material;
}

export function moon(parent:T.Object3D,x:number,y:number,z:number,r:number){
 const g=new T.Group();g.position.set(x,y,z);parent.add(g);
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;
 const base=ctx.createRadialGradient(110,100,10,128,128,126);base.addColorStop(0,'#fffbe6');base.addColorStop(.7,'#e7e4ff');base.addColorStop(1,'#b9b4ec');ctx.fillStyle=base;ctx.beginPath();ctx.arc(128,128,124,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(128,128,124,0,Math.PI*2);ctx.clip();let s=7;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 for(let i=0;i<16;i++){const px=rnd()*256,py=rnd()*256,pr=8+rnd()*26;const gr=ctx.createRadialGradient(px,py,0,px,py,pr);gr.addColorStop(0,'rgba(140,130,200,.38)');gr.addColorStop(1,'rgba(140,130,200,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fill();}ctx.restore();
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 const disc=new T.Mesh(new T.CircleGeometry(r,48),new T.MeshBasicMaterial({map:tex,toneMapped:false,fog:false}));g.add(disc);
 glow(g,0,0,-.1,'#8c7cff',r*7,.55);glow(g,0,0,-.05,'#d8d0ff',r*3.4,.35);return g;
}

/** Flat unlit cemetery skyline (crosses, rounded stones, obelisks, spiky fence) merged into one draw call. */
export function silhouetteLayer(parent:T.Object3D,z:number,color:string,seed:number,baseY:number,scale:number,x0=-18,x1=20){
 let s=seed;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};const parts:T.BufferGeometry[]=[];
 const add=(g:T.BufferGeometry,x:number,y:number)=>{g.translate(x,y,0);parts.push(g);};
 add(new T.BoxGeometry(x1-x0+8,3,.3),(x0+x1)/2,baseY-1.4);
 for(let x=x0;x<x1;x+=1.3+rnd()*2.6){const k=rnd(),h=(1.1+rnd()*1.5)*scale;
  if(k<.38){add(new T.BoxGeometry(.28*scale,h,.3),x,baseY+h/2);add(new T.BoxGeometry(.95*scale,.26*scale,.3),x,baseY+h*.72);}
  else if(k<.72){add(new T.BoxGeometry(.95*scale,h*.7,.3),x,baseY+h*.35);const cap=new T.CylinderGeometry(.475*scale,.475*scale,.3,14,1,false,0,Math.PI);cap.rotateX(Math.PI/2);add(cap,x,baseY+h*.7);}
  else if(k<.86){const o=new T.ConeGeometry(.3*scale,h*1.15,4);o.rotateY(Math.PI/4);add(o,x,baseY+h*.58);}
  else{for(let i=0;i<5;i++){const sp=new T.ConeGeometry(.09*scale,.9*scale,4);add(sp,x+i*.34*scale,baseY+.5*scale);}add(new T.BoxGeometry(1.8*scale,.12*scale,.3),x+.68*scale,baseY+.35*scale);}}
 const mesh=new T.Mesh(mergeGeometries(parts)!,new T.MeshBasicMaterial({color,fog:false}));mesh.position.z=z;parent.add(mesh);return mesh;
}

/** Faceted low-poly foliage clump: dark teal-greens with flat shading (lit by the scene lights). */
export function foliage(parent:T.Object3D,x:number,y:number,z:number,seed:number,count=9,spread=1.5,size=1,tones=['#1d4a3a','#2a6a42','#3d8a46','#17372f']){
 let s=seed;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};const mats=tones.map(c=>new T.MeshStandardMaterial({color:c,roughness:.85,flatShading:true}));const g=new T.Group();g.position.set(x,y,z);parent.add(g);
 for(let i=0;i<count;i++){const m=new T.Mesh(new T.IcosahedronGeometry((.55+rnd()*.7)*size,0),mats[Math.floor(rnd()*mats.length)]);m.position.set((rnd()-.5)*2*spread,(rnd()-.5)*spread*.9,(rnd()-.5)*spread*.5);m.scale.set(1.25,.8+rnd()*.3,1);m.rotation.set(rnd()*3,rnd()*3,rnd()*3);m.castShadow=true;g.add(m);}
 return g;
}
