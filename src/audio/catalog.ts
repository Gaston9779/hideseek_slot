/** Sound catalogue of assets-2d/audio/skull_hunt_audio_pack (ids == manifest.json ids). Presentation only: audio never touches RNG, state or payouts. */
export type Bus='music'|'sfx'|'voice'|'cinematic';
export interface SoundDef{id:string;dir:string;bus:Bus;gain:number;loop?:boolean;/** min ms between two starts of the same id (rate limit) */gapMs?:number;/** voices/important cues: higher wins */priority?:number;/** preloaded right after unlock (small, needed at once) */critical?:boolean}
const d=(id:string,dir:string,bus:Bus,gain:number,o:Partial<SoundDef>={}):SoundDef=>({id,dir,bus,gain,...o});
export const SOUNDS:SoundDef[]=[
 d('amb_spooky_graveyard_loop','ambient','music',.5,{loop:true,critical:true}),d('amb_bonus_chest_loop','ambient','music',.5,{loop:true}),
 d('ui_click','ui','sfx',.5,{gapMs:60,critical:true}),d('ui_confirm','ui','sfx',.55,{gapMs:120,critical:true}),d('ui_cancel','ui','sfx',.5,{gapMs:120,critical:true}),d('ui_bet_change','ui','sfx',.45,{gapMs:50,critical:true}),d('ui_error','ui','sfx',.55,{gapMs:300,critical:true}),
 d('reel_start','reels','sfx',.5,{gapMs:200,critical:true}),d('reel_tick','reels','sfx',.22,{gapMs:130,critical:true}),d('reel_stop','reels','sfx',.55,{gapMs:70,critical:true}),
 d('anticipation_scatter','reels','sfx',.6,{gapMs:400,priority:2}),d('anticipation_chest','reels','sfx',.6,{gapMs:400,priority:2}),
 d('cash_coin','wins','sfx',.5,{gapMs:90,critical:true}),d('cash_drop','wins','sfx',.55,{gapMs:300,critical:true}),d('win_small','wins','sfx',.55,{gapMs:300,critical:true}),d('win_big','wins','sfx',.7,{gapMs:500,priority:2}),d('win_max','wins','sfx',.85,{gapMs:1000,priority:3}),
 d('scatter_trigger','bonus','sfx',.75,{priority:2}),d('chest_trigger','bonus','sfx',.75,{priority:2}),d('dual_trigger','bonus','sfx',.8,{priority:3}),d('chest_open','bonus','sfx',.6,{gapMs:150}),
 d('chest_reveal_x1','bonus','sfx',.7,{priority:2}),d('chest_reveal_x2','bonus','sfx',.75,{priority:2}),d('chest_reveal_x5','bonus','sfx',.85,{priority:3}),d('free_spin_retrigger','bonus','sfx',.7,{priority:2}),d('bonus_complete','bonus','sfx',.65,{priority:2}),
 d('baby_skull_happy','voice','voice',.8,{priority:1}),d('baby_skull_scared','voice','voice',.8,{priority:2}),d('baby_skull_angry','voice','voice',.8,{priority:1}),d('baby_skull_searching','voice','voice',.8,{priority:1}),d('baby_skull_win','voice','voice',.85,{priority:2}),
 d('hologram_beam','cinematic','cinematic',.52,{priority:2}),d('skull_land','cinematic','cinematic',.5,{priority:2}),d('skull_run','cinematic','cinematic',.3,{loop:true}),d('skull_fall','cinematic','cinematic',.52,{priority:2}),
];
export const SOUND_BY_ID=new Map(SOUNDS.map(s=>[s.id,s]));
export type SoundId=typeof SOUNDS[number]['id'];
