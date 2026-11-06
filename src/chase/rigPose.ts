import * as T from 'three';
/**
 * Rig-agnostic procedural posing for the Mixamo-named skeletons shared by Skull and Seeker.
 * Poses are ABSOLUTE world-frame offsets from each bone's rest orientation (D·W0), re-expressed in the animated parent's frame, top-down.
 * That makes them independent of each rig's local bone axes (which differ between the two models).
 */
export type Deltas=Record<string,T.Quaternion>;
const strip=(n:string)=>n.replace(/^mixamorig:?/,'');
export class RigPoser{
 readonly bones:T.Bone[];readonly names:string[];readonly restDir=new Map<string,T.Vector3>();
 private q0:T.Quaternion[]=[];private w0:T.Quaternion[]=[];private parent:number[]=[];private rootW=new T.Quaternion();private pos=new Map<string,T.Vector3>();
 /** `frame` is the object whose axes define the pose space (x right, y up, z forward at rest). Build while its own rotation is identity. */
 constructor(model:T.Object3D,frame:T.Object3D){
  frame.updateWorldMatrix(true,true);const fi=frame.getWorldQuaternion(new T.Quaternion()).invert();
  let skin:T.SkinnedMesh|undefined;model.traverse(o=>{if(!skin&&(o as T.SkinnedMesh).isSkinnedMesh)skin=o as T.SkinnedMesh;});
  this.bones=skin!.skeleton.bones;this.names=this.bones.map(b=>strip(b.name));
  const wq=new T.Quaternion(),wp=new T.Vector3(),fInv=new T.Matrix4().copy(frame.matrixWorld).invert();
  this.bones.forEach((b,i)=>{this.q0.push(b.quaternion.clone());this.w0.push(b.getWorldQuaternion(wq).premultiply(fi).clone());this.parent.push(this.bones.indexOf(b.parent as T.Bone));this.pos.set(this.names[i]!,b.getWorldPosition(wp).applyMatrix4(fInv).clone());});
  const pr=this.bones[0]!.parent!;this.rootW.copy(pr.getWorldQuaternion(wq).premultiply(fi));
  const pairs:[string,string][]=[['LeftUpLeg','LeftLeg'],['LeftLeg','LeftFoot'],['RightUpLeg','RightLeg'],['RightLeg','RightFoot'],['LeftArm','LeftForeArm'],['LeftForeArm','LeftHand'],['RightArm','RightForeArm'],['RightForeArm','RightHand']];
  for(const [a,b] of pairs)this.restDir.set(a,this.pos.get(b)!.clone().sub(this.pos.get(a)!).normalize());
 }
 /** Absolute rotation that points limb `name` (rest direction) at `dir`. */
 aim(name:string,dir:T.Vector3):T.Quaternion{return new T.Quaternion().setFromUnitVectors(this.restDir.get(name)!,dir.clone().normalize());}
 reset(){this.bones.forEach((b,i)=>b.quaternion.copy(this.q0[i]!));}
 /** Applies deltas; weight<1 slerps from whatever the bones currently hold (e.g. an AnimationMixer pose). */
 apply(d:Deltas,weight=1){
  const pw:T.Quaternion[]=[];const tmp=new T.Quaternion();
  for(let i=0;i<this.bones.length;i++){
   const parentW=this.parent[i]!<0?this.rootW:pw[this.parent[i]!]!;const D=d[this.names[i]!];
   const local=D?tmp.copy(parentW).invert().multiply(D).multiply(this.w0[i]!):tmp.copy(this.q0[i]!);
   if(weight>=1)this.bones[i]!.quaternion.copy(local);else this.bones[i]!.quaternion.slerp(local,weight);
   pw[i]=parentW.clone().multiply(this.bones[i]!.quaternion);
  }
 }
}
