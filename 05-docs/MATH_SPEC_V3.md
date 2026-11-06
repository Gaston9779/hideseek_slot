# Skull Hunt — Math Specification V3

Status: implemented math model `3.0.0` · configuration hash `da885592c42997c45058c61a08327dc008e2744ac9e9e3e6740939fa32789aba`

## Game model

- Five reels, three visible rows, 20 fixed paylines; wins read left to right from reel 1.
- Total bet is divided into 20 integer line units. Supported total bets are 20, 40, 100, 200 and 500 cents.
- Line pays in line-bet units for 3/4/5: Skull 60/240/1000, Blaster 40/160/600, Gargoyle 26/95/400, Mausoleum 20/75/300, Chest 14/48/200, Lantern 10/36/150, Ghost 9/26/100, Tomb 7/19/70, Key 5/14/50, Potion 5/12/40.
- Wild appears on reels 2–4, substitutes for line symbols only, has no own pay, and never substitutes Scatter or Chest Bonus.
- Scatter pays 3×/20×/100× total bet for 3/4/5 anywhere.
- Maximum credited win for the complete paid round, including all features, is 5,000× total bet.

## Reel strips

Base and Free Spins use five explicit 96-stop strips in [strips.ts](../src/math/v3/strips.ts). Base strips preserve the V2 32-stop cycle three times, replacing one low symbol per reel with `CHEST_BONUS` at zero-based stops 9, 12, 13, 15, 15. Free Spin strips repeat the dedicated V2 Free Spin cycle and contain no Chest Bonus. Tests pin the complete data, not merely counts.

## Free Spins

Three, four or five Scatters on a base spin award 12, 15 or 20 Free Spins. Three, four or five Scatters during the feature add 5, 8 or 10 spins, with at most 30 spins awarded per feature. Any line win containing a Wild is multiplied once by 3. Scatter wins are not multiplied.

## Hide & Seek Chest Bonus

Three or more visible `CHEST_BONUS` symbols on a base spin trigger the bonus. The symbol has no line or scatter pay and cannot appear in Free Spins. One weighted prize set is drawn and shuffled before presentation; exactly one committed prize is credited after the player selects a chest.

| Weight / 10,000 | Committed set (× total bet) |
|---:|---|
| 7,260 | 10, 24, 40 |
| 2,000 | 30, 60, 120 |
| 400 | 100, 250, 500 |
| 340 | 100, 500, 5,000 |

The unconditional mean selected prize per trigger is 106.708×. Shuffling makes all three screen positions identical in expectation.

## Resolution order and cap

For simultaneous triggers the immutable order is: base line/scatter award → Hide & Seek pick → Free Spins. The cap applies to the accumulated paid round. Reaching 5,000× clips the current credit to remaining room and terminates unplayed features. Outcomes and chest prizes are committed before animation; settlement and selection are idempotent and persisted across reload.

The production source of truth is [config.ts](../src/math/v3/config.ts); this document is descriptive and must not override it.
