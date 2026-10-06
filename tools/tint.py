import numpy as np
from PIL import Image
import sys, os
SRC='/workspace/zagros-hero/src/pieces'
OUT='/workspace/zagros-hero/src/tinted'
os.makedirs(OUT,exist_ok=True)

def smooth(e0,e1,x):
    t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)

def rgb2hsv(rgb):
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    mx=rgb.max(-1); mn=rgb.min(-1); d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    s=np.where(mx>0,(mx-mn)/(mx+1e-6),0)
    return h,s,mx

def gradmap(L,stops):
    xs=[s[0] for s in stops]; out=np.zeros(L.shape+(3,))
    for c in range(3):
        out[...,c]=np.interp(L,xs,[s[1][c] for s in stops])
    return out

# foliage gradient (olive / Quercus brantii-ish), trunk gradient (grey-brown bark)
FOL=[(0.0,(22,30,16)),(0.35,(56,70,34)),(0.6,(96,112,58)),(0.82,(144,156,98)),(1.0,(198,206,158))]
BARK=[(0.0,(34,28,22)),(0.4,(78,66,54)),(0.7,(124,110,92)),(1.0,(186,174,152))]

def tint(name, strength=1.0, gamma=1.15):
    im=Image.open(f'{SRC}/{name}.png').convert('RGBA')
    a=np.asarray(im).astype(float)/255
    rgb=a[...,:3]; al=a[...,3]
    h,s,v=rgb2hsv(rgb)
    L=(0.299*rgb[...,0]+0.587*rgb[...,1]+0.114*rgb[...,2])
    L=np.clip(L,0,1)**gamma
    w=smooth(46,60,h)*smooth(0.05,0.14,s)   # foliage weight
    fol=gradmap(L,FOL)/255
    bark=gradmap(L,BARK)/255
    out=fol*w[...,None]+bark*(1-w[...,None])
    # keep a touch of original texture variation
    out=out*0.88+rgb*np.array([0.55,0.6,0.45])*0.12
    out=rgb*(1-strength)+out*strength
    res=np.dstack([np.clip(out,0,1),al])
    return Image.fromarray((res*255).round().astype(np.uint8),'RGBA')

for n in ['2-sprout','3-sapling','4-young-oak','5-grown-oak']:
    img=tint(n, strength=0.75 if n=='2-sprout' else 1.0)
    img.save(f'{OUT}/{n}.png')
print('ok')
