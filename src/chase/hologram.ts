import * as T from 'three';
import {HOLO_INTRO as H,HOLO_INTRO_TOTAL} from '../config/chase';
/**
 * HologramMaterialization — reusable, math-independent realtime effect for ONE skinned GLB (the Seeker).
 *  - patches clones of the model's own materials (onBeforeCompile) so skeletal animation keeps working; the originals are kept and put back by end()
 *  - one beam quad, one ground ring quad, one Points object (≤ 44 points): no textures, no extra render loop (the owner calls update()/apply() from its loop)
 *  - end()/dispose() restore materials and free every GPU resource created here
 */
export interface IntroState{phase:'beam'|'materialize'|'descent'|'land'|'done';visible:boolean;alpha:number;reveal:number;/** px above the stone */lift:number;squash:number;/** px (cartoon hop after touchdown) */bounce:number;beam:number;ring:number}
const sm=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
/** Pure timeline (story seconds from the start of the intro). At u ≥ total the Seeker stands exactly on the stone: lift = bounce = squash = 0. */
export function introState(u:number):IntroState{
 const B1=H.beam,B2=B1+H.materialize,B3=B2+H.descent,B4=B3+H.land;
 if(u<B1)return {phase:'beam',visible:false,alpha:0,reveal:0,lift:H.hoverPx,squash:0,bounce:0,beam:sm(u/B1),ring:-1};
 if(u<B2){const k=(u-B1)/H.materialize;return {phase:'materialize',visible:true,alpha:sm(k/.45),reveal:.3*sm(k),lift:H.hoverPx+5*Math.sin(k*Math.PI*2),squash:0,bounce:0,beam:1-.35*sm(k),ring:-1};}
 if(u<B3){const k=(u-B2)/H.descent;return {phase:'descent',visible:true,alpha:1,reveal:.3+.7*sm(k*1.05),lift:H.hoverPx*Math.pow(1-k,2.2),squash:.05*sm(k),bounce:0,beam:.65*(1-sm(k)),ring:-1};}   // slows down towards the stone
 if(u<B4){const k=(u-B3)/H.land;let squash=0,bounce=0;
  if(k<.4)squash=-.16*Math.sin(Math.PI*k/.4);else{const q=(k-.4)/.6;bounce=20*Math.sin(Math.PI*q);squash=.05*Math.sin(Math.PI*q);}
  return {phase:'land',visible:true,alpha:1,reveal:1,lift:0,squash,bounce,beam:0,ring:Math.min(1,(u-B3)/(H.land+.2))};}
 const r=(u-B3)/(H.land+.2);
 return {phase:'done',visible:true,alpha:1,reveal:1,lift:0,squash:0,bounce:0,beam:0,ring:r<1?r:-1};
}
export {HOLO_INTRO_TOTAL};

const VERT_HOLO=`varying float vHoloY;varying float vHoloX;\n`;
export class HologramMaterialization{
 enabled=true;
 private originals=new Map<T.Mesh,T.Material|T.Material[]>();private clones:T.Material[]=[];
 private u={uTime:{value:0},uBase:{value:0},uH:{value:1},uReveal:{value:0},uAlpha:{value:1},uBand:{value:1}};
 private active=false;
 /** Swap the model's materials for hologram-capable clones (idempotent). */
 begin(model:T.Object3D){
  if(this.active||!this.enabled)return;this.active=true;
  model.traverse(o=>{const m=o as T.Mesh;if(!m.isMesh)return;this.originals.set(m,m.material);
   const wrap=(src:T.Material)=>{const c=src.clone();c.transparent=true;c.onBeforeCompile=sh=>{Object.assign(sh.uniforms,this.u);
     sh.vertexShader=VERT_HOLO+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vHoloY=(modelMatrix*vec4(transformed,1.0)).y; vHoloX=(modelMatrix*vec4(transformed,1.0)).x;');
     sh.fragmentShader=`uniform float uTime,uBase,uH,uReveal,uAlpha,uBand;varying float vHoloY;varying float vHoloX;\n`+sh.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
      {float h=clamp((vHoloY-uBase)/max(uH,1.),0.,1.);
       float solid=1.-smoothstep(uReveal-.035,uReveal+.035,h);                       // below the front: original textures
       float lum=dot(gl_FragColor.rgb,vec3(.3,.59,.11));
       vec3 holo=vec3(.08,.78,1.)*(.28+lum*1.1);
       vec2 g=abs(fract(vec2(vHoloX*.16,vHoloY*.16))-.5);float grid=smoothstep(.44,.5,max(g.x,g.y));          // luminous lattice
       float sl=.82+.18*sin(vHoloY*1.7-uTime*9.);                                    // scanlines
       holo=holo*sl+vec3(.25,.95,1.)*grid*.7;
       float band=exp(-pow((h-uReveal)*16.,2.))*uBand;                                // vertical scan band
       vec3 col=mix(holo,gl_FragColor.rgb,solid)+vec3(.45,1.,1.)*band*.9;
       float a=mix(.62+.25*grid,1.,solid)*uAlpha;
       gl_FragColor=vec4(col,a);}`);};
    c.customProgramCacheKey=()=>'holo-v1';this.clones.push(c);return c;};
   m.material=Array.isArray(m.material)?m.material.map(wrap):wrap(m.material);});
 }
 /** Per-frame parameters. base = world y of the feet, height = model height in world units. */
 apply(s:IntroState,time:number,base:number,height:number){this.u.uTime.value=time;this.u.uBase.value=base+s.lift+s.bounce;this.u.uH.value=height;this.u.uReveal.value=s.reveal>=1?1.2:s.reveal;this.u.uAlpha.value=s.alpha;this.u.uBand.value=s.reveal>=1?0:1;}
 /** Put the original materials back; clones are disposed (no leak, no residual transparency). */
 end(){if(!this.active)return;this.active=false;for(const [m,mat] of this.originals)m.material=mat;this.originals.clear();for(const c of this.clones)c.dispose();this.clones.length=0;}
 get isActive(){return this.active;}
 get materialCount(){return this.clones.length;}
 dispose(){this.end();}
}

/** Beam + ground ring + sparkles. Three draw calls, procedural shaders, additive blending. */
export class HoloBeamFx{
 readonly group=new T.Group();
 private beam:T.Mesh;private ring:T.Mesh;private pts:T.Points;private uBeam={uT:{value:0},uI:{value:0}};private uRing={uK:{value:-1},uG:{value:0}};
 private n:number;private seed:Float32Array;private pos:Float32Array;
 constructor(private x:number,private groundY:number,private topY:number,private z:number,count:number){
  this.n=count;const mat=(frag:string,u:Record<string,{value:number}>)=>new T.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:frag});
  const hgt=topY-groundY;
  this.beam=new T.Mesh(new T.PlaneGeometry(H.beamWidthPx,hgt),mat(`varying vec2 vUv;uniform float uT,uI;
   float hash(float n){return fract(sin(n)*43758.5453);}
   void main(){float c=1.-abs(vUv.x-.5)*2.;float core=pow(max(c,0.),2.4);
    float col=floor(vUv.x*16.);float lines=step(.55,hash(col+floor(uT*5.)*.13))*smoothstep(.0,.5,c);       // digital vertical lines
    float drift=.5+.5*sin(vUv.y*60.-uT*14.+hash(col)*6.);
    float vf=smoothstep(1.,.6,vUv.y)*.85+.15*smoothstep(.0,.25,1.-vUv.y);                                      // brighter near the floor
    float a=(core*.85+lines*drift*.5)*vf*uI;gl_FragColor=vec4(vec3(.25,.92,1.)*a*1.15,a);}`,this.uBeam));
  this.beam.position.set(x,groundY+hgt/2,z);this.beam.renderOrder=20;
  this.ring=new T.Mesh(new T.PlaneGeometry(300,90),mat(`varying vec2 vUv;uniform float uK,uG;
   void main(){vec2 p=(vUv-.5)*vec2(2.,2.);float r=length(p);float glow=exp(-r*r*5.)*uG*.8;
    float ring=0.;if(uK>=0.){float rr=.2+uK*.8;ring=smoothstep(.09,0.,abs(r-rr))*(1.-uK);}
    float a=glow+ring;gl_FragColor=vec4(vec3(.3,.95,1.)*a,a);}`,this.uRing));
  this.ring.position.set(x,groundY+4,z+2);this.ring.renderOrder=19;
  this.seed=new Float32Array(count*3);this.pos=new Float32Array(count*3);for(let i=0;i<count*3;i++)this.seed[i]=Math.random();
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(this.pos,3));
  this.pts=new T.Points(g,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uI:this.uBeam.uI},vertexShader:'void main(){gl_PointSize=4.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uI;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d)*uI;gl_FragColor=vec4(vec3(.4,1.,1.)*a,a);}'}));
  this.pts.frustumCulled=false;this.pts.renderOrder=21;
  this.group.add(this.beam,this.ring,this.pts);this.group.visible=false;
 }
 update(s:IntroState,time:number,reduced=false){
  const on=s.beam>.001||s.ring>=0;this.group.visible=on;if(!on)return;
  this.uBeam.uT.value=time;this.uBeam.uI.value=s.beam;this.uRing.uG.value=Math.max(s.beam,s.ring>=0?1-s.ring:0);this.uRing.uK.value=s.ring;
  const hgt=this.topY-this.groundY,step=reduced?2:1;
  for(let i=0;i<this.n;i++){const sx=this.seed[i*3]!,sy=this.seed[i*3+1]!,sz=this.seed[i*3+2]!;
   const phase=(sy+time*(.45+sz*.6))%1;                                              // sparkles fall along the beam
   this.pos[i*3]=this.x+(sx-.5)*H.beamWidthPx*.8*(1-phase*.25);this.pos[i*3+1]=this.groundY+(1-phase)*Math.min(hgt,620);this.pos[i*3+2]=this.z+4;}
  void step;(this.pts.geometry.attributes.position as T.BufferAttribute).needsUpdate=true;
 }
 setVisible(v:boolean){this.group.visible=v;}
 dispose(){this.group.traverse(o=>{const m=o as T.Mesh;m.geometry?.dispose();(m.material as T.Material|undefined)?.dispose();});this.group.removeFromParent();}
}
