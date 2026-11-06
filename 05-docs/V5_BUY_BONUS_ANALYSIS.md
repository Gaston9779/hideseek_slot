# V5 Buy Bonus analysis

Buy is engine-owned: `buyChestBonus()` validates `ready` state and balance, debits once, commits a package permutation and enters `chest`. `GameBuyBonusAdapter` guards concurrent purchases; tests cover repeated activation, insufficient funds and active-round refusal. Supported stake costs are exact integer cents: 20→2680, 40→5360, 100→13400, 200→26800, 500→67000. No rounding variation occurs.

The exact V5 pre-cap analysis yields EV 128.6474638914× and Buy RTP 96.0055700682% at 134×. The actual 1m-purchase simulation gives 96.1949808209%, CI95 [95.9636240325%, 96.4263376092%], which contains the exact pre-cap value. Its denominator is the actual 134× purchase cost, never base stake.

Status: atomicity/accounting/selection **PASS**; exact capped Buy RTP **NOT VERIFIED** because the V5 cap distribution is not solved. The Buy price’s source comment mentions an earlier simulation but no corresponding current-V5 proof was found; this report supersedes that unsupported statement.
