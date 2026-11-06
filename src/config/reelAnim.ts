/**
 * Reel presentation timing. Presentation only: none of these values can change an outcome, a payout or a probability.
 * The anticipation rule (see reels.ts) looks ONLY at already-revealed reels, so its duration is identical for every outcome of the next reel
 * (hit or miss) — it never lengthens "losing" spins selectively.
 */
export const REEL_ANIM={
 rowsPerSec:19,accelSec:.18,staggerSec:.07,settleSec:.5,
 baseRows:(c:number)=>15+c*4,
 quick:{speed:1.7,settleSec:.3,staggerSec:.03,baseRows:(c:number)=>8+c*2},
 anticipation:{
  enabled:true,
  maxAnticipatedReels:3,      // every reel that can still complete the trigger gets suspense (so the reel that really completes it is never skipped)
  reelScale:[1,.8,.65],       // 1st/2nd/3rd suspense reel of a spin → bounded total extra time (≈ 1.0 + 0.8 + 0.65 s worst case, ≈ 1.0 s typical)
  decelSec:.30,crawlSec:.25,settleSec:.50,crawlRowsPerSec:4.5,
  quickScale:.5,              // Quick Spin (where allowed) halves the suspense phases
  glowRampSec:.55,fadeSec:.35,flashSec:.32,
 },
 carryFadeSec:.18,             // highlights/dim of the grid shown at SPIN time fade while the reels start to move (no instant pop)
};
