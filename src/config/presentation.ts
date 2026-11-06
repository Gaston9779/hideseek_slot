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
  TOMB: { file: 'tombstone', label: 'Tombstone' },
  WILD: { file: 'wild', label: 'Wild Skull' },
  LANTERN: { file: 'lantern', label: 'Lantern' },
  CHEST: { file: 'magic-book', label: 'Gothic Magic Book' },   // ID unchanged (math untouched); art changed so it can never be confused with CHEST_BONUS
  POTION: { file: 'potion', label: 'Purple Potion' },
  GHOST: { file: 'ghost', label: 'Blue Ghost' },
  KEY: { file: 'key', label: 'Golden Key' },
  MAUSOLEUM: { file: 'book', label: 'Skull Spellbook' },
  SCATTER: { file: 'scatter', label: 'Crypt Scatter' },
  SKULL: { file: 'coin', label: 'Skull Coin' },
  GARGOYLE: { file: 'gargoyle', label: 'Gargoyle' },
  BLASTER: { file: 'ghost-tomb', label: 'Ghost Tombstone' },
  CHEST_BONUS: { file: 'chest-bonus', label: 'Chest Bonus' },
};
