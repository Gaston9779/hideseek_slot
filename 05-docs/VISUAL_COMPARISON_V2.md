# Visual rebuild v2 — hybrid 2D/3D (comparison report)
Reference: `reference/slot-concept.png` (main panel). Screenshots: `05-docs/screenshots/final/`.

**Measured/inspected (1920×1080):** logo centred over the frame arches; 5×3 cell rectangles measured from `reel-frame.png` (`assets-2d/frame/cells.json`) and mapped in `src/layout.ts`; HUD value fields measured on `control-panel.png`; Skull (real rigged GLB) stands left-foreground on the panel pillar, not over any control.

| Pass | Finding (screenshot-based) | Fix |
|---|---|---|
| 1 | Logo covered row 1; bg gargoyle duplicated frame gargoyle; spin overlapped bottom row; Skull only head visible, faced wrong way, hidden under panel | frame 0.95→0.88, logo 700→510px, bg cover-crop 1.36 (gargoyle off-screen), panel lowered, Skull above panel, rotation flipped, feet on pillar |
| 2 | Bonus/Free-Spins overlays let HUD bleed through; banner covered the grid; ± buttons too small on phone | dim backdrop layer, compact banner, hit areas ≥46 CSS px |

**Known deviations from the concept:** logo art differs in lettering/mascot from concept ("THE SLOT" banner absent); Skull has no blaster (model has none); 2 aux buttons (auto/turbo) are artwork only — not wired.
**Pre-existing math observation (not changed):** `paytable[s][5]` is `undefined` (arrays have 5 entries) so 5-of-a-kind and 5 scatters pay 0 while the paytable dialog implies a 5× column; reel strips are grouped by symbol so columns often show 3 identical symbols. Reported, not altered.
