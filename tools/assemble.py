"""Build index.html from the approved CSR page (fetched verbatim with curl into /tmp/csr/index.html).
Changes vs. the original, all non-copy:
  * asset/link paths re-rooted for the new Pages URL (assets copied to ./assets, other redesign pages linked absolutely,
    Kalameh loaded from the template host),
  * theme bootstrap defaults to the system colour scheme when nothing is stored,
  * the .csr-hero section is wrapped in the pinned Zagros scroll scene (section kept verbatim)."""
import re
SRC='/tmp/csr/index.html'
R='https://siaamak-ghodsi.github.io/abadis-scroll-scrub-demo/redesign/'
t=open(SRC,encoding='utf-8').read()

# --- paths ---
t=t.replace('../assets/fonts/kalameh/', R+'assets/fonts/kalameh/')
t=t.replace('"../assets/', '"./assets/')
t=t.replace('"../favicon.ico"', '"./favicon.ico"')
t=t.replace('href="../csr/"', 'href="./"')
t=t.replace('href="../products/"', 'href="'+R+'products/"')
t=t.replace('href="../contact/"', 'href="'+R+'contact/"')
t=t.replace('href="../"', 'href="'+R+'"')
assert '"../' not in t, re.findall(r'"\.\./[^"]*"', t)

# --- theme: default to the system preference when the visitor has not chosen ---
old="t=localStorage.getItem('abadis-theme')}catch(e){}var d=document.documentElement;"
assert old in t
t=t.replace(old, "t=localStorage.getItem('abadis-theme')}catch(e){}if(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';var d=document.documentElement;")

# --- head additions ---
t=t.replace('<link rel="stylesheet" href="./assets/css/site.css">',
 '<link rel="preconnect" href="https://siaamak-ghodsi.github.io" crossorigin>\n<link rel="stylesheet" href="./assets/css/site.css">\n<link rel="stylesheet" href="./zagros-hero.css">\n<link rel="preload" as="image" href="./img/hero/bg-dry.webp" type="image/webp">',1)
t=t.replace('</head>','''<script>if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('zh-reduced');</script>
<noscript><style>.zh-track{height:auto}.zh-stage{position:relative}.zh-bg-green{opacity:1}.zh-canister{opacity:1;transform:translate3d(-50%,0,0)}.zh-hint{display:none}</style></noscript>
</head>''',1)

# --- hero: wrap the verbatim .csr-hero in the pinned scene ---
m=re.search(r'  <section class="csr-hero" aria-label="نجات زاگرس">\n.*?\n  </section>\n',t,re.S)
hero=m.group(0)
def pic(name,cls,prio=''):
    return f'''        <picture>
          <source type="image/webp" srcset="./img/hero/{name}-1280.webp 1280w, ./img/hero/{name}.webp 1920w" sizes="(max-aspect-ratio: 16/9) 177.78vh, 100vw">
          <img class="zh-bg-layer {cls}" src="./img/hero/{name}.jpg" srcset="./img/hero/{name}-1280.jpg 1280w, ./img/hero/{name}.jpg 1920w" sizes="(max-aspect-ratio: 16/9) 177.78vh, 100vw" alt="" width="1920" height="1080" decoding="async"{prio}>
        </picture>'''
hero_ind="".join(("    "+l if l else l)+"\n" for l in hero.rstrip("\n").split("\n"))
stage=f'''  <div class="zh-track" id="hero">
    <div class="zh-stage" id="zhStage">
      <div class="zh-bg" aria-hidden="true">
{pic('bg-dry','zh-bg-dry',' fetchpriority="high"')}
{pic('bg-mid','zh-bg-mid')}
{pic('bg-green','zh-bg-green')}
      </div>
      <div class="zh-spots" id="zhSpots" aria-hidden="true"></div>
      <div class="zh-canister" id="zhCanister" aria-hidden="true">
        <span class="zh-canister-glow"></span>
        <picture>
          <source type="image/webp" srcset="./img/hero/canister.webp">
          <img src="./img/hero/canister.png" alt="" width="399" height="900" decoding="async">
        </picture>
      </div>
      <div class="zh-marks" id="zhMarks" aria-hidden="true"></div>
      <div class="zh-dusk" aria-hidden="true"></div>
      <div class="zh-veil" aria-hidden="true"></div>
      <div class="zh-exit" id="zhExit" aria-hidden="true"></div>
{hero_ind}      <div class="zh-hint" id="zhHint" aria-hidden="true"><i></i></div>
    </div>
  </div>
'''
t=t[:m.start()]+stage+t[m.end():]
t=t.replace('<script src="./assets/js/site.js" defer></script>','<script src="./assets/js/site.js" defer></script>\n<script src="./zagros-hero.js" defer></script>')
open('/workspace/zagros-hero/index.html','w',encoding='utf-8').write(t)
print('ok')
