/** Cosmetic "Seeker chase" easter egg — configuration. Purely presentational: never reads or influences outcomes, balance, bet, RTP or volatility. */
export const CHASE={
 chaseEnabled:true,
 minSpins:12,maxSpins:25,          // completed spins before the gag becomes due (random, cosmetic RNG only)
 cooldownMs:120_000,               // minimum time between two gags
 settleMs:1800,                    // the game must have been idle this long (win celebrations etc. finished)
 duration:6.6,                     // seconds, informational (timeline is in director.ts)
 seekerHeightRatio:1.1,            // seeker = 110 % of the original Skull height
};
