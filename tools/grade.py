"""Colour-grade the hero pieces so they sit in the painted, desaturated, warm-dusty backgrounds.
Pre-processing only (no runtime CSS filters). Run after tools/tint.py; tools/build_assets.py consumes src/graded/."""
import numpy as np
from PIL import Image, ImageFilter
import os
S='/workspace/zagros-hero/src'; O=f'{S}/graded'; os.makedirs(O,exist_ok=True)

def lum(rgb): return rgb[...,0]*0.299+rgb[...,1]*0.587+rgb[...,2]*0.114

def ground_texture(size, bg='ground1-dry-notrees-1920x1080.jpg', box=(300,780,1100,1060), scale=1.0):
    """high-pass of the painted ground (its etched stroke texture), tiled to `size`"""
    g=Image.open(f'{S}/{bg}').convert('L').crop(box)
    if scale!=1: g=g.resize((int(g.width*scale),int(g.height*scale)),Image.LANCZOS)
    a=np.asarray(g).astype(float)/255
    hp=a-np.asarray(g.filter(ImageFilter.GaussianBlur(3))).astype(float)/255
    w,h=size; reps=(h//hp.shape[0]+1, w//hp.shape[1]+1)
    return np.tile(hp,reps)[:h,:w]

def grade(im, sat=0.55, contrast=0.72, warm=(1.06,1.0,0.90), haze=(226,212,194), haze_amt=0.12,
          hi_knee=0.80, tex_amt=0.9, alpha_blur=0.7, protect=None):
    a=np.asarray(im.convert('RGBA')).astype(float)/255
    rgb=a[...,:3]; al=a[...,3]
    L=lum(rgb)[...,None]
    out=L+(rgb-L)*sat                                  # lower saturation
    m=(L[...,0]*al).sum()/max(al.sum(),1)
    out=m+(out-m)*contrast                             # lower contrast
    out=out*np.array(warm)                             # pull hue toward the dusty ground
    l2=lum(out)[...,None]                              # soft-compress glossy highlights
    over=np.clip(l2-hi_knee,0,None); out=out-over*0.65
    out=out*(1-haze_amt)+np.array(haze)/255*haze_amt   # atmospheric lift (matches the haze of the paintings)
    if tex_amt:
        t=ground_texture((rgb.shape[1],rgb.shape[0]))
        out=out+t[...,None]*tex_amt
    if protect is not None:                            # keep e.g. the teal logo untouched
        w=protect(rgb)[...,None]; out=out*(1-w)+rgb*w
    out=np.clip(out,0,1)
    alpha=Image.fromarray((al*255).astype(np.uint8))
    if alpha_blur: alpha=alpha.filter(ImageFilter.GaussianBlur(alpha_blur))  # soften the cut-out edge
    res=Image.fromarray((out*255).round().astype(np.uint8),'RGB'); res.putalpha(alpha)
    return res

def crop(im): return im.crop(im.getchannel('A').getbbox())
def fit(im,h): im=crop(im); return im.resize((round(im.width*h/im.height),h),Image.LANCZOS)

# acorn: strongest grade (it is the "foreign" looking piece); work at final size so texture scale is right
ac=fit(Image.open(f'{S}/pieces/1-acorn.png'),132)
ac=ac.filter(ImageFilter.GaussianBlur(0.8))           # take the CG crispness / gloss off
A=np.asarray(ac).astype(float)/255
rgb=A[...,:3]; al=A[...,3]
L=lum(rgb)
# flatten the glossy 3-D shading into the painting's soft, low-contrast tonal range
Lf=0.5+(L-0.5)*0.55
Lf=np.minimum(Lf, 0.62+(Lf-0.62)*0.25)                # kill the specular highlight
# re-colour by region: nut = warm umber, spiky cup = dusty ochre (same family as the dry ground)
r,g,bb=rgb[...,0],rgb[...,1],rgb[...,2]
nut=np.clip((r-g)*5-0.15,0,1)                         # reddish-brown nut vs. olive/beige cup
nut=np.asarray(Image.fromarray((nut*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(float)/255
NUT=np.array([150,112,80])/255; CUP=np.array([176,152,116])/255
base=NUT*nut[...,None]+CUP*(1-nut[...,None])
out=base*(Lf/0.5)[...,None]*0.92
out=out*0.9+np.array([226,212,194])/255*0.10        # same haze as the painting
# painted line texture (high-pass of the ground strokes, coarser so strokes read at acorn size)
t=ground_texture((rgb.shape[1],rgb.shape[0]), scale=1.6)
out=out+t[...,None]*0.85
# etched outline like the rocks in the painting: darken a thin band inside the silhouette
alpha=Image.fromarray((al*255).astype(np.uint8))
er=np.asarray(alpha.filter(ImageFilter.MinFilter(5))).astype(float)/255
edge=np.clip(al-er,0,1)
edge=np.asarray(Image.fromarray((edge*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float)/255
out=out*(1-edge[...,None]*0.38)
out=np.clip(out,0,1)
alpha=alpha.filter(ImageFilter.GaussianBlur(0.7))     # soft cut-out edge
res=Image.fromarray((out*255).round().astype(np.uint8),'RGB'); res.putalpha(alpha)
res.save(f'{O}/acorn.png')

# sprout: tinted leaves + mound/shell -> match the ground (mound was too pale/white)
sp=fit(Image.open(f'{S}/tinted/2-sprout.png'),380)
g=grade(sp, sat=0.75, contrast=0.8, warm=(1.04,1.0,0.9), haze_amt=0.06, hi_knee=0.72, tex_amt=0.6, alpha_blur=0.9)
# the soil mound read as a pale plate: darken it toward turned soil and feather its rim into the ground
a=np.asarray(g).astype(float); H=a.shape[0]
ys=np.arange(H)[:,None]/H
w=np.clip((ys-0.70)/0.12,0,1)                       # bottom band = mound
a[...,:3]=a[...,:3]*(1-w[...,None]*np.array([0.18,0.22,0.28]))
alpha=Image.fromarray(a[...,3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))
al=np.asarray(alpha).astype(float)
bandmask=np.clip((ys-0.80)/0.08,0,1)
a[...,3]=np.minimum(a[...,3], a[...,3]*(1-bandmask)+al*0.85*bandmask)
Image.fromarray(a.round().astype(np.uint8),'RGBA').save(f'{O}/sprout.png')

# sapling: very light touch (already tinted)
sa=fit(Image.open(f'{S}/tinted/3-sapling.png'),560)
grade(sa, sat=0.85, contrast=0.9, warm=(1.02,1.0,0.95), haze_amt=0.06, hi_knee=0.85, tex_amt=0.0, alpha_blur=0.6).save(f'{O}/sapling.png')

# canister: grade only the warm acorns inside; protect the teal logo, glass and highlights stay
def protect_teal(rgb):
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    teal=np.clip(((g+b)/2-r)*6,0,1)                   # cyan/teal pixels
    return teal
ca=fit(Image.open(f'{S}/pieces/6-canister-acorns.png'),900)
grade(ca, sat=0.62, contrast=0.8, warm=(1.05,1.0,0.9), haze_amt=0.07, hi_knee=0.86, tex_amt=0.0, alpha_blur=0.5, protect=protect_teal).save(f'{O}/canister.png')
print('graded')
