# V5 UI-to-math consistency (source audit)

| Math ID | Display label | PNG | 3/4/5 line pay | Base counts per reel | FS counts per reel |
|---|---|---|---|---|---|
| MAGIC_BOOK | Magic Book | magic-book.png | 64/254/1035 | 6/6/6/6/6 | 9/9/9/9/9 |
| SKULL | Skull Coin | coin.png | 46/180/729 | 3/3/3/3/3 | 6/6/6/6/6 |
| BLASTER | Sacred Grail | grail.png | 31/118/440 | 3/6/6/6/3 | 6/9/9/9/6 |
| GARGOYLE | Gargoyle | gargoyle.png | 20/73/292 | 6×5 | 9×5 |
| CHEST | Skull Hourglass | hourglass.png | 11/37/150 | 9×5 | 12/9/9/9/12 |
| LANTERN | Skull Lantern | lantern.png | 8/27/106 | 9×5 | 12/9/9/9/12 |
| GHOST | Skull Ghost | ghost.png | 7/19/74 | 12/9/9/9/12 | 12/9/9/9/12 |
| TOMB | Tombstone | tombstone.png | 5/14/53 | 15/12/12/12/15 | 11/8/8/8/11 |
| KEY | Skull Key | key.png | 3/10/38 | 14/12/12/12/14 | 9/6/6/6/9 |
| POTION | Potion | potion.png | 3/9/30 | 15/11/11/11/15 | 6×5 |
| WILD | Wild | wild.png | substitutes | 0/9/9/9/0 | 0/12/12/12/0 |
| SCATTER | Scatter | scatter.png | 3/20/100 total bet | 3×5 | 3×5 |
| CHEST_BONUS | Chest Bonus | chest-bonus.png | no line pay; 3+ trigger | 1×5 | 1×5 |

`SYMBOL_ART`, `symbolUrl`, reel image loading and paytable/help construction all use the same `SymbolId`. All 13 filenames exist and are unique. GRAIL and HOURGLASS are display identities mapped respectively to mathematical IDs `BLASTER` and `CHEST`; they are not new strip/paytable IDs. MAGIC_BOOK is highest at 3/4/5; ordinary Chest art is absent.

Source-tested UI state: Chest READY exposes package multiplier, 12 remaining and zero base win; final state receives base/gross/effective values. Buy price is from `adapter.quote`; final summary is display-only. Snapshot tests cover queued segments/picks and engine fields. **PASS at view-model/source level.** Pixel alignment, visual readability and actual DOM animation timing are **NOT VERIFIED** here because no browser/screenshot run was performed.
