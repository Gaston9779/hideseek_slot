# Math specification

The demo uses integer cents, 5 virtual reel strips (111 stops each), 3 visible rows and 20 fixed left-to-right paylines. Stops are sampled independently by the adapter RNG; rendering consumes the resulting grid and does not determine outcomes. `SeededRng` is for reproducible tests; `CryptoRng` supplies a browser cryptographic interface for a future authorized integration.

Wins use the defined paytable and substitute Wilds except Scatter. Three or more Scatters anywhere award their scatter pay and trigger 12 Free Spins. In a feature, 3+/4+/5+ Scatters retrigger 5/8/10 spins. No more than 30 spins may be awarded during a Scatter feature. Chest packages award 12 Free Spins at their committed ×1, ×2 or ×5 multiplier. The round cap is 5,000× stake.

This is a demonstration model and is **NOT READY FOR PROVIDER**. Target RTP is not claimed as 96%; feature contribution requires a full state-space calculation or a long-run simulation including features before any tuning/certification.
