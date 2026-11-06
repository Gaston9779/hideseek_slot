"""Extract the 13 symbols (4 columns x 4 rows, last row has one symbol) from the atlas (alpha-cleaned, 512x512) + measure reel-frame cells + control panel field boxes.
Run: python scripts/extract-assets.py  (needs numpy scipy pillow)"""
import json,sys
import numpy as np
from PIL import Image
import scipy.ndimage as nd
ROOT='.'
NAMES=[['tombstone','wild','lantern','chest-bonus'],['potion','ghost','key','magic-book'],['scatter','coin','gargoyle','grail'],['hourglass',None,None,None]]
im=np.array(Image.open(f'{ROOT}/assets-2d/symbols/symbols-sheet.png').convert('RGBA'))
H,W=im.shape[:2];a=im[...,3].astype(float)
lab,n=nd.label(a>128,structure=np.ones((3,3)))
areas=nd.sum(np.ones_like(a),lab,range(1,n+1));cms=nd.center_of_mass(np.ones_like(a),lab,range(1,n+1))
cw,ch=W/4,H/4;groups={}
for i,(ar,(cy,cx)) in enumerate(zip(areas,cms),1):
    if ar<400:continue
    groups.setdefault((int(cy//ch),int(cx//cw)),[]).append(i)
# drop stray specks: a component must be >=1% of the largest one in its cell
for k,ids in list(groups.items()):
    big=max(areas[i-1] for i in ids);groups[k]=[i for i in ids if areas[i-1]>=.01*big]
report={}
for (r,c),ids in sorted(groups.items()):
    name=NAMES[r][c];mask=np.isin(lab,ids)
    # keep the soft edge: dilate the solid mask a few px, take original alpha inside it
    keep=nd.binary_dilation(mask,iterations=4)
    ys,xs=np.where(mask);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    pad=6;y0=max(0,y0-pad);x0=max(0,x0-pad);y1=min(H,y1+pad);x1=min(W,x1+pad)
    rgba=im[y0:y1,x0:x1].astype(float);k=keep[y0:y1,x0:x1];al=rgba[...,3]*k
    # alpha: remove faint halo (<70), re-stretch, then 1px erosion of the solid core to kill dark fringe
    solid=(al>=200);core=nd.binary_erosion(solid,iterations=1)
    al2=np.clip((al-70)/(255-70),0,1)
    edge=nd.gaussian_filter(core.astype(float),.8)
    al_out=np.maximum(np.minimum(al2,1),0)*np.clip(edge*1.6,0,1)
    al_out=np.where(solid,np.maximum(al_out,core*1.0),al_out)
    # decontaminate colour: edge pixels take colour from nearest interior (core) pixel
    idx=nd.distance_transform_edt(~core,return_distances=False,return_indices=True)
    col=rgba[...,:3][idx[0],idx[1]]
    out=np.dstack([col,al_out*255]).astype(np.uint8);sym=Image.fromarray(out,'RGBA')
    bb=sym.getbbox();sym=sym.crop(bb);s=min(436/sym.width,436/sym.height)
    sym=sym.resize((max(1,round(sym.width*s)),max(1,round(sym.height*s))),Image.LANCZOS)
    canvas=Image.new('RGBA',(512,512),(0,0,0,0));canvas.alpha_composite(sym,((512-sym.width)//2,(512-sym.height)//2))
    canvas.save(f'{ROOT}/assets-2d/symbols/exported/{name}.png')
    report[name]={'cell':[r,c],'src_bbox':[int(x0),int(y0),int(x1),int(y1)],'components':len(ids)}
print(json.dumps(report))
# contact sheet on checker + magenta (to expose fringes)
names=[n for row in NAMES for n in row if n];sheet=Image.new('RGBA',(4*256,4*256),(255,0,255,255))
for i,nm in enumerate(names):
    s=Image.open(f'{ROOT}/assets-2d/symbols/exported/{nm}.png').resize((256,256),Image.LANCZOS);sheet.alpha_composite(s,((i%4)*256,(i//4)*256))
sheet.save(f'{ROOT}/assets-2d/symbols/contact-sheet-magenta.png')
# reel frame cells: dark interior blocks
fr=np.array(Image.open(f'{ROOT}/assets-2d/frame/reel-frame.png').convert('RGBA')).astype(int)
dark=(fr[...,3]>250)&(fr[...,:3].sum(2)<230)
def runs(v,minlen):
    out=[];s=None
    for i,x in enumerate(v):
        if x and s is None:s=i
        if not x and s is not None:
            if i-s>=minlen:out.append((s,i-1))
            s=None
    if s is not None:out.append((s,len(v)-1))
    return out
cx=runs(dark[330,:],60);cy=runs(dark[:,430],60)
print('cols',cx,'rows',cy)
json.dump({'cols':cx,'rows':cy},open('assets-2d/frame/cells.json','w'))
