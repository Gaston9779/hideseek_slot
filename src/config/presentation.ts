/** Presentation-only configuration: win tiers (multiples of total bet) used purely to pick a celebration. */
export const WIN_TIERS = { medium: 5, big: 15, mega: 50, max: 200 } as const;
export type WinTier = 'none' | 'small' | 'medium' | 'big' | 'mega' | 'max';
export function tierFor(multiplier: number, capped = false): WinTier {
  if (multiplier <= 0) return 'none';
  if (capped || multiplier >= WIN_TIERS.max) return 'max';
  if (multiplier >= WIN_TIERS.mega) return 'mega';
  if (multiplier >= WIN_TIERS.big) return 'big';
  if (multiplier >= WIN_TIERS.medium) return 'medium';
  return 'small';
}
/** Symbol-art mapping. Math IDs and payouts are untouched; only the artwork shown per ID is chosen here. */
export const SYMBOL_ART: Record<string, { file: string; label: string }> = {
  TOMB: { file: 'tombstone', label: 'Tombstone' },
  WILD: { file: 'wild', label: 'Wild Skull' },
  LANTERN: { file: 'lantern', label: 'Lantern' },
  CHEST: { file: 'chest', label: 'Treasure Chest' },
  POTION: { file: 'potion', label: 'Purple Potion' },
  GHOST: { file: 'ghost', label: 'Blue Ghost' },
  KEY: { file: 'key', label: 'Golden Key' },
  MAUSOLEUM: { file: 'book', label: 'Skull Spellbook' },
  SCATTER: { file: 'scatter', label: 'Crypt Scatter' },
  SKULL: { file: 'coin', label: 'Skull Coin' },
  GARGOYLE: { file: 'gargoyle', label: 'Gargoyle' },
  BLASTER: { file: 'ghost-tomb', label: 'Ghost Tombstone' },
};
