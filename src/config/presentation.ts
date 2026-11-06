/** Presentation tiers derived ONLY from the real credited amount relative to the round's bet (never invented by animation).
 *  none = loss · small = positive return not above the bet (a net loss: no celebration) · medium = net win · big ≥20× · mega ≥100× · max = round win cap reached. */
export const WIN_TIERS = { big: 20, mega: 100 } as const;
export type WinTier = 'none' | 'small' | 'medium' | 'big' | 'mega' | 'max';
export function tierFor(multiplier: number, capped = false): WinTier {
  if (multiplier <= 0) return 'none';
  if (capped) return 'max';
  if (multiplier >= WIN_TIERS.mega) return 'mega';
  if (multiplier >= WIN_TIERS.big) return 'big';
  if (multiplier > 1) return 'medium';
  return 'small';
}
/** Symbol-art mapping. Math IDs and payouts are untouched; only the artwork shown per ID is chosen here. */
export const SYMBOL_ART: Record<string, { file: string; label: string }> = {
  // 13 symbols of assets-2d/symbols/symbols-sheet.png. Math IDs, strips and paytable are V4 and untouched; only art + label are chosen here.
  // The two sheet symbols without a dedicated V4 id take over the ids whose old art was retired, keeping each id's pay rank:
  //   BLASTER (3rd highest ordinary, old "Ghost Tombstone") → Sacred Grail · CHEST (5th, old Treasure Chest) → Skull Hourglass.
  MAGIC_BOOK: { file: 'magic-book', label: 'Magic Book' },
  SKULL: { file: 'coin', label: 'Skull Coin' },
  BLASTER: { file: 'grail', label: 'Sacred Grail' },
  GARGOYLE: { file: 'gargoyle', label: 'Gargoyle' },
  CHEST: { file: 'hourglass', label: 'Skull Hourglass' },
  LANTERN: { file: 'lantern', label: 'Skull Lantern' },
  GHOST: { file: 'ghost', label: 'Skull Ghost' },
  TOMB: { file: 'tombstone', label: 'Tombstone' },
  KEY: { file: 'key', label: 'Skull Key' },
  POTION: { file: 'potion', label: 'Potion' },
  WILD: { file: 'wild', label: 'Wild' },
  SCATTER: { file: 'scatter', label: 'Scatter' },
  CHEST_BONUS: { file: 'chest-bonus', label: 'Chest Bonus' },
};
