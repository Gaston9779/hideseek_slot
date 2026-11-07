# V5.1 RTP validation

`node --import tsx tools/math/v5-theoretical.ts` gives normal pre-cap `0.960019196086237`; `v5-exact-buy.ts` gives Buy pre-cap `0.960055700682388`.

The rigorous cap-bound artefact is `data/v5_1/cap-state-bound.json`: normal loss <= `0.000004181457980209114` fraction; Buy <= `0.0000005828448107254177`. Thus the normal target is PASS under the stated tolerance. This does not claim the point correction is exact.

Feature state / selection, retriggers, dual ordering and cap behavior are production-engine aligned with `src/engine/game.ts`.
