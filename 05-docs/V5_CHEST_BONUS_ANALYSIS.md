# V5 Chest Bonus analysis

The production package generation is Fisher–Yates over `[1,2,5]`; the package is committed before selection. The V5 1m Buy campaign selected positions `[332799,333451,333750]`, χ²=1.418906 (2 df), and observed six package permutations with χ²=2.782904 (5 df). Both are compatible with uniformity; this is simulation evidence, not RNG certification.

| Selected multiplier | Selections | Frequency | Mean base | Mean credited | SD | ≥100× | ≥250× | ≥500× | ≥1000× | Max |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1× | 332,926 | 33.2926% | 48.2280× | 48.2280× | 42.7333× | 8.7677% | 0.4833% | 0.0120% | 0 | 740.2× |
| 2× | 333,943 | 33.3943% | 48.3408× | 96.6817× | 85.2490× | 35.3629% | 4.9640% | 0.4821% | 0.0108% | 1328.5× |
| 5× | 333,131 | 33.3131% | 48.3646× | 241.8230× | 213.7638× | 76.6728% | 35.4083% | 8.8332% | 1.2806% | 4011.5× |

No 5,000× cap hit was observed. `BEST_CHEST_PICK` occurred 333,131 times, exactly the selected ×5 count. Every Buy entered exactly one real Chest state, selected one position via `pickChest()`, and had no accounting failure. Existing deterministic tests cover each position, duplicate pick refusal, snapshot restoration, 12-spin initial state, ×1/×2/×5 €30 reconciliation and cap clipping.

V5 extension caveat: a Chest feature may grow to 48 spins, so “exactly 12” is true only for an unextended package. The 1m Buy run averaged 12.584256 physical spins per purchase. This is correct under the current V4.1 rules and must be reflected in rules/UI wording.
