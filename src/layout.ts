/**
 * Single source of truth for composition. Logical design space 1920x1080; the stage is scaled to fit.
 * Source-image coordinates (frame / panel) are measured from the supplied artwork
 * (scripts/extract-assets.py → assets-2d/frame/cells.json) and mapped here.
 */
export const DESIGN = { w: 1920, h: 1080 };

/** Background art is 1672x941. Slightly over-scaled so the art's own gargoyle sits off-screen right (the frame has its own). */
export const BG = { src: [1672, 941], scale: 1.36, x: -110, y: -44 };

export const FRAME = { src: [1672, 941], scale: 0.88, x: 224, y: 91 };
// measured reel-cell rectangles in frame-source pixels
const COLS: [number, number][] = [[335, 532], [541, 732], [741, 929], [938, 1130], [1139, 1334]];
const ROWS: [number, number][] = [[237, 421], [426, 604], [609, 781]];
export interface Rect { x: number; y: number; w: number; h: number }
const fx = (v: number) => FRAME.x + v * FRAME.scale, fy = (v: number) => FRAME.y + v * FRAME.scale;
export const CELLS: Rect[][] = COLS.map(([x0, x1]) => ROWS.map(([y0, y1]) => ({ x: fx(x0), y: fy(y0), w: (x1 - x0) * FRAME.scale, h: (y1 - y0) * FRAME.scale })));
export const ROW_PITCH = ((ROWS[2][0] + ROWS[2][1]) / 2 - (ROWS[0][0] + ROWS[0][1]) / 2) / 2 * FRAME.scale;
export const COL_CENTERS = CELLS.map(c => c[0].x + c[0].w / 2);
export const ROW_CENTER0 = CELLS[0][0].y + CELLS[0][0].h / 2;
export const SYMBOL_SIZE = 184;                       // drawn size of a 512px symbol canvas
export const PLAY_AREA: Rect = { x: CELLS[0][0].x - 8, y: CELLS[0][0].y - 8, w: CELLS[4][0].x + CELLS[4][0].w - CELLS[0][0].x + 16, h: CELLS[0][2].y + CELLS[0][2].h - CELLS[0][0].y + 16 };

/** Logo (cropped derived copy, 1200x862 source) */
export const LOGO = { cx: 958, top: -46, w: 510 };

/** Control panel art is 2172x724; field coordinates below are in the 2000px-wide inspection view ×1.086. */
export const PANEL = { src: [2172, 724], scale: 0.8103, x: 80, y: 608 };
const k = 1.086;
const px = (v: number) => PANEL.x + v * k * PANEL.scale, py = (v: number) => PANEL.y + v * k * PANEL.scale, ps = (v: number) => v * k * PANEL.scale;
export const HUD = {
  balance: { cx: px(410), cy: py(405), w: ps(205), h: ps(66) },
  bet: { cx: px(680), cy: py(405), w: ps(118), h: ps(66) },
  win: { cx: px(1564), cy: py(405), w: ps(248), h: ps(66) },
  spin: { cx: px(1003), cy: py(365), r: ps(150) },
  info: { cx: px(228), cy: py(395), r: ps(54) },
  minus: { cx: px(579), cy: py(395), r: ps(38) },
  plus: { cx: px(782), cy: py(395), r: ps(38) },
  menu: { cx: px(1771), cy: py(395), r: ps(54) },
};

/** Real 3D Skull gets a bounded transparent canvas on the left foreground. */
export const SKULL = { x: -60, y: 270, w: 660, h: 620, height: 430, foot: 72 };

export const OVERLAY = { bonus: { cx: 960, cy: 500, w: 1440 }, freeSpins: { cx: 960, cy: 500, w: 1380 } };
