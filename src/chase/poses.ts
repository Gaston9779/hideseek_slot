import * as T from 'three';
import type {Deltas,RigPoser} from './rigPose';
/** Procedural pose library (curves + quaternion aims). Pure functions of time; no state. Angles in radians, "forward" = +z of the character. */
export interface PoseOut{d:Deltas;bounce:number;squash:number}
export interface Ctx{p:RigPoser;gun:boolean}   // gun: right arm holds the blaster → keep it at rest (it is skinned to the hand, so it can never detach)
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const AX=V(1,0,0),AY=V(0,1,0),AZ=V(0,0,1);
const qa=(ax:T.Vector3,a:number)=>new T.Quaternion().setFromAxisAngle(ax,a);
const qx=(a:number)=>qa(AX,a),qy=(a:number)=>qa(AY,a),qz=(a:number)=>qa(AZ,a);
const limb=(a:number,side:number,sp=.05)=>V(side*sp,-Math.cos(a),Math.sin(a));
const I=()=>new T.Quaternion();
const ease=(u:number)=>u<=0?0:u>=1?1:u*u*(3-2*u);
function legs(c:Ctx,d:Deltas,fl:number,fr:number,kl:number,kr:number){
 d.LeftUpLeg=c.p.aim('LeftUpLeg',limb(fl,1));d.LeftLeg=c.p.aim('LeftLeg',limb(fl-kl,1));d.LeftFoot=I();
 d.RightUpLeg=c.p.aim('RightUpLeg',limb(fr,-1));d.RightLeg=c.p.aim('RightLeg',limb(fr-kr,-1));d.RightFoot=I();
}
function arm(c:Ctx,d:Deltas,side:'Left'|'Right',a:number,bend:number,spread=.15){
 if(c.gun&&side==='Right')return;const s=side==='Left'?1:-1;
 d[`${side}Arm`]=c.p.aim(`${side}Arm`,limb(a,s,spread));d[`${side}ForeArm`]=c.p.aim(`${side}ForeArm`,limb(a+bend,s,spread));
}
export function idle(c:Ctx,t:number):PoseOut{const d:Deltas={};d.Spine=qx(.015*Math.sin(t*1.9));d.Head=qz(.03*Math.sin(t*1.4));return {d,bounce:0,squash:.004*Math.sin(t*1.9)};}
/** Bounding cartoon run: alternating legs, counter-swinging arms, forward lean, head bob, airborne bounce. `cad` = full cycles per second. */
export function run(c:Ctx,t:number,cad=3,amp=1,lean=.2):PoseOut{
 const ph=t*cad*Math.PI*2,s=Math.sin(ph),co=Math.cos(ph),d:Deltas={};
 const fl=1.05*amp*s,fr=-fl,kl=.25+1.05*amp*Math.max(0,co),kr=.25+1.05*amp*Math.max(0,-co);
 legs(c,d,fl,fr,kl,kr);
 arm(c,d,'Left',-.9*amp*s,.9);arm(c,d,'Right',.9*amp*s,.9);
 d.Hips=qy(.16*amp*s);d.Spine=qx(lean).multiply(qy(.12*amp*s));d.Head=qx(.05*co).multiply(qy(-.08*s));
 return {d,bounce:.055*amp*(1-Math.abs(s)),squash:0};
}
/** Seeker "searching": cautious trot, head swivelling left/right, blaster held forward. */
export function scan(c:Ctx,t:number):PoseOut{const o=run(c,t,2.1,.5,.1);o.d.Head=qy(.75*Math.sin(t*3.2)).multiply(qx(.03));o.bounce*=.6;return o;}
/** Skull panic: arms overhead flailing, legs scrambling on the spot, head wobble. u = turn progress 0..1 (hips twist). */
export function panic(c:Ctx,t:number):PoseOut{
 const w=t*17,d:Deltas={};arm(c,d,'Left',2.5+.55*Math.sin(w),.5,.35);arm(c,d,'Right',2.5+.55*Math.sin(w+Math.PI),.5,.35);
 legs(c,d,.5*Math.sin(w*1.2),-.5*Math.sin(w*1.2),.5+.3*Math.sin(w*1.2+1),.5-.3*Math.sin(w*1.2+1));
 d.Spine=qx(-.12);d.Head=qz(.18*Math.sin(w*.8)).multiply(qx(-.1));
 return {d,bounce:.03*Math.abs(Math.sin(w*1.2)),squash:0};
}
/** Alert pose for the seeker when he spots the fleeing Skull: blaster-forward lunge, head snap. */
export function lunge(c:Ctx,t:number):PoseOut{const o=run(c,t,3.2,1.1,.28);return o;}
/** Trip: toe catches the step → leg stuck forward, torso pitching, arms windmill. u 0..1 */
export function trip(c:Ctx,u:number):PoseOut{
 const d:Deltas={},k=ease(u),w=u*Math.PI*5;
 legs(c,d,.9-.2*u,-.7+1.4*Math.sin(w*.6)*.4,.2,.9);
 arm(c,d,'Left',2.2*Math.sin(w),.6,.3);arm(c,d,'Right',-2.2*Math.sin(w),.6,.3);
 d.Spine=qx(.25+.9*k);d.Head=qx(-.5*k).multiply(qz(.2*Math.sin(w)));
 return {d,bounce:-.03*k,squash:0};
}
/** Tumble: limbs spread and kicking while the root somersaults (root rotation is applied by the director). */
export function tumble(c:Ctx,t:number):PoseOut{
 const w=t*14,d:Deltas={};arm(c,d,'Left',2.4+.7*Math.sin(w),.3,.55);arm(c,d,'Right',2.4-.7*Math.sin(w),.3,.55);
 legs(c,d,.9*Math.sin(w+1),-.9*Math.sin(w+1),.7,.7);d.Head=qz(.25*Math.sin(w*.7));return {d,bounce:0,squash:0};
}
/** Skid / brake at the end of the Skull's run: leaning back, arms out, then settling. u 0..1 */
export function brake(c:Ctx,u:number):PoseOut{
 const d:Deltas={},k=1-ease(u);legs(c,d,.7*k,-.35*k,.4*k,.2*k);arm(c,d,'Left',-.6*k,.8*k,.4);arm(c,d,'Right',-.6*k,.8*k,.4);d.Spine=qx(-.25*k);return {d,bounce:0,squash:0};
}
export const smooth=ease;
