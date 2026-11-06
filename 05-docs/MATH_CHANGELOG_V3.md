# Skull Hunt — Math Changelog V3

Baseline checkpoint: `6caa5cf checkpoint: preserve math v2 before v3 dual bonus`.

## V2 → V3

- Added a dedicated, non-line-paying `CHEST_BONUS` symbol and its supplied transparent production art.
- Replaced the V2 rule “4+ Scatters open the chest” with “3+ Chest Bonus symbols on a base spin”. Scatter now controls Free Spins only.
- Expanded both strip families from 32 to 96 stops. Base strips preserve the V2 cycle and replace one low stop per reel with Chest Bonus; dedicated Free Spin strips exclude it.
- Reweighted chest sets to create an observable 5,000× top event while keeping total RTP at 96.00065%.
- Preserved the 20 paylines, line table, Scatter pays, Free Spin awards/retriggers and ×3 Wild line multiplier.
- Defined simultaneous settlement as base award → Chest Bonus → Free Spins.
- Integrated a complete paid-round 5,000× cap across ordinary wins and both features.
- Connected the existing 3D chest interaction to engine-committed prizes and idempotent accounting; added persistent interruption recovery.
- Restricted deterministic seed/QA forcing and debug evaluation surfaces to development builds. Production output contains neither hook.
- Added independent rational proof, reference evaluator, 1M/10M/100M production-engine simulations, 81 automated tests and real-browser dual-bonus/jackpot QA.
- Added a non-economic, snapshot-safe five-event presentation contract during the final targeted audit; math configuration and RTP are unchanged.

The archived V2 spec, proof, test suite and evidence remain in place for comparison. V3 runtime imports now point explicitly to `src/math/v3`.
