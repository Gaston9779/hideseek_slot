# BUY BONUS — status and hand-off to the math owner (Codex)

**Status: UI READY · MATH NOT VERIFIED · DISABLED.** The V3 package (`MATH_SPEC_V3.md`, `RTP_VALIDATION_V3.md`, `src/math/v3`) contains no independently validated "bought Chest Bonus" mode, so there is no legitimate price. No price is shown or charged; the control opens a confirmation dialog whose CONFERMA is disabled ("PROSSIMAMENTE · NON DISPONIBILE").

## What exists (presentation only)
- `src/ui/buyBonusWidget.ts` — original 3D chest (same GLB as the bonus screen) on the lower-right plinth, clear of reels / SPIN / BET / BALANCE / WIN / MENU (checked numerically in browser); idle bob, gold glow, hover highlight; click opens the dialog; hover never opens anything; hidden while a bonus cinematic runs (no overlap with the Seeker).
- `src/engine/buyBonus.ts` — `BuyBonusAdapter { quote(bet), purchase() }`; `DisabledBuyBonusAdapter` returns `available:false` and `purchase()` never touches balance, RNG or reels.
- `src/config/buyBonus.ts` — `mathValidated:false`, `priceX:null` (never a made-up number).
- `src/config/markets.ts` — `buyBonus` per market; **UK profile = false → the widget is not rendered at all.** Other markets must be opted in explicitly.

## What the math owner must deliver before `mathValidated` can become true
1. **Separate model for the purchased feature** (Chest Bonus only; not Free Spins unless a distinct model is validated): the purchased round enters the chest game directly, so it must NOT use the base-game trigger distribution. Define the committed prize-set distribution for purchased rounds (may differ from the organic one).
2. **Price**: exact rational `priceX` (× total bet) derived from the exact expected value of the purchased feature and the target RTP of the buy mode (document RTP, not just EV × arbitrary factor). Document the RTP of the mode, SD, win distribution, tail probabilities and Max Win behaviour (5,000× cap, forfeits, interaction with the 5,000× prize set), plus a cap-bound like `tools/math/v3/cap-bound.ts`.
3. **Atomic engine operation** `SlotGame.buyChestBonus()`: in one step validate phase `ready`, balance ≥ price, debit price, draw and COMMIT the chest round (single RNG draw), set phase `chest`, emit a new event (e.g. `BONUS_PURCHASED` with `roundId`, `spinNo`, `priceX`), snapshot-safe, idempotent (second call rejected), conservation `balance = start − wagered + paid` extended (price counts as wagered).
4. **Rules**: no symbols forced on reels; no bypass of the organic trigger; bet-change/phase guards; interruption/restore tests; double-click test; insufficient-credit test.
5. **Config**: per-market enable flag stays authoritative (UK and any prohibiting market = off). Version bump + `MATH_HASH` + changelog as for any math change.
6. Replace `DisabledBuyBonusAdapter` by an adapter wrapping that operation; set `BUY_BONUS.mathValidated=true`, `priceX` from the model; the UI then shows `N× BET` and enables CONFERMA with no other UI change.
