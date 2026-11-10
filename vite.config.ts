import {defineConfig,type Plugin} from 'vite';
import {rmSync} from 'node:fs';
// Source-only model variants (inputs of scripts/build-animated-pbr-skull.mjs). They are never requested at runtime, so they are not shipped.
const SOURCE_ONLY=['assets/scenery/Skull_Horned_Creature_Rigged.pre-pbr.glb','assets/scenery/Skull_Horned_Creature_PBR_Animated.glb'];
const dropSourceOnly=():Plugin=>({name:'drop-source-only-assets',apply:'build',closeBundle(){for(const f of SOURCE_ONLY)rmSync(`dist/${f}`,{force:true});}});
export default defineConfig({base:'./',plugins:[dropSourceOnly()]});
