from PIL import Image
import os
S='/workspace/zagros-hero/src'; O='/workspace/zagros-hero/img/hero'
os.makedirs(O,exist_ok=True)
def crop(im): return im.crop(im.getchannel('A').getbbox())
# backgrounds
for src,dst in [('ground1-dry-notrees-1920x1080.jpg','bg-dry'),('ground2-mid-notrees-1920x1080.jpg','bg-mid'),('ground3-green-notrees-1920x1080.jpg','bg-green')]:
    im=Image.open(f'{S}/{src}').convert('RGB')
    im.save(f'{O}/{dst}.webp',quality=78,method=6)
    im.save(f'{O}/{dst}.jpg',quality=80,optimize=True,progressive=True)
    s=im.resize((1280,720),Image.LANCZOS)
    s.save(f'{O}/{dst}-1280.webp',quality=78,method=6)
    s.save(f'{O}/{dst}-1280.jpg',quality=80,optimize=True,progressive=True)
# pieces: (file, source dir, max height)
P=[('acorn','graded',132,'acorn'),('sprout','graded',380,'sprout'),('sapling','graded',560,'sapling'),
   ('4-young-oak','tinted',680,'young-oak'),('5-grown-oak','tinted',760,'grown-oak'),('canister','graded',900,'canister')]
for f,d,h,dst in P:
    im=crop(Image.open(f'{S}/{d}/{f}.png').convert('RGBA'))
    if im.height>h: im=im.resize((round(im.width*h/im.height),h),Image.LANCZOS)
    im.save(f'{O}/{dst}.webp',quality=82,method=6)
    im.quantize(256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.FLOYDSTEINBERG).save(f'{O}/{dst}.png',optimize=True)
    print(dst,im.size)
