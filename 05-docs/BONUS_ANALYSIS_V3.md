# Skull Hunt — Dual Bonus Analysis V3

## Free Spins

Exact trigger frequency is 1/140.3611 paid rounds. The exact mean feature length is 12.61858 physical Free Spins and exact mean feature award is 45.02027× total bet, conditional on triggering. The 100M observations were 12.61551 spins and 44.94201×. Dedicated strips prevent Chest Bonus symbols during Free Spins. Retriggers use 5/8/10 additions and the award counter enforces the 30-spin ceiling.

## Hide & Seek

Exact trigger frequency is 1/3,435.8419. A weighted set and its uniform shuffle are committed during `spin()` before the reel presentation. Selection only reveals and credits one precommitted value. The set expectation is 106.708×; 100M observed selected-prize mean was 107.58020× and cap-adjusted credited mean was 107.55840×, driven by 335 observed top prizes.

The player receives three seconds after the selected prize appears before the other two chests reveal. The non-selected values never affect credits. `BEST PICK` is true only when the chosen committed value equals the set maximum; ties are correctly accepted.

## Simultaneous event

The exact probability of both triggers on the same paid spin is 1/9,387.5084. The engine first credits ordinary base wins and assigns Free Spins, enters Chest state, credits the single pick, then returns to Free Spins. A 5,000× cap hit terminates remaining feature play. The 100M run observed 10,633 simultaneous triggers (1/9,404.6835).

## Interruption safety

Snapshots include math version, pending committed outcome, settlement flag, committed chest state, award counters, accumulated round win, cap state and ledger. Restore refuses another math version. A pending spin settles once; an already selected chest cannot pay twice. Browser state is stored after commit, settlement, pick and close.

Automated engine tests cover invalid/double picks, each position, ties, cap clipping, simultaneous order, 30-spin ceiling, balance conservation and restore. The real browser test covers the full selected-open → selected-reveal → three-second wait → other-reveal → BEST PICK → close lifecycle for both chest-only and simultaneous rounds: [browser QA](data/v3/browser-qa.json).
