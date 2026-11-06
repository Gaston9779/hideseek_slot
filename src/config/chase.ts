/** Seeker chase cinematic — configuration. Presentation only. The chase is started EXCLUSIVELY by confirmed bonus events (see chase/bonusCinematic.ts); there is no random or spin-count trigger. */
export const CHASE={
 speed:1.25,                       // story-time multiplier (timeline in director.ts is 7.0 s story time → ≈5.6 s real)
 seekerHeightRatio:1.1,            // seeker = 110 % of the original Skull height
};
