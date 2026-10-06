// usage: node tools/compare.js <chromium|webkit> <ourUrl>
// Section-by-section comparison of our page with the original CSR page (text, images, links, visuals),
// plus a full-page mobile capture of everything after the hero.
const { chromium, webkit } = require(process.env.PWCORE);
const ORIG = 'https://siaamak-ghodsi.github.io/abadis-scroll-scrub-demo/redesign/csr/';
const engine = process.argv[2], OURS = process.argv[3];
const out = '/workspace/zagros-hero/shots';
const collect = ([base, orig]) => {
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const parts = {};
  parts.skip = norm(document.querySelector('.skip').textContent);
  parts.header = norm(document.getElementById('header').textContent);
  document.querySelectorAll('main section').forEach((el, i) => { parts['section' + i + (el.id ? '#' + el.id : '') + '.' + el.className] = norm(el.textContent); });
  parts.footer = norm(document.querySelector('footer').textContent);
  const fix = u => u.replace(base, orig);
  const imgs = [...document.querySelectorAll('img')].filter(i => !i.closest('.zh-stage') || i.closest('.csr-hero')).map(i => i.getAttribute('src').split('/').pop());
  const links = [...document.querySelectorAll('a')].map(a => norm(a.textContent) + ' -> ' + fix(a.href));
  const bg = !!document.querySelector('body > .csr-bg') && !!document.querySelector('body > .csr-veil');
  const switchBtns = [...document.querySelectorAll('.theme-switch button')].map(b => b.dataset.set).join(',');
  return { parts, imgs, links, bg, switchBtns };
};
(async () => {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch();
  const res = { engine };
  for (const [label, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: label === 'mobile' ? 2 : 1, colorScheme: 'light' });
    const o = await ctx.newPage(); await o.goto(ORIG, { waitUntil: 'load' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('console', m => { if (m.type() === 'error') errors.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    p.on('response', r => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });
    p.on('requestfailed', r => errors.push('failed: ' + r.url()));
    await p.goto(OURS, { waitUntil: 'load' });
    const A = await o.evaluate(collect, [ORIG, ORIG]), B = await p.evaluate(collect, [new URL(OURS).href, ORIG]);
    const diffs = [];
    const ka = Object.keys(A.parts), kb = Object.keys(B.parts);
    if (ka.join('|') !== kb.join('|')) diffs.push('section order differs: ' + ka.join(',') + ' VS ' + kb.join(','));
    ka.forEach(k => { if (A.parts[k] !== B.parts[k]) diffs.push('text differs in ' + k); });
    if (A.imgs.join('|') !== B.imgs.join('|')) diffs.push('images differ: ' + A.imgs + ' VS ' + B.imgs);
    A.links.forEach((l, i) => { if (l !== B.links[i]) diffs.push('link ' + i + ': ' + l + ' VS ' + B.links[i]); });
    if (A.links.length !== B.links.length) diffs.push('link count');
    if (!B.bg) diffs.push('csr-bg/veil missing');
    if (A.switchBtns !== B.switchBtns) diffs.push('theme switch differs');
    // visual: everything after the hero, with the fixed background removed on both pages (its offset differs by design)
    const shot = async (pg, f) => {
      await pg.evaluate(() => { document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')); const s = document.createElement('style'); s.textContent = '.csr-bg,.csr-veil{display:none!important}.js .reveal{transition:none!important}'; document.head.appendChild(s); });
      await pg.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await pg.waitForTimeout(900);
      const box = await pg.evaluate(() => { const h = document.querySelector('.zh-track') || document.querySelector('.csr-hero'); return { y: h.getBoundingClientRect().bottom + scrollY, H: document.documentElement.scrollHeight, W: document.documentElement.clientWidth }; });
      await pg.evaluate(() => { document.getElementById('header').style.visibility = 'hidden'; });
      await pg.screenshot({ path: f, fullPage: true, clip: { x: 0, y: box.y, width: box.W, height: box.H - box.y } });
      await pg.evaluate(() => { document.getElementById('header').style.visibility = ''; });
    };
    await shot(o, `/tmp/cmp-${engine}-${label}-orig.png`); await shot(p, `/tmp/cmp-${engine}-${label}-ours.png`);
    const hs = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    // theme toggle: click night, reload, persisted?
    await p.click('.theme-switch button[data-set="dark"]').catch(() => {});
    await p.reload({ waitUntil: 'load' });
    const persisted = await p.evaluate(() => document.documentElement.dataset.theme + '/' + localStorage.getItem('abadis-theme'));
    await p.evaluate(() => localStorage.removeItem('abadis-theme'));
    res[label] = { diffs, errors, hscroll: hs.sw > hs.cw, sections: kb.length, imgs: B.imgs.length, links: B.links.length, persisted };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
