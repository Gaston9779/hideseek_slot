# Math specification

The demo uses integer cents, 5 virtual reel strips (111 stops each), 3 visible rows and 20 fixed left-to-right paylines. Stops are sampled independently by the adapter RNG; rendering consumes the resulting grid and does not determine outcomes. `SeededRng` is for reproducible tests; `CryptoRng` supplies a browser cryptographic interface for a future authorized integration.

Wins use the defined paytable and substitute Wilds except Scatter. Three or more Scatters anywhere award their scatter pay and trigger 10 Free Spins. In a feature, 3+ Scatters retrigger 5 spins. No more than 30 spins may be awarded during a feature. A line containing a Wild in Free Spins pays 2×. The per-spin win is capped at 5,000× stake. The crate pick UI is intentionally not implemented as a payable bonus.

This is a demonstration model and is **NOT READY FOR PROVIDER**. Target RTP is not claimed as 96%; feature contribution requires a full state-space calculation or a long-run simulation including features before any tuning/certification.
