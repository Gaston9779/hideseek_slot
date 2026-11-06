# V5 bug register

| ID | Severity | Finding | Impact | Status |
|---|---|---|---|---|
| V5-MATH-01 | Critical release blocker | `tools/math/v4/exact.ts` explicitly models old feature rules and is still used by a passing test as a V4.1 baseline. It excludes V4.1 extensions, nested picks and queued multiplier segments. | No valid exact normal V5 RTP/cap correction; prior V4 RTP documents do not apply. | Open; do not retune silently. |
| V5-MATH-02 | High release blocker | V5 10m normal MC is 96.56985%, CI95 96.11842–97.02128, while the target is approximately 96%; no matching V5 theoretical model exists. | Cannot declare normal RTP target met. | Open; build exact/independent V5 state-space model and run larger independent MC. |
| V5-MATH-03 | High release blocker | V4 cap bound/enumeration assumes old 32-cycle/no-extension feature law. | Exact cap probability and capped RTP are unproven for V5. | Open. |
| V5-DOC-01 | Medium | Current config comment claims historical Buy calibration but no current source-hashed V5 evidence is attached. | Misleading audit trail, not an identified runtime debit bug. | Replaced by V5 exact pre-cap evidence; source comment should be reviewed by math owner. |
| V5-UI-01 | Medium verification gap | No visual browser audit was run in this task. | Source/UI model consistency is not a pixel-perfect acceptance. | Open / external manual QA. |

No runtime duplicate debit, duplicate settlement, lost base dual feature, package mutation, or accounting-conservation failure was found in the audited campaigns. No production math, RNG, strips or payout table was changed by this audit.
