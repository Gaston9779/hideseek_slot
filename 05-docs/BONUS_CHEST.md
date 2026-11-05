# Bonus chest (Hide & Seek) — openable GLB
Test page: `npm run dev` → `/bonus-chest-test.html` (APRI / CHIUDI / RESET, drag to orbit). Not wired into the game.

**Files**: `models/bonus-chest/chest-original.glb` (untouched) → `models/bonus-chest/bonus-chest-animated.glb` (+ copies in `public/bonus-chest/`), `tools/split_chest.py` (reproducible split), `src/bonus-chest/chest.ts` (animation), `src/bonus-chest/chest-test.ts`.

**Original**: 1 mesh, 1 material/texture, 3637 verts / 4548 tris, closed (no inner volume); 39 welded components. The two arched side bands (+ a seam strap) are single components spanning base and lid.
**Blender**: not installed on this machine → split done with numpy (same result type): components classified by seam plane y=0.495; the 3 spanning components clipped at the plane with UV/normal interpolation and capped; the front skull ornament travels with the lid. Texture/material/UVs preserved (same single material, image bytes copied).
**Pivot**: node `Chest_Lid_Pivot` at (0, 0.61, −0.45) (rear hinge knuckles, axis X); lid mesh re-centred on it. Open = rotation.x −105°, 1.5 s easeInOutCubic; close 1.0 s.
**Checks**: closed assembly vs original render diff = only shadow/text pixels (see `closed-vs-original-diff.png`); boundary edges 172 vs 166 in the original (those are the original's own open edges); 0 non-manifold edges; no missing texture; screenshots from front/back/side/low at 0, 45%, 100%.
**Known limits**: the original base top and lid underside carry unpainted UV "scribble" (hidden when closed), so two lining planes (dark crimson/gold gradient) are added inside the opening and under the lid. If you want that interior modelled/painted properly, it needs a manual hollowing + texture pass (Blender).
