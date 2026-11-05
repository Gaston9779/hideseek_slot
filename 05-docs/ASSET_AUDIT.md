# Verified asset audit — visual rebuild

All supplied original files are unchanged. Conversion was performed in Chrome using Three.js FBXLoader and GLTFExporter, with textures awaited before export. `scripts/convert-assets.mjs` is the repeatable conversion entry point. `converted-assets.json` records loader errors, bounds, materials, geometry and animation counts; `release-manifest.json` records exact delivered sizes and hashes.

| Source | Vertices / triangles | Rig / clips | Textures and result |
|---|---:|---|---|
| `models/Skull_Horned_Creature.glb` | 10,332 / 9,513 | 65 joints, zero clips | Three embedded JPEGs: base color, normal, metallic/roughness. Browser loaded and rendered as symbol source. |
| `animations/Skull_Horned_Creature.glb` | 10,332 / 9,513 | 65 joints, zero clips | Byte-identical to the models GLB. Not duplicated in release. |
| `models/Skull_Horned_Creature_Rigged.fbx` | 28,539 / 9,513 | 65 bones; angry_01 3.5s, agree 4s, afraid 2.583333s; each 198 tracks | Base color and normal resolved from supplied `.fbm` texture directory and embedded as PNG in converted GLB. Original FBX roughness/metallic references are present but FBXLoader does not map its ShininessExponent/ReflectionFactor semantics; converted material uses roughness .82 / metallic .08. |
| `models/gothic_mausoleum.fbx` | 48,600 / 16,200 | No bones or clips | Original source JPG absent; original geometry converted using an explicit neutral stone PBR material. Loaded and rendered as environment and Scatter/mausoleum symbols. |
| `models/gargoyle_3d_model.fbx` | 51,945 / 17,315 | No bones or clips | Original source JPG absent; original geometry converted with stone material. Loaded and rendered on right pedestal and as symbol. |
| `models/catgoyle_3d_model.fbx` | 53,418 / 17,806 | No bones or clips | Original source JPG absent; original geometry converted with stone material. Loaded and rendered at left of foreground. |
| `reference/skull-hunt-logo.png` | 1448 × 1086 | N/A | Original PNG copied without alteration and loaded locally. |
| `reference/slot-concept.png` | 1672 × 941 | N/A | Opened and used for comparison; not a runtime background or substituted screenshot. |

FBX vertex counts are non-indexed loader counts, so they are higher than the indexed GLB equivalent even when triangle counts match. The converted scenery GLBs are currently uncompressed; indexing, mesh simplification and KTX2 texture conversion are later optimization opportunities. Shared materials and static mesh batching already reduce draw calls.

## Missing source dependencies

The three scenery FBXs reference JPGs from a Tripo export `.fbm` folder that is not supplied. Exact failing paths are preserved in `converted-assets.json`. They are removed from converted materials, so the production game does not request missing files. Original albedo detail cannot be reproduced from the supplied geometry alone.

No fountain or gate source model is supplied. Those secondary elements are procedural. No independent idle clip is supplied; idle is a small generated two-bone quaternion animation. The original FBX reactions are exported with their own rig, avoiding unverified retargeting between the differently named FBX and GLB skeletons.

## Actual production asset loading

The game loads five GLBs: original static Skull, animated FBX-derived Skull, mausoleum, gargoyle and catgoyle; plus the original logo PNG. All model images are embedded. No external fonts or remote textures are requested. `production-browser.json` records successful requests, scene mesh counts, clips, sampled bone poses and zero console/page errors. Screenshots verify appearance, not just HTTP availability.
