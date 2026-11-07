import {readFileSync,writeFileSync} from 'node:fs';
import * as T from 'three';

const source='models/skull_seeker/Skull_Horned_Creature_PBR.glb';
const animationSource='public/assets/scenery/Skull_Horned_Creature_Rigged.pre-pbr.glb';
const output='public/assets/scenery/Skull_Horned_Creature_PBR_Animated.glb';
const pad=n=>(n+3)&~3;
function read(path){const b=readFileSync(path),l=b.readUInt32LE(12),e=20+l;return {j:JSON.parse(b.subarray(20,e)),bin:b.subarray(e+8,e+8+b.readUInt32LE(e))};}
function glb(j,bin){const text=Buffer.from(JSON.stringify(j)),jp=Buffer.alloc(pad(text.length)-text.length,32),bp=Buffer.alloc(pad(bin.length)-bin.length),size=12+8+text.length+jp.length+8+bin.length+bp.length,out=Buffer.alloc(size);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(size,8);out.writeUInt32LE(text.length+jp.length,12);out.writeUInt32LE(0x4e4f534a,16);text.copy(out,20);jp.copy(out,20+text.length);const q=20+text.length+jp.length;out.writeUInt32LE(bin.length+bp.length,q);out.writeUInt32LE(0x004e4942,q+4);bin.copy(out,q+8);return out;}
function accessor(g,i){const a=g.j.accessors[i],v=g.j.bufferViews[a.bufferView],o=(v.byteOffset??0)+(a.byteOffset??0),n={SCALAR:1,VEC3:3,VEC4:4}[a.type];if(a.componentType!==5126||v.byteStride)throw Error(`Unsupported animation accessor ${i}`);return {a,n,data:new Float32Array(g.bin.buffer,g.bin.byteOffset+o,a.count*n)};}
function rest(nodes,i){const n=nodes[i];return {p:new T.Vector3(...(n.translation??[0,0,0])),q:new T.Quaternion(...(n.rotation??[0,0,0,1])),s:new T.Vector3(...(n.scale??[1,1,1]))};}
const fresh=read(source),old=read(animationSource),newNodes=fresh.j.nodes,oldNodes=old.j.nodes;
const targetByName=new Map(newNodes.map((n,i)=>[n.name,i]));
let bin=Buffer.from(fresh.bin);fresh.j.bufferViews??=[];fresh.j.accessors??=[];
function append(data,type){const at=pad(bin.length);bin=Buffer.concat([bin,Buffer.alloc(at-bin.length),Buffer.from(data.buffer,data.byteOffset,data.byteLength)]);const bv=fresh.j.bufferViews.push({buffer:0,byteOffset:at,byteLength:data.byteLength})-1;return fresh.j.accessors.push({bufferView:bv,componentType:5126,count:data.length/{SCALAR:1,VEC3:3,VEC4:4}[type],type})-1;}
const animations=[];
for(const clip of old.j.animations??[]){const samplers=[],channels=[];for(const channel of clip.channels){const srcSampler=clip.samplers[channel.sampler];if((srcSampler.interpolation??'LINEAR')!=='LINEAR')throw Error(`Unsupported ${srcSampler.interpolation} interpolation`);const oldNode=oldNodes[channel.target.node],newNode=targetByName.get(oldNode.name.replace(/^mixamorig(?=[A-Z])/,'mixamorig:'));
 if(newNode===undefined)throw Error(`No matching PBR bone for ${oldNode.name}`);const input=accessor(old,srcSampler.input),out=accessor(old,srcSampler.output),path=channel.target.path;let values=new Float32Array(out.data);
 if(path==='rotation'){const a=rest(oldNodes,channel.target.node),b=rest(newNodes,newNode),delta=b.q.clone().multiply(a.q.clone().invert());for(let i=0;i<values.length;i+=4){const q=new T.Quaternion(values[i],values[i+1],values[i+2],values[i+3]).premultiply(delta).normalize();values.set([q.x,q.y,q.z,q.w],i);}}
 if(path==='scale'){const a=rest(oldNodes,channel.target.node),b=rest(newNodes,newNode);for(let i=0;i<values.length;i+=3)values.set([values[i]*b.s.x/a.s.x,values[i+1]*b.s.y/a.s.y,values[i+2]*b.s.z/a.s.z],i);}
 const si=samplers.push({input:append(new Float32Array(input.data),'SCALAR'),output:append(values,out.a.type),interpolation:'LINEAR'})-1;channels.push({sampler:si,target:{node:newNode,path}});
 }animations.push({name:clip.name,samplers,channels});}
fresh.j.buffers[0].byteLength=bin.length;fresh.j.animations=animations;writeFileSync(output,glb(fresh.j,bin));
console.log(JSON.stringify({output,mesh:fresh.j.meshes[0].primitives[0].attributes,material:fresh.j.materials[0],joints:fresh.j.skins[0].joints.length,animations:animations.map(a=>({name:a.name,channels:a.channels.length}))},null,2));
