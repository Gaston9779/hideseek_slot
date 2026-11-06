# V5 feature state model

Source: `src/engine/game.ts`, `src/math/v4/spin.ts`, `src/math/v4/config.ts`, configuration hash recorded in the V5 audit. This describes the implemented pre-cap state machine.

| Current state | Random event / probability source | Award and state mutation | Next state |
|---|---|---|---|
| `ready` base | one independent 96-stop draw/reel | debit one bet; evaluate base lines/Scatter; create committed Chest permutation iff base Chest count ≥3 | `spinning` then settle |
| base settle | Scatter <3, Chest <3 | credit base payout only | `ready` |
| base settle | Scatter ≥3, Chest <3 | credit base; start Scatter with 12/15/20 spins by 3/4/5 Scatter | Scatter `free-spins` |
| base settle | Scatter <3, Chest ≥3 | credit base; commit 1/2/5 permutation | `chest` pick |
| base settle | Scatter ≥3, Chest ≥3 | credit base; commit Chest; queue Scatter | `chest`, then Chest, then queued Scatter |
| `chest` pick | player position; permutation uniformly Fisher–Yates | one committed multiplier revealed; no immediate money credit | Chest FS, or append to Scatter when `inFeature` |
| Chest FS | each FS 96-stop draw; 3+ Scatter | credit current base spin × selected multiplier; append 6, max awarded 48 | Chest FS |
| Chest FS | each FS 96-stop draw; 3+ Chest | credit current base spin × selected multiplier; append 12 at same multiplier, max awarded 48 | Chest FS |
| Chest FS | no extension and remaining 0 | complete Chest; start queued base-Dual Scatter if any | Scatter or `ready` |
| Scatter FS | 3+ Scatter | credit current segment multiplier; append +5/+8/+10 constrained by engine’s awarded-spin formula | Scatter FS |
| Scatter FS | 3+ Chest, picks <3 | credit current segment; pause for genuine Chest pick | `chest` with `inFeature` |
| in-feature pick close | uniform player position on committed permutation | append 12-spin segment at selected 1/2/5; retain existing queue/current segment | Scatter FS |
| Scatter FS | remaining 0, no pending pick | complete | `ready` |
| any feature/base | cumulative credited units reaches 100,000 | clip current credit, emit `MAX_WIN`, discard all future spins/features | `ready` |

FS strip special probabilities come from exact window convolution. A feature grid can have 3+ Scatter or 3+ Chest, but not both: inserted Chest positions are isolated from Scatter in each reel, and five reels cannot contribute six special cells. Base duals remain possible and have exact probability 0.0001065245381108.

## DP state representation

Chest is finite state `(played, awarded, multiplier)`, starting `(0,12,m)` and capped at 48 awarded. Scatter is finite acyclic state `(played, awarded, currentMultiplier, segmentLeft, queuedSegments, chestPicks)`, starting `(0, initial,1,initial,[],0)`. `played` always increases, while awarded is bounded by the implementation, so the recursion has no cycle. Each state rewards one independent feature-spin EV multiplied by its active segment multiplier. This is valid even though trigger and spin payout are correlated: whether a *future* spin exists is determined only by prior outcomes (Wald/occupancy argument).
