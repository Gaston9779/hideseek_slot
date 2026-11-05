import json,struct,numpy as np,sys
def load(path):
    b=open(path,'rb').read();l=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+l]);bin_=b[20+l+8:]
    def acc(i):
        a=j['accessors'][i];bv=j['bufferViews'][a['bufferView']];off=bv.get('byteOffset',0)+a.get('byteOffset',0)
        n={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];dt={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
        return np.frombuffer(bin_,dtype=dt,count=a['count']*n,offset=off).reshape(a['count'],n)
    p=j['meshes'][0]['primitives'][0]
    return j,b,bin_,{k:acc(v) for k,v in p['attributes'].items()},acc(p['indices'])[:,0].reshape(-1,3)
def components(pos,idx):
    key=np.round(pos,4);_,inv=np.unique(key,axis=0,return_inverse=True);inv=inv.ravel()
    par=list(range(inv.max()+1))
    def f(x):
        while par[x]!=x:par[x]=par[par[x]];x=par[x]
        return x
    for t in idx:
        a,b,c=inv[t];ra,rb,rc=f(a),f(b),f(c);par[rb]=ra;par[rc]=ra
    roots=np.array([f(inv[t[0]]) for t in idx]);u,ci=np.unique(roots,return_inverse=True)
    return ci
if __name__=='__main__':
    j,b,bin_,at,idx=load('models/bonus-chest/chest-original.glb');ci=components(at['POSITION'],idx)
    vc=np.zeros(len(at['POSITION']),int)
    for t,c in zip(idx,ci):vc[t]=c
    json.dump({'vertexComp':vc.tolist(),'n':int(ci.max()+1)},open('public/bonus-chest/comps.json','w'))
    for c in range(ci.max()+1):
        m=ci==c;vs=at['POSITION'][idx[m].ravel()];print(c,m.sum(),vs.min(0).round(2),vs.max(0).round(2))
