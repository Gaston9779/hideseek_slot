/** Central GPU budget.  Keeps the 1920×1080 composition, but caps backing-store
 * resolution on memory-constrained mobile WebKit independently of orientation. */
import {mobileDebug} from '../mobileDebug';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
export const isMobile = () => typeof matchMedia === 'undefined' ? false : matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export function renderPixelRatio() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  return Math.min(dpr, isMobile() ? 1.25 : 2);
}
/** Every WebGL renderer in the game is created through this: MSAA is off on mobile (it multiplies the drawing-buffer memory),
 * the context is tracked in the diagnostics, and context loss/restoration is always logged. */
export function createGlRenderer(name: string, canvas: HTMLCanvasElement, extra: Partial<T.WebGLRendererParameters> = {}) {
  const gl = new T.WebGLRenderer({ canvas, antialias: !isMobile(), alpha: true, premultipliedAlpha: true, powerPreference: isMobile() ? 'low-power' : 'high-performance', ...extra });
  gl.setClearColor(0, 0); gl.toneMapping = T.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; gl.outputColorSpace = T.SRGBColorSpace;
  mobileDebug.renderer(`${name}:create`, { antialias: !isMobile() });
  mobileDebug.probe(`gl.${name}`, () => ({ geo: gl.info.memory.geometries, tex: gl.info.memory.textures, prog: gl.info.programs?.length ?? 0, calls: gl.info.render.calls }));
  return gl;
}
/** Image-based lighting from the stock RoomEnvironment, disposing the temporary room scene (geometries/materials) right away. */
export function createEnvironment(gl: T.WebGLRenderer) {
  const pm = new T.PMREMGenerator(gl), room = new RoomEnvironment(), tex = pm.fromScene(room, .04).texture;
  room.traverse(o => { const m = o as T.Mesh; if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.dispose()); } });
  pm.dispose(); return tex;
}

/** Coalesce resize/orientation/visualViewport bursts into one allocation pass. */
export function coalescedResize(fn: () => void) {
  let raf = 0;
 const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0;mobileDebug.event('viewport:resize',{w:innerWidth,h:innerHeight,orientation:screen.orientation?.type??'unknown'});fn(); }); };
  addEventListener('resize', request, { passive: true });
  addEventListener('orientationchange', request, { passive: true });
  visualViewport?.addEventListener('resize', request, { passive: true });
  visualViewport?.addEventListener('scroll', request, { passive: true });
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', request); removeEventListener('orientationchange', request); visualViewport?.removeEventListener('resize', request); visualViewport?.removeEventListener('scroll', request); };
}
