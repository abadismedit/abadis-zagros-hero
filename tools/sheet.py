import sys
from PIL import Image, ImageDraw
eng=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else None; sfx=sys.argv[3] if len(sys.argv)>3 else ''
d='/workspace/zagros-hero/shots'
P=['000','025','050','075','100']
# mobile: 5 side by side
ms=[Image.open(f'{d}/{eng}-mobile{sfx}-{p}.png').convert('RGB') for p in P]
w,h=ms[0].size; sc=0.5; tw,th=int(w*sc),int(h*sc); g=16
sheet=Image.new('RGB',(5*tw+6*g,th+2*g+28),(11,46,50))
dr=ImageDraw.Draw(sheet)
for i,im in enumerate(ms):
    x=g+i*(tw+g); sheet.paste(im.resize((tw,th),Image.LANCZOS),(x,g)); dr.text((x,th+g+8),f'{P[i].lstrip("0") or "0"}%',fill=(220,240,240))
sheet.save(f'{d}/{out or eng}-mobile-sheet{sfx}.png' if out!='final' else f'{d}/mobile-sheet{sfx}.png')
# desktop: grid 3x2
ds=[Image.open(f'{d}/{eng}-desktop{sfx}-{p}.png').convert('RGB') for p in P]
w,h=ds[0].size; tw,th=w//2,h//2
sheet=Image.new('RGB',(3*tw+4*g,2*(th+28)+3*g),(11,46,50)); dr=ImageDraw.Draw(sheet)
for i,im in enumerate(ds):
    c,r=i%3,i//3; x=g+c*(tw+g); y=g+r*(th+28+g)
    sheet.paste(im.resize((tw,th),Image.LANCZOS),(x,y)); dr.text((x,y+th+8),f'{P[i].lstrip("0") or "0"}%',fill=(220,240,240))
sheet.save(f'{d}/{out or eng}-desktop-sheet{sfx}.png' if out!='final' else f'{d}/desktop-sheet{sfx}.png')
