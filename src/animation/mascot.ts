import * as T from 'three';
/**
 * Skull animation state machine. Real clips from the rigged GLB (agree / afraid / angry_01) are blended with
 * procedural bone clips (idle / watch) so the character is never static. Falls back to the first clip if one is missing.
 */
/** Optional presentation hook (audio voices): called with the state the mascot enters. */
export const mascotHooks:{onState?:(s:SkullState)=>void}={};
export type SkullState='idle'|'watch'|'anticipation'|'win'|'bigwin'|'bonus'|'lose';
/** Gameplay events → states. Emotional feedback is derived from the real credited result only. */
export type SkullEvent='IDLE'|'SPIN_STARTED'|'SPIN_LOSS'|'WIN'|'BIG_WIN'|'BONUS_TRIGGER'|'BEST_CHEST_PICK'|'BONUS_END';
export const EVENT_STATE:Record<SkullEvent,SkullState>={IDLE:'idle',SPIN_STARTED:'watch',SPIN_LOSS:'lose',WIN:'win',BIG_WIN:'bigwin',BONUS_TRIGGER:'bonus',BEST_CHEST_PICK:'bigwin',BONUS_END:'idle'};
/** Presentation-only throttle for the Angry grumble: shown on a full loss, at most once every ANGRY_EVERY consecutive losses, never in free spins. */
export const ANGRY_EVERY=4;
export class MascotController {
 readonly mixer:T.AnimationMixer;readonly clips:T.AnimationClip[]=[];private action?:T.AnimationAction;state:SkullState='idle';elapsed=0;private lossStreak=0;activeClip='';private remaining=0;
 constructor(private root:T.Object3D,source:T.AnimationClip[]){this.mixer=new T.AnimationMixer(root);
  this.clips.push(...source);
  const bones:T.Bone[]=[];root.traverse(o=>{if(o instanceof T.Bone)bones.push(o);});
  for(const [name,amplitude,duration] of [['idle',.03,3.4],['watch',.07,1.3]] as const){const tracks:T.KeyframeTrack[]=[];for(const bone of bones.filter(b=>/Head$|Spine2$/.test(b.name))){const base=bone.quaternion.clone(),axis=new T.Vector3(0,0,1);const values=[0,amplitude,0,-amplitude*.5,0].flatMap(a=>base.clone().multiply(new T.Quaternion().setFromAxisAngle(axis,a)).toArray());tracks.push(new T.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`,[0,duration*.25,duration*.5,duration*.75,duration],values));}this.clips.push(new T.AnimationClip(`proc_${name}`,duration,tracks));}
  this.setState('idle');
 }
 private find(n:string){return this.clips.find(c=>c.name===n);}
 private play(clip:T.AnimationClip,loop:boolean,speed=1){const next=this.mixer.clipAction(clip);next.reset().setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);next.clampWhenFinished=true;next.timeScale=speed;next.play();if(this.action&&this.action!==next){this.action.fadeOut(.25);next.fadeIn(.25);}this.action=next;}
 setState(name:SkullState){
  const map:Record<SkullState,[string,boolean,number]>={idle:['proc_idle',true,1],watch:['proc_watch',true,1],anticipation:['afraid',false,1],win:['agree',false,1],bigwin:['agree',false,1.35],bonus:['agree',false,1.6],lose:['angry_01',false,1.7]};
  const [clipName,loop,speed]=map[name];const clip=this.find(clipName)??this.find('proc_idle')??this.clips[0];if(!clip)return;
  mascotHooks.onState?.(name);this.state=name;this.activeClip=clip.name;this.remaining=loop?0:clip.duration/speed;this.play(clip,loop,speed);
 }
 /** Event entry point. SPIN_LOSS plays 'angry_01' (short, cartoon) on the 1st and then every ANGRY_EVERY-th consecutive full loss; otherwise idle. Any other event resets the streak. */
 dispatch(e:SkullEvent,opts:{freeSpin?:boolean}={}){if(e==='SPIN_LOSS'){const show=!opts.freeSpin&&this.lossStreak%ANGRY_EVERY===0;if(!opts.freeSpin)this.lossStreak++;this.setState(show?'lose':'idle');return;}if(e==='WIN'||e==='BIG_WIN'||e==='BONUS_TRIGGER'||e==='BEST_CHEST_PICK')this.lossStreak=0;this.setState(EVENT_STATE[e]);}
 update(dt:number){this.elapsed+=dt;this.mixer.update(dt);if(this.remaining>0){this.remaining-=dt;if(this.remaining<=0)this.setState('idle');}}
 inspect(){const pose:Record<string,number[]>={};this.root.traverse(o=>{if(o instanceof T.Bone&&/Head$|Spine2$|RightArm$/.test(o.name))pose[o.name]=o.quaternion.toArray();});return {state:this.state,activeClip:this.activeClip,lossStreak:this.lossStreak,time:this.mixer.time,actionTime:this.action?.time,pose,clips:this.clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length}))};}
}
