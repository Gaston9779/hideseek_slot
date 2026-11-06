/**
 * Buy Bonus configuration (presentation + gating only; no pricing math lives here).
 * STATUS: DISABLED. The V3 math package contains no independently validated "bought Chest Bonus" model, so there is no legitimate price.
 * See 05-docs/BUY_BONUS_SPEC.md for what Codex must deliver before `mathValidated` may be set to true.
 */
export const BUY_BONUS={
  /** feature = Hide & Seek chest bonus (never Free Spins in this first implementation) */
  feature:'CHEST_BONUS' as const,
  /** flips to true ONLY with a validated separate math model (price, RTP of the bought mode, distribution, max-win behaviour). */
  mathValidated:false,
  /** price in × total bet, supplied by the validated model; null while unavailable — never invent a number here */
  priceX:null as number|null,
};
