import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {HologramMaterialization,introState} from '../src/chase/hologram';
import {HOLO_INTRO as H,HOLO_INTRO_TOTAL as TOTAL} from '../src/config/chase';
import {SEEKER_LANDING} from '../src/chase/director';
import {DESIGN,SKULL_ANCHOR} from '../src/layout';

describe('Seeker hologram arrival',()=>{
 it('lands on the stone: x mirrors the Skull plinth, same feet line, zero lift/bounce/squash at the end',()=>{
  expect(SEEKER_LANDING.x).toBe(DESIGN.w-SKULL_ANCHOR.x);expect(SEEKER_LANDING.y).toBe(SKULL_ANCHOR.y);
  const e=introState(TOTAL);expect(e.lift).toBe(0);expect(e.bounce).toBe(0);expect(e.squash).toBe(0);expect(e.reveal).toBe(1);expect(e.alpha).toBe(1);});
 it('never goes below the stone (no penetration) and never floats after touchdown',()=>{
  for(let u=0;u<=TOTAL+.5;u+=.005){const s=introState(u);expect(s.lift).toBeGreaterThanOrEqual(0);expect(s.bounce).toBeGreaterThanOrEqual(0);if(u>=H.beam+H.materialize+H.descent)expect(s.lift).toBe(0);}});
 it('phases are ordered: beam (invisible) → materialise (hover) → descent (decelerating) → land',()=>{
  expect(introState(H.beam/2).visible).toBe(false);expect(introState(H.beam/2).beam).toBeGreaterThan(0);
  const m=introState(H.beam+H.materialize/2);expect(m.phase).toBe('materialize');expect(m.lift).toBeGreaterThan(H.hoverPx*.9);
  const t0=H.beam+H.materialize,v=(a:number)=>introState(a).lift-introState(a+.01).lift;
  expect(v(t0+.02)).toBeGreaterThan(v(t0+H.descent-.05));                                // slows down near the floor
  expect(introState(t0+H.descent+.05).phase).toBe('land');expect(introState(t0+H.descent+.05).squash).toBeLessThan(0);});
 it('reveal of the original textures is monotonic',()=>{let last=-1;for(let u=0;u<=TOTAL;u+=.01){const r=introState(u).reveal;expect(r).toBeGreaterThanOrEqual(last-1e-9);last=r;}});
 it('materials: replaced by clones during the effect, originals restored by identity and clones disposed (no leak)',()=>{
  const mk=()=>new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'#c33'}));const root=new T.Group();const a=mk(),b=mk();root.add(a,b);
  const oa=a.material,ob=b.material;let disposed=0;const h=new HologramMaterialization();
  h.begin(root);h.begin(root);                                  // idempotent
  expect(h.isActive).toBe(true);expect(a.material).not.toBe(oa);expect((a.material as T.Material).transparent).toBe(true);expect(h.materialCount).toBe(2);
  (a.material as T.Material).addEventListener('dispose',()=>{disposed++;});
  h.end();expect(a.material).toBe(oa);expect(b.material).toBe(ob);expect((oa as T.Material).transparent).toBe(false);expect(disposed).toBe(1);expect(h.materialCount).toBe(0);h.end();});
 it('can be disabled and then leaves the model untouched',()=>{const m=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());const o=m.material;const h=new HologramMaterialization();h.enabled=false;h.begin(m);expect(m.material).toBe(o);expect(h.isActive).toBe(false);});
});
