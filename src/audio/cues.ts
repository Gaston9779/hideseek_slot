import {audio} from './index';
/**
 * Game-event → sound mapping (the ONLY place that knows sound ids). Every cue is presentation-only and fire-and-forget:
 * it never awaits, never throws and cannot change timing, RNG, state or payouts. Priority: max win / big bonuses > voice > triggers & anticipation > reels > UI > ambience.
 */
const VOICES={happy:'baby_skull_happy',scared:'baby_skull_scared',angry:'baby_skull_angry',searching:'baby_skull_searching',win:'baby_skull_win'} as const;
let tickTimer=0;const hold=new Map<string,boolean>();
export const cue={
 // ---- ambience (music bus, crossfaded) ------------------------------------------------------------
 ambientBase(){audio.unduck(1.4);audio.ambient('amb_spooky_graveyard_loop',1.5);},
 ambientChest(){audio.ambient('amb_bonus_chest_loop',1.2);},
 // ---- reels ---------------------------------------------------------------------------------------
 reelStart(){audio.play('reel_start');},
 /** sparse ticks while the reels move (one every ~230 ms, never per frame) */
 reelTicks(on:boolean){if(on){if(tickTimer)return;tickTimer=window.setInterval(()=>{audio.play('reel_tick');},230);}else if(tickTimer){clearInterval(tickTimer);tickTimer=0;}},
 reelStop(){audio.play('reel_stop');},
 /** real suspense only (2 Scatter / 2 Chest Bonus already visible) */
 anticipation(kind:'scatter'|'chest',phase:'start'|'resolve'|'miss'){const id=kind==='scatter'?'anticipation_scatter':'anticipation_chest';if(phase==='start'){hold.set(id,true);audio.play(id);}else if(hold.get(id)){hold.set(id,false);audio.stop(id,phase==='miss'?.35:.12);}},
 // ---- wins (tier comes from the real credited amount; a return at or below the bet is not celebrated) --
 win(tier:'none'|'small'|'medium'|'big'|'mega'|'max'){
  if(tier==='none'||tier==='max')return;
  if(tier==='small'){audio.play('cash_coin',{volume:.7});return;}
  audio.play(tier==='medium'?'win_small':'win_big');audio.play('cash_drop');},
 coinTick(){audio.play('cash_coin');},
 maxWin(){audio.duck(.2,.15);audio.play('win_max');},
 // ---- bonuses -------------------------------------------------------------------------------------
 trigger(kind:'FREE_SPINS'|'CHEST'|'DUAL'){audio.play(kind==='FREE_SPINS'?'scatter_trigger':kind==='CHEST'?'chest_trigger':'dual_trigger');},
 chestOpen(){audio.play('chest_open');},
 chestReveal(multiplier:number){audio.play(multiplier>=5?'chest_reveal_x5':multiplier>=2?'chest_reveal_x2':'chest_reveal_x1');},
 retrigger(){audio.play('free_spin_retrigger');},
 bonusComplete(){audio.play('bonus_complete');},
 // ---- Baby Skull voices (one at a time, cooldown inside the manager; never per spin) ---------------
 voice(kind:'happy'|'scared'|'angry'|'searching'|'win'){audio.play(VOICES[kind]);},
 // ---- 3D cinematic (synchronised with the real phases of the chase) ---------------------------------
 hologramBeam(){audio.duck(.3,.25);audio.play('hologram_beam');},
 skullLand(){audio.play('skull_land');},
 skullRun(on:boolean){if(on)audio.play('skull_run');else audio.stop('skull_run',.3);},
 skullFall(){audio.play('skull_fall');},
 cinematicAbort(){for(const id of ['hologram_beam','skull_land','skull_run','skull_fall','baby_skull_searching','baby_skull_scared'])audio.stop(id,.15);audio.unduck(1.2);},
 cinematicEnd(){audio.stop('skull_run',.2);audio.unduck(1.4);},
 // ---- interface -----------------------------------------------------------------------------------
 click(){audio.play('ui_click');},confirm(){audio.play('ui_confirm');},cancel(){audio.play('ui_cancel');},bet(){audio.play('ui_bet_change');},error(){audio.play('ui_error');},
};
export type Cue=typeof cue;
