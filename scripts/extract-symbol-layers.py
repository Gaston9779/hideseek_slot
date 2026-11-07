"""Derived animation layers for WILD / SCATTER / CHEST_BONUS (512x512 RGBA, pixel-aligned with the originals, which are NOT modified).
 wild-head   : the skull + horns cut from wild.png (everything above the plate, scarf excluded) - drawn over the untouched original with a tiny scale>=1 so nothing is ever uncovered
 wild-eyes   : eye-socket mask (white, alpha)       wild-gold  : gold letters/rim of the plate (mask)
 scatter-door: lit window of the mausoleum (mask)   scatter-flames: candle + roof flames (mask)
 chest-gold  : gold metal of the chest (mask)
Masks are white with alpha; the game tints them additively."""
from PIL import Image
import os
S='assets-2d/symbols/exported/';O='assets-2d/symbols/layers/'
def load(n):return Image.open(S+n).convert('RGBA')
def clamp(v):return 0 if v<0 else 255 if v>255 else int(v)
def make(img,fn):
    w,h=img.size;src=img.load();out=Image.new('RGBA',(w,h),(0,0,0,0));dst=out.load()
    for y in range(h):
        for x in range(w):
            r,g,b,a=src[x,y]
            if a<8:continue
            v=fn(x,y,r,g,b,a)
            if v:dst[x,y]=v
    return out
red=lambda r,g,b:r>140 and g<95 and b<95 and r-g>80
# ---------- WILD
wild=load('wild.png');YCUT=326
head=make(wild,lambda x,y,r,g,b,a:(r,g,b,a) if y<YCUT and not red(r,g,b) else None)
def eyes(x,y,r,g,b,a):
    for cx in (182,322):
        if ((x-cx)/46)**2+((y-250)/50)**2<=1:
            l=.3*r+.59*g+.11*b
            if l<95:return (255,255,255,clamp((95-l)*5))
wildEyes=make(wild,eyes)
def gold(x,y,r,g,b,a):
    if r>170 and g>110 and b<120 and r-b>90:return (255,255,255,clamp((g-90)*2.2))
wildGold=make(wild,lambda x,y,*p:gold(x,y,*p) if y>=335 else None)
# ---------- SCATTER
sc=load('scatter.png')
def warm(x,y,r,g,b,a):
    if r>215 and g>105 and b<130 and r-b>110:return (255,255,255,clamp((g-90)*2.4))
door=make(sc,lambda x,y,*p:warm(x,y,*p) if 200<=x<=310 and 232<=y<=335 else None)
BOX=[(55,262,115,322),(405,262,455,322),(105,128,170,190),(350,132,415,195)]
flames=make(sc,lambda x,y,*p:warm(x,y,*p) if any(x0<=x<=x1 and y0<=y<=y1 for x0,y0,x1,y1 in BOX) else None)
# ---------- CHEST
ch=load('chest-bonus.png')
chGold=make(ch,lambda x,y,*p:gold(x,y,*p))
os.makedirs(O,exist_ok=True)
for n,i in [('wild-head',head),('wild-eyes',wildEyes),('wild-gold',wildGold),('scatter-door',door),('scatter-flames',flames),('chest-gold',chGold)]:
    i.save(O+n+'.png',optimize=True);print(n,sum(1 for p in i.getdata() if p[3]>0))
# contact sheet for visual QA (not shipped)
sheet=Image.new('RGBA',(512*3,512*2),(40,20,60,255))
for k,(base,lay) in enumerate([(wild,head),(wild,wildEyes),(wild,wildGold),(sc,door),(sc,flames),(ch,chGold)]):
    t=Image.new('RGBA',(512,512),(40,20,60,255));t.alpha_composite(Image.eval(base,lambda v:v//3) if False else base.point(lambda v:v//3 if v else 0) if False else base)
    m=Image.new('RGBA',(512,512),(0,0,0,0));px=lay.load();mp=m.load()
    for y in range(512):
        for x in range(512):
            if px[x,y][3]:mp[x,y]=(0,255,255,200) if k not in (0,) else (0,255,255,255)
    if k==0:t=Image.new('RGBA',(512,512),(40,20,60,255));t.alpha_composite(base);
    t.alpha_composite(m);sheet.paste(t,((k%3)*512,(k//3)*512))
sheet.convert('RGB').resize((768,512)).save('/private/tmp/claude-501/-Users-nicolaviola--claude-spares-spare-nqr2Rm/c2ab1bfb-9e2c-4ed8-8274-3c10e10313d5/scratchpad/layers.jpg',quality=75)
