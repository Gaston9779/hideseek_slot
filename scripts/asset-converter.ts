import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
export async function convert(name:string){
 const errors:string[]=[]; const manager=new THREE.LoadingManager();manager.onError=url=>errors.push(url);const texturesReady=new Promise<void>(resolve=>{manager.onLoad=()=>resolve();});
 manager.setURLModifier(url=>url.includes('skull_helmet_character')?`/textures/Skull_Horned_Creature_Rigged.fbm/${url.split(/[\\/]/).pop()}`:url);
 const root=await new FBXLoader(manager).loadAsync(`/models/${name}.fbx`);await texturesReady;
 // Wait for embedded texture decode before serialization.
 const images:Promise<unknown>[]=[];let vertices=0,triangles=0,bones=0;const materials:unknown[]=[];
 root.traverse(o=>{if(o instanceof THREE.Bone)bones++;if(o instanceof THREE.Mesh){vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const mat of (Array.isArray(o.material)?o.material:[o.material])){const m=mat as THREE.MeshPhongMaterial;materials.push({name:m.name,color:m.color.getHexString(),map:m.map?.name,normalMap:m.normalMap?.name});for(const t of [m.map,m.normalMap])if(t?.image?.decode)images.push(t.image.decode().catch(()=>null));}o.castShadow=true;o.receiveShadow=true;}});
 await Promise.all(images);
 root.traverse(o=>{if(o instanceof THREE.Mesh){const old=Array.isArray(o.material)?o.material:[o.material];const replacement=old.map(m=>{const p=m as THREE.MeshPhongMaterial;const valid=(t:THREE.Texture|null)=>t?.image?.width>0?t:null;return new THREE.MeshStandardMaterial({name:p.name,map:valid(p.map),normalMap:valid(p.normalMap),color:valid(p.map)?0xffffff:0x82778d,roughness:.82,metalness:.08,side:THREE.DoubleSide});});o.material=Array.isArray(o.material)?replacement:replacement[0];}});
 const bounds=new THREE.Box3().setFromObject(root);
 const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:root.animations}) as ArrayBuffer;
 return {data:Array.from(new Uint8Array(data)),audit:{name,vertices,triangles,bones,materials,clips:root.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.length})),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},errors}};
}
