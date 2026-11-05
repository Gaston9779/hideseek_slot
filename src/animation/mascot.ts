import * as T from 'three';
/**
 * Skull animation state machine. Real clips from the rigged GLB (agree / afraid / angry_01) are blended with
 * procedural bone clips (idle / watch) so the character is never static. Falls back to the first clip if one is missing.
 */
export type SkullState='idle'|'watch'|'anticipation'|'win'|'bigwin'|'bonus'|'lose';
export class MascotController {
 readonly mixer:T.AnimationMixer;readonly clips:T.AnimationClip[]=[];private action?:T.AnimationAction;state:SkullState='idle';elapsed=0;private remaining=0;
 constructor(private root:T.Object3D,source:T.AnimationClip[]){this.mixer=new T.AnimationMixer(root);
  this.clips.push(...source);
  const bones:T.Bone[]=[];root.traverse(o=>{if(o instanceof T.Bone)bones.push(o);});
  for(const [name,amplitude,duration] of [['idle',.03,3.4],['watch',.07,1.3]] as const){const tracks:T.KeyframeTrack[]=[];for(const bone of bones.filter(b=>/Head$|Spine2$/.test(b.name))){const base=bone.quaternion.clone(),axis=new T.Vector3(0,0,1);const values=[0,amplitude,0,-amplitude*.5,0].flatMap(a=>base.clone().multiply(new T.Quaternion().setFromAxisAngle(axis,a)).toArray());tracks.push(new T.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`,[0,duration*.25,duration*.5,duration*.75,duration],values));}this.clips.push(new T.AnimationClip(`proc_${name}`,duration,tracks));}
  this.setState('idle');
 }
 private find(n:string){return this.clips.find(c=>c.name===n);}
 private play(clip:T.AnimationClip,loop:boolean,speed=1){const next=this.mixer.clipAction(clip);next.reset().setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);next.clampWhenFinished=true;next.timeScale=speed;next.play();if(this.action&&this.action!==next){this.action.fadeOut(.25);next.fadeIn(.25);}this.action=next;}
 setState(name:SkullState){
  const map:Record<SkullState,[string,boolean,number]>={idle:['proc_idle',true,1],watch:['proc_watch',true,1],anticipation:['afraid',false,1],win:['agree',false,1],bigwin:['agree',false,1.35],bonus:['angry_01',false,1],lose:['proc_idle',true,1]};
  const [clipName,loop,speed]=map[name];const clip=this.find(clipName)??this.find('proc_idle')??this.clips[0];if(!clip)return;
  this.state=name;this.remaining=loop?0:clip.duration/speed;this.play(clip,loop,speed);
 }
 update(dt:number){this.elapsed+=dt;this.mixer.update(dt);if(this.remaining>0){this.remaining-=dt;if(this.remaining<=0)this.setState('idle');}}
 inspect(){const pose:Record<string,number[]>={};this.root.traverse(o=>{if(o instanceof T.Bone&&/Head$|Spine2$|RightArm$/.test(o.name))pose[o.name]=o.quaternion.toArray();});return {state:this.state,time:this.mixer.time,actionTime:this.action?.time,pose,clips:this.clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}))};}
}
