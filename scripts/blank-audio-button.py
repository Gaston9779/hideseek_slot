"""Builds assets-2d/ui/control-panel-audio.png: the original panel with the rotation icon removed from its circular button.
The button face is copied from the identical lightning button next to it (bolt inpainted from neighbouring face pixels), so ring, bevel and lighting are untouched.
Run: python scripts/blank-audio-button.py   (numpy scipy pillow)"""
import numpy as np
from PIL import Image
import scipy.ndimage as nd
SRC='assets-2d/ui/control-panel.png';DST='assets-2d/ui/control-panel-audio.png'
im=Image.open(SRC).convert('RGBA');a=np.array(im).astype(float)
CQ=(1470.0,425.5);CR=(1346.5,425.5);R=45.5     # ring centres (art px, measured) and face radius (inside the gold ring)
H,W=a.shape[:2];yy,xx=np.mgrid[0:H,0:W]
# 1) face of the lightning button, bolt removed by nearest-face inpainting
face=((xx-CQ[0])**2+(yy-CQ[1])**2)<=R**2
lum=a[...,:3].mean(2);icon=face&(lum>np.percentile(lum[face],70)+0)  # provisional; refine with colour distance from the dark face tone
base=np.median(a[...,:3][face&~icon],axis=0)
dist=np.abs(a[...,:3]-base).sum(2);icon=face&(dist>38)
icon=nd.binary_dilation(icon,iterations=4)&face
src=a[...,:3].copy();ok=face&~icon
idx=nd.distance_transform_edt(~ok,return_distances=False,return_indices=True)
filled=src[idx[0],idx[1]]
fill=np.where(icon[...,None],filled,src)
fill=np.where(icon[...,None],nd.gaussian_filter(fill,(2.5,2.5,0)),fill)
# 2) paste into the rotation button face (same geometry, shifted by dx), feathered edge
dx,dy=CR[0]-CQ[0],CR[1]-CQ[1]
out=a.copy();ys,xs=np.where(((xx-CR[0])**2+(yy-CR[1])**2)<=(R+1.5)**2)
for y,x in zip(ys,xs):
    r=np.hypot(x-CR[0],y-CR[1]);w=1.0 if r<=R-1.5 else max(0.0,(R+1.5-r)/3.0)
    sx,sy=int(round(x-dx)),int(round(y-dy));out[y,x,:3]=out[y,x,:3]*(1-w)+fill[sy,sx]*w
Image.fromarray(out.astype(np.uint8),'RGBA').save(DST)
print('ok',DST,'icon px removed',int(icon.sum()))
