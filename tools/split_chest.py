"""Split the single-mesh bonus chest into BASE and LID (original file is never modified).
No Blender is installed on this machine, so the split is done with numpy:
  * connected components (welded positions) are classified base/lid by their centroid relative to the seam plane,
  * the front skull ornament (one cluster that straddles the seam) is carried by the lid,
  * components that genuinely span the seam (the two arched side bands + the seam strap) are CLIPPED against the plane
    with UV/normal interpolation and the cut loops are capped (watertight, no holes).
The lid mesh is re-centred on the hinge so the lid NODE origin is the pivot (rotation.x about the hinge line).
"""
import json,struct,sys,numpy as np
sys.path.insert(0,'tools');from glb_comps import load,components
SRC='models/bonus-chest/chest-original.glb';YC=0.495
PIVOT=np.array([0.0,0.61,-0.45])           # hinge line (parallel to X): through the rear lid knuckles
CLIP={15,27,4}                              # components spanning the seam that must be cut
ORNAMENT_LID=lambda lo,hi: lo[2]>0.2 and abs((lo[0]+hi[0])/2)<0.33 and lo[1]>0.15  # front skull ornament cluster
j,raw,bin_,at,idx=load(SRC);P=at['POSITION'].astype(np.float64);N=at['NORMAL'].astype(np.float64);UV=at['TEXCOORD_0'].astype(np.float64)
ci=components(P,idx);ncomp=ci.max()+1
lo={c:P[idx[ci==c].ravel()].min(0) for c in range(ncomp)};hi={c:P[idx[ci==c].ravel()].max(0) for c in range(ncomp)}
side={}
for c in range(ncomp):
    cen=(lo[c][1]+hi[c][1])/2
    if c in CLIP:side[c]='clip'
    elif ORNAMENT_LID(lo[c],hi[c]):side[c]='lid'
    else:side[c]='lid' if cen>YC else 'base'
print({s:[c for c in side if side[c]==s] for s in ('base','lid','clip')})
V=lambda i:(P[i],N[i],UV[i])
parts={'base':[],'lid':[]};caps={'base':[],'lid':[]}   # list of triangles; each vertex = (pos,nrm,uv)
cutsegs={}  # (comp,side)->list of (pA,pB, uvA,uvB)
def lerp(a,b,t):return np.asarray(a)*(1-t)+np.asarray(b)*t
for t,c in zip(idx,ci):
    tri=[V(i) for i in t]
    if side[c]!='clip':parts[side[c]].append(tri);continue
    d=[v[0][1]-YC for v in tri]
    up=[v for v,x in zip(tri,d) if x>=0];dn=[v for v,x in zip(tri,d) if x<0]
    if not dn:parts['lid'].append(tri);continue
    if not up:parts['base'].append(tri);continue
    # rotate so the lone vertex is first
    lone_up=len(up)==1;lone=up[0] if lone_up else dn[0];others=[v for v in tri if v is not lone]
    # preserve winding: find lone index
    k=[v is lone for v in tri].index(True);a,b,c2=tri[k],tri[(k+1)%3],tri[(k+2)%3]
    def cut(p,q):
        tt=(YC-p[0][1])/(q[0][1]-p[0][1]);pos=lerp(p[0],q[0],tt);pos=np.array(pos);pos[1]=YC
        n=np.array(lerp(p[1],q[1],tt));n/=np.linalg.norm(n)+1e-12;return (pos,n,np.array(lerp(p[2],q[2],tt)))
    m1,m2=cut(a,b),cut(c2,a)     # a-b edge and c-a edge
    one,two=([a,m1,m2],[[m1,b,c2],[m1,c2,m2]])
    (parts['lid'] if lone_up else parts['base']).append(one)
    for tr in two:(parts['base'] if lone_up else parts['lid']).append(tr)
    cutsegs.setdefault(c,[]).append((m1,m2))
# ---- caps: chain cut segments into loops and fan-fill
def key(p):return tuple(np.round(p[0],5))
for c,segs in cutsegs.items():
    adj={}
    for m1,m2 in segs:adj.setdefault(key(m1),[]).append((m1,m2));adj.setdefault(key(m2),[]).append((m2,m1))
    used=set();loops=[]
    for m1,m2 in segs:
        if (key(m1),key(m2)) in used:continue
        loop=[m1];cur=m2;used.add((key(m1),key(m2)));used.add((key(m2),key(m1)));guard=0
        while key(cur)!=key(loop[0]) and guard<5000:
            guard+=1;loop.append(cur);nxt=None
            for a_,b_ in adj[key(cur)]:
                if (key(a_),key(b_)) not in used:nxt=b_;used.add((key(a_),key(b_)));used.add((key(b_),key(a_)));break
            if nxt is None:break
            cur=nxt
        loops.append(loop)
    for loop in loops:
        cen=np.mean([p[0] for p in loop],0);cuv=np.mean([p[2] for p in loop],0)
        for sidename,ny in (('lid',-1.0),('base',1.0)):
            for i in range(len(loop)):
                p,q=loop[i],loop[(i+1)%len(loop)];tri=[(cen,np.array([0,ny,0.]),cuv),p and (p[0],np.array([0,ny,0.]),p[2]),(q[0],np.array([0,ny,0.]),q[2])]
                nrm=np.cross(tri[1][0]-tri[0][0],tri[2][0]-tri[0][0])
                if nrm[1]*ny<0:tri=[tri[0],tri[2],tri[1]]
                caps[sidename].append(tri)
    print('comp',c,'loops',[len(l) for l in loops])
# ---- build indexed meshes
def build(tris,offset):
    vmap={};pos=[];nor=[];uv=[];ind=[]
    for tri in tris:
        for p,n,u in tri:
            k=(tuple(np.round(p,6)),tuple(np.round(n,3)),tuple(np.round(u,6)))
            if k not in vmap:vmap[k]=len(pos);pos.append(p-offset);nor.append(n);uv.append(u)
            ind.append(vmap[k])
    return np.array(pos,np.float32),np.array(nor,np.float32),np.array(uv,np.float32),np.array(ind,np.uint32)
base=build(parts['base']+caps['base'],np.zeros(3));lid=build(parts['lid']+caps['lid'],PIVOT)
def boundary_edges(pos,ind):
    # welded by position: count edges used once
    key=np.round(pos,5);_,inv=np.unique(key,axis=0,return_inverse=True);inv=inv.ravel();e={}
    for t in ind.reshape(-1,3):
        for a,b in ((0,1),(1,2),(2,0)):
            k=tuple(sorted((inv[t[a]],inv[t[b]])));e[k]=e.get(k,0)+1
    return sum(1 for v in e.values() if v==1),sum(1 for v in e.values() if v>2)
orig_b=boundary_edges(P,idx.ravel().astype(np.uint32))
for nm,m in (('base',base),('lid',lid)):print(nm,'verts',len(m[0]),'tris',len(m[3])//3,'boundary/nonmanifold edges',boundary_edges(m[0],m[3]))
print('original boundary/nonmanifold',orig_b,'tris',len(idx),'-> parts',len(parts['base'])+len(parts['lid']),'+caps',len(caps['base'])+len(caps['lid']))
# ---- write GLB
img=j['images'][0];bv=j['bufferViews'][img['bufferView']];imgbytes=bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
chunks=[];views=[];accs=[]
def add(arr,target,comp,typ,withminmax=False):
    data=arr.tobytes();pad=(-len(data))%4;off=sum(len(c) for c in chunks);chunks.append(data+b'\0'*pad)
    views.append({'buffer':0,'byteOffset':off,'byteLength':len(data),'target':target});a={'bufferView':len(views)-1,'componentType':comp,'count':int(len(arr) if arr.ndim==1 else arr.shape[0]),'type':typ}
    if withminmax:a['min']=arr.min(0).tolist();a['max']=arr.max(0).tolist()
    accs.append(a);return len(accs)-1
prims=[]
for pos,nor,uv,ind in (base,lid):
    prims.append({'attributes':{'POSITION':add(pos,34962,5126,'VEC3',True),'NORMAL':add(nor,34962,5126,'VEC3'),'TEXCOORD_0':add(uv,34962,5126,'VEC2')},'indices':add(ind,34963,5125,'SCALAR'),'material':0})
off=sum(len(c) for c in chunks);chunks.append(imgbytes+b'\0'*((-len(imgbytes))%4));views.append({'buffer':0,'byteOffset':off,'byteLength':len(imgbytes)})
out={'asset':{'version':'2.0','generator':'tools/split_chest.py'},'scene':0,'scenes':[{'nodes':[0]}],
 'nodes':[{'name':'BonusChest','children':[1,2]},{'name':'Chest_Base','mesh':0},{'name':'Chest_Lid_Pivot','translation':PIVOT.tolist(),'children':[3],'extras':{'hingeAxis':'X','openAngleDeg':-105}},{'name':'Chest_Lid','mesh':1}],
 'meshes':[{'name':'Chest_Base','primitives':[prims[0]]},{'name':'Chest_Lid','primitives':[prims[1]]}],
 'materials':j['materials'],'textures':j['textures'],'images':[{'bufferView':len(views)-1,'mimeType':img['mimeType']}],'samplers':j.get('samplers',[]),
 'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':sum(len(c) for c in chunks)}]}
js=json.dumps(out,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binb=b''.join(chunks)
glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(binb))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(binb),0x004E4942)+binb
for p in ('models/bonus-chest/bonus-chest-animated.glb','public/bonus-chest/bonus-chest-animated.glb'):open(p,'wb').write(glb)
print('written',len(glb),'bytes; pivot',PIVOT.tolist())
