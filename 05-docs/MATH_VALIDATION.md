# Math validation

## Visual rebuild addendum

The visual rebuild preserves reel strips and payout evaluation. Browser tests now demonstrate a seeded 40× line win, a three-Scatter trigger and a Free Spin without stake deduction. Eight unit tests pass, including new settlement/reset/retrigger regressions. None of this establishes theoretical RTP or provider readiness.

Code review found a pre-existing defect: paytable arrays have no index 5, while the evaluator indexes them by matched-symbol count. Five-of-a-kind consequently returns zero. This requires a separate math correction/tuning pass and is explicitly not certified or concealed by the graphical rebuild.

The original simulation runner's sandbox/IPC limitation can be avoided by invoking TypeScript via `node --import tsx scripts/simulate.ts`. No new overall RTP result is claimed in this visual milestone.

`npm run simulate -- 1000000` provides a repeatable base-strip Monte Carlo cross-check (seed 20261105). The script reports base multiplier return, hit frequency and scatter rate. It deliberately does not label that output total RTP because it omits recursive Free Spin state rewards.

Unit tests cover deterministic stop generation, substitution, scatters, state locking, accounting and cap bounds. Exact enumeration is not included in this milestone: 111^5 stop combinations and recursive feature state make a compact exact calculation impractical. Actual 96.00% RTP is therefore unverified and must not be represented as certified.
