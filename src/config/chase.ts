/** Seeker chase cinematic — configuration. Presentation only. The chase is started EXCLUSIVELY by confirmed bonus events (see chase/bonusCinematic.ts); there is no random or spin-count trigger. */
export const CHASE={
 speed:1.25,                       // story-time multiplier (timeline in director.ts is 7.0 s story time → ≈5.6 s real)
 seekerHeightRatio:1.1,            // seeker = 110 % of the original Skull height
};
/**
 * Holographic arrival of the Seeker (presentation only). Durations are story seconds (÷ CHASE.speed for real time:
 * at 1.25 → beam ≈0.45 s, materialise ≈0.7 s, descent ≈0.45 s, landing ≈0.28 s).
 * The landing x mirrors the original Skull's plinth across the machine (x = designWidth − SKULL_ANCHOR.x), the feet go on the same stone level.
 */
export const HOLO_INTRO={beam:.56,materialize:.88,descent:.56,land:.35,hoverPx:300,beamWidthPx:150,particles:{desktop:44,reduced:18}};
export const HOLO_INTRO_TOTAL=HOLO_INTRO.beam+HOLO_INTRO.materialize+HOLO_INTRO.descent+HOLO_INTRO.land;
