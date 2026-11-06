# Gameplay UI & bonus polish (presentation only — math V3 untouched)

## 1. Symbol change (visual identity only)
| Math ID | Before | Now | Paytable / frequency |
|---|---|---|---|
| `CHEST` (ordinary pay symbol) | gold/brown skull chest (`chest.png`) | **Gothic Magic Book** — purple hooded-skull spellbook (`assets-2d/symbols/magic_book.png` → `exported/magic-book.png`, 512 px) | unchanged (14/48/200 line units, same strip counts) |
| `CHEST_BONUS` (Hide & Seek trigger) | red & gold horned-skull chest | unchanged | unchanged |
| `MAUSOLEUM` | red skull spellbook | unchanged | unchanged |
All 12 sheet symbols were already assigned, so the user-supplied `magic_book.png` was the only unique asset; it is purple, front-facing, with a hooded skull, clearly different from the red `MAUSOLEUM` book and from every chest. The ID `CHEST` was kept so the math hash, strips and paytable are unchanged; only `SYMBOL_ART.CHEST` (file + label "Gothic Magic Book") changed — paytable dialog, legend and reels read it from there. `chest.png` remains on disk, unused.

## 2. Free Spins UI
`src/ui/gameplayUi.ts`: top-right HUD "FREE SPINS · GIRI RIMANENTI · VINCITA BONUS · GIRO k/N" (over the sky: no symbols/logo/Skull/controls), retrigger toast `+X FREE SPINS`, and an end-of-feature summary on the approved Free Spins art with CONTINUA. Numbers: remaining/awarded from the engine (`game.freeSpins`, `featureAwarded`), bonus win = sum of the credited cents returned by `settle()` for free spins (equals `ledger.paid` delta; verified in browser), spins played = completed spins. The summary never credits.

## 3. Quick Spin (⚡)
`#quick` is a transparent hit area exactly on the button drawn in `control-panel.png` (ring 1228–1314 × 911–996 design px, verified: hitbox 86×86 at (1228,910)). OFF/ON (gold halo)/hover/press/tooltip; ON only shortens the reel animation (`reels.spin(outcome, quick)`): outcome, payouts and RNG are untouched, mandatory bonus screens remain, spins cannot overlap. State remembered per viewer. Disabled and non-activatable where the market profile has `quickSpin:false` (UK profile). Not autoplay.

## 4. Buy Bonus
See `BUY_BONUS_SPEC.md`: **UI READY · MATH NOT VERIFIED · DISABLED**; hidden entirely in the UK profile.
