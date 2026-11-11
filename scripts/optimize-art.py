#!/usr/bin/env python3
"""Build-time art optimisation (run once after art changes; outputs are committed inputs of the Vite build).

Sources stay untouched (assets-2d/**.png, public/assets/ui/*.png are the masters and are used by tests/tools).
Outputs go to assets-2d/optimized/:
  <name>.webp    full resolution (desktop). Same pixels as the master, visually lossless (q92, alpha_q 100)
  <name>.m.webp  phone variant: fewer pixels = less DECODED memory (a 1672x941 PNG costs ~6 MB decoded whatever its file size)
Symbol layers (alpha masks aligned on the 512 px symbol grid) are encoded lossless and never resized.
"""
import subprocess, sys, shutil
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets-2d' / 'optimized'
CWEBP = shutil.which('cwebp') or '/opt/homebrew/bin/cwebp'
# name -> (master, phone scale or None)
ART = {
 'cemetery-background': ('assets-2d/background/cemetery-background.png', .85),
 'reel-frame': ('assets-2d/frame/reel-frame.png', .85),
 'control-panel-audio': ('assets-2d/ui/control-panel-audio.png', .85),
 'hide-seek-bonus': ('assets-2d/bonus/hide-seek-bonus.png', .8),
 'free-spins': ('assets-2d/bonus/free-spins.png', .8),
 'buy-bonus-frame': ('assets-2d/ui/bonus-v2/buy-bonus-frame.png', .7),
 'chest-free-spins-hud': ('assets-2d/ui/bonus-v2/chest-free-spins-hud.png', .6),
 'multiplier-x1': ('assets-2d/ui/bonus-v2/multiplier-x1.png', .5),
 'multiplier-x2': ('assets-2d/ui/bonus-v2/multiplier-x2.png', .5),
 'multiplier-x5': ('assets-2d/ui/bonus-v2/multiplier-x5.png', .5),
}
def enc(src, dst, scale=None, lossless=False):
    w, h = Image.open(src).size
    args = [CWEBP, '-quiet', '-m', '6', '-alpha_q', '100']
    args += ['-lossless', '-z', '9'] if lossless else ['-q', '92']
    if scale: args += ['-resize', str(round(w * scale)), str(round(h * scale))]
    subprocess.run(args + [str(src), '-o', str(dst)], check=True)
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # one logo file for the loading screen (index.html) and the game: 840 px wide, shown at 410-460 CSS px (covers 2x displays)
    enc(ROOT / 'assets-2d/logo/skull-hunt-logo-cropped.png', ROOT / 'public/assets/ui/skull-hunt-logo-cropped.webp', .7)
    rows = []
    for name, (src, ms) in ART.items():
        s = ROOT / src
        enc(s, OUT / f'{name}.webp'); enc(s, OUT / f'{name}.m.webp', ms)
        rows.append((name, s.stat().st_size, (OUT / f'{name}.webp').stat().st_size, (OUT / f'{name}.m.webp').stat().st_size))
    for p in sorted((ROOT / 'assets-2d/symbols/exported').glob('*.png')):
        enc(p, OUT / 'symbols' / f'{p.stem}.webp') if (OUT / 'symbols').mkdir(exist_ok=True) is None else None
        rows.append((f'symbol/{p.stem}', p.stat().st_size, (OUT / 'symbols' / f'{p.stem}.webp').stat().st_size, 0))
    (OUT / 'layers').mkdir(exist_ok=True)
    for p in sorted((ROOT / 'assets-2d/symbols/layers').glob('*.png')):
        enc(p, OUT / 'layers' / f'{p.stem}.webp', lossless=True)
        rows.append((f'layer/{p.stem}', p.stat().st_size, (OUT / 'layers' / f'{p.stem}.webp').stat().st_size, 0))
    t = [0, 0, 0]
    for n, a, b, c in rows:
        print(f'{n:34s} png {a/1024:7.0f}K  webp {b/1024:6.0f}K  phone {c/1024:6.0f}K'); t[0] += a; t[1] += b; t[2] += c or b
    print(f'TOTAL png {t[0]/1048576:.1f} MB -> desktop {t[1]/1048576:.1f} MB, phone {t[2]/1048576:.1f} MB')
main()
