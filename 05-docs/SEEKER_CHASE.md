# Seeker Chase — cosmetic 3D easter egg

Purely presentational. No import of math/engine code except the `SeededRng` class (own instance, own seed) for the cosmetic countdown. Config: `src/config/chase.ts` (`chaseEnabled, minSpins 12, maxSpins 25, cooldownMs, settleMs, duration, seekerHeightRatio 1.1`).

## Models (inspected)
| | Skull (original) | Seeker (new) |
|---|---|---|
| File | `public/assets/scenery/Skull_Horned_Creature_Rigged.glb` | `models/skull_seeker/tripo_convert_dc0a1115-….glb` → `public/assets/scenery/Skull_Seeker.glb` (copy, original untouched) |
| Skeleton | 65 Mixamo joints (`mixamorig*`) | same 65 joints (`mixamorig:*`, names sanitised to the same by three) |
| Clips | `angry_01`, `agree`, `afraid` | **none** |
| Rest pose | arms down, faces +Z | blaster arm held forward, left arm out, faces +Z; blaster skinned to the right hand |
| Height | ≈ 1.0 (normalised to 285 px) | 0.9995 (normalised to 313.5 px = 110 %) |
The seeker has no clips and its rest pose differs from the Skull's (arm positions), so the Skull's absolute-local quaternion tracks cannot be retargeted without distorting the pose. All seeker motion (and Skull run/panic/brake) is procedural; only `afraid` is played from the real clip (Skull alert) through an `AnimationMixer`, crossfaded with the procedural layer.

## Rendering / occlusion
One extra transparent canvas (`#chase`, z 5) over the 1920×1080 design space, updated from the existing main loop (no extra rAF). Two invisible alpha-tested planes at z=0 reproduce the exact silhouettes of the frame and panel PNGs (depth only). Front lane z=+250 draws over them; back lane z=−250 is hidden wherever the machine/ledge art is opaque. SPIN is protected by a CSS mask hole on the canvas. Reels are covered only while a character crosses in the front lane (≈1 s each).

## Sequence (6.6 s)
Seeker enters from the right (run, blaster forward) → scans → Skull alerts (clip `afraid`, hop with squash/stretch), panics, flees left → steps behind the machine → hidden crossing → Seeker follows ~0.6 s later → Skull pops out right, spins, dashes home along the plinth, brakes, settles to the exact home position/yaw/scale and hands over to the real Skull → Seeker emerges right, trips, tumbles on a ballistic arc (1.2 rotations) and exits right.

## Debug (DEV only, stripped from production)
`window.__debugSkullChase()` start · `__debugSkullChaseReset()` abort/restore · `__debugSkullChaseAt(t)` frame-accurate render.
