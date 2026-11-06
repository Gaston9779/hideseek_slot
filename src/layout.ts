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
export const LOGO = { cx: 958, top: 16, w: 410 };

/**
 * CONTROL BAR — one shared coordinate system.
 * The bar (panel art + SPIN + BALANCE/BET/WIN + ± + info + Quick Spin + menu) is scaled as ONE group by CONTROL_BAR.scale about a single anchor:
 * horizontally the design centre (960 → stays centred), vertically the top of the stone ledge (y=780, just under the reels) so the ledge keeps touching the machine base.
 * `bx/by` map any point authored in the old (unscaled) coordinates; every control position is derived from PANEL, never scaled separately.
 */
export const CONTROL_BAR = { scale: 0.9, anchorX: 960, anchorY: 780 };
export const bx = (x: number) => CONTROL_BAR.anchorX + (x - CONTROL_BAR.anchorX) * CONTROL_BAR.scale;
export const by = (y: number) => CONTROL_BAR.anchorY + (y - CONTROL_BAR.anchorY) * CONTROL_BAR.scale;
/** Panel art is 2172x724. Unscaled reference was { scale: 0.8103, x: 80, y: 608 }. */
export const PANEL = { src: [2172, 724], scale: 0.8103 * CONTROL_BAR.scale, x: bx(80), y: by(608) };
const k = 1.086;
const px = (v: number) => PANEL.x + v * k * PANEL.scale, py = (v: number) => PANEL.y + v * k * PANEL.scale, ps = (v: number) => v * k * PANEL.scale;
/** Inner (dark) recesses of the BALANCE / BET / WIN pills, measured on control-panel.png in ART pixels (flood-fill of the pill interior). Fields are centred on these boxes. */
export const FIELD_ART = { balance: { x0: 335, x1: 555, y0: 404, y1: 475 }, bet: { x0: 674, x1: 803, y0: 404, y1: 463 }, win: { x0: 1564, x1: 1832, y0: 404, y1: 475 } };
const fieldBox = (f: { x0: number; x1: number; y0: number; y1: number }) => ({ cx: PANEL.x + (f.x0 + f.x1 + 1) / 2 * PANEL.scale, cy: PANEL.y + (f.y0 + f.y1 + 1) / 2 * PANEL.scale, w: (f.x1 - f.x0 + 1) * PANEL.scale, h: (f.y1 - f.y0 + 1) * PANEL.scale });
export const HUD = {
  balance: fieldBox(FIELD_ART.balance),
  bet: fieldBox(FIELD_ART.bet),
  win: fieldBox(FIELD_ART.win),
  spin: { cx: px(1003), cy: py(365), r: ps(150) },
  info: { cx: px(228), cy: py(395), r: ps(54) },
  minus: { cx: px(579), cy: py(395), r: ps(38) },
  plus: { cx: px(782), cy: py(395), r: ps(38) },
  menu: { cx: px(1771), cy: py(395), r: ps(54) },
  /** Lightning button drawn in control-panel.png (measured on the unscaled art: ring 1228–1314 × 911–996) — a transparent hit area sits exactly on it, nothing is redrawn. */
  quick: { cx: bx(1271), cy: by(953), r: 43 * CONTROL_BAR.scale },
};

/** Real 3D Skull gets a bounded transparent canvas on the left foreground. */
export const SKULL_ANCHOR = { x: 420, y: by(831) };   // where the feet touch the stone (design px)
/** Skull scale: previous configured height was 190 design px; v2 enlarges the character ×1.5 (newScale = currentScale × 1.5). The canvas grows with it so nothing is clipped;
 *  feet stay on SKULL_ANCHOR (the model is normalised from its real bounding box: min.y → ground, x/z centre → pivot). */
export const SKULL_BASE_HEIGHT = 190, SKULL_SCALE = 1.5;
const SK_W = 600, SK_H = 600, SK_FOOT = 60;
export const SKULL = { w: SK_W, h: SK_H, height: SKULL_BASE_HEIGHT * SKULL_SCALE, foot: SK_FOOT, x: SKULL_ANCHOR.x - SK_W / 2, y: SKULL_ANCHOR.y - (SK_H - SK_FOOT) };

export const OVERLAY = { bonus: { cx: 960, cy: 548, w: 1380 }, freeSpins: { cx: 960, cy: 500, w: 1380 } };
