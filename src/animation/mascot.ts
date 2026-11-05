import * as T from 'three';
export class MascotController {
 readonly mixer:T.AnimationMixer;readonly clips:T.AnimationClip[]=[];private action?:T.AnimationAction;state='idle';elapsed=0;private remaining=0;
 constructor(private root:T.Object3D,source:T.AnimationClip[]){this.mixer=new T.AnimationMixer(root);
  this.clips.push(...source);
  const bones:T.Bone[]=[];root.traverse(o=>{if(o instanceof T.Bone)bones.push(o);});
  for(const [name,amplitude,duration] of [['idle',.025,3.2],['attention',.065,1.2],['win',.11,1.8],['anticipation',.045,1.6]] as const){const tracks:T.KeyframeTrack[]=[];for(const bone of bones.filter(b=>/Head$|Spine2$/.test(b.name))){const base=bone.quaternion.clone(),axis=new T.Vector3(0,0,1);const values=[0,amplitude,0,-amplitude*.5,0].flatMap(a=>base.clone().multiply(new T.Quaternion().setFromAxisAngle(axis,a)).toArray());tracks.push(new T.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`,[0,duration*.25,duration*.5,duration*.75,duration],values));}this.clips.push(new T.AnimationClip(name,duration,tracks));}
  this.setState('idle');
 }
 private play(clip:T.AnimationClip,loop:boolean){const next=this.mixer.clipAction(clip);next.reset().setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);next.clampWhenFinished=true;next.play();if(this.action&&this.action!==next){this.action.fadeOut(.25);next.fadeIn(.25);}this.action=next;}
 setState(name:string){const mapped:Record<string,string>={attention:'agree',win:'agree',anticipation:'afraid',lose:'angry_01'};const clip=this.clips.find(c=>c.name===mapped[name])??this.clips.find(c=>c.name===name)??this.clips[0];if(!clip)return;this.state=name;this.remaining=name==='idle'?0:clip.duration;this.play(clip,name==='idle');}
 update(dt:number){this.elapsed+=dt;this.mixer.update(dt);if(this.remaining>0){this.remaining-=dt;if(this.remaining<=0)this.setState('idle');}}
 inspect(){const pose:Record<string,number[]>={};this.root.traverse(o=>{if(o instanceof T.Bone&&/Head$|Spine2$|RightArm$/.test(o.name))pose[o.name]=o.quaternion.toArray();});return {state:this.state,time:this.mixer.time,actionTime:this.action?.time,pose,clips:this.clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}))};}
}
