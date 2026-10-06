// Marker verification: node tools/markers.js <chromium|webkit> <base> [outdir]
const pw = require(process.env.PWCORE);
const [engine, base, out = '/workspace/zagros-hero/shots'] = process.argv.slice(2);
(async () => {
  const b = await pw[engine].launch();
  let bad = 0;
  for (const theme of ['light', 'dark', 'noir']) {
    for (const [label, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
      for (const reduced of [false, true]) {
        if (theme === 'noir' && reduced) continue;
        const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: theme === 'light' ? 'light' : 'dark', reducedMotion: reduced ? 'reduce' : 'no-preference' });
        await ctx.addInitScript(t => { try { localStorage.setItem('abadis-theme', t); } catch (e) {} }, theme);
        const p = await ctx.newPage(); const errs = [];
        p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        await p.goto(base + '/', { waitUntil: 'load' });
        await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
        const ps = reduced ? [null] : [0.212, 0.80, 1];
        for (const pr of ps) {
          if (pr !== null) {
            await p.evaluate(pr => { const h = document.getElementById('hero'), st = document.getElementById('zhStage'); scrollTo(0, h.getBoundingClientRect().top + scrollY + (h.offsetHeight - st.offsetHeight) * pr); }, pr);
            await p.waitForTimeout(1500);
            await p.evaluate(pr => window.__zagrosHero.set(pr), pr);
          }
          await p.waitForTimeout(300);
          const r = await p.evaluate(() => {
            const plates = [...document.querySelectorAll('.zh-mark-plate')];
            const rs = plates.map(e => e.getBoundingClientRect());
            const hero = document.querySelector('.csr-hero > div').getBoundingClientRect();
            const can = document.getElementById('zhCanister'), cr = can.getBoundingClientRect(), cop = +getComputedStyle(can).opacity;
            const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            const res = [];
            rs.forEach((a, i) => {
              if (hit(a, hero)) res.push(i + ' x hero');
              if (cop > 0.05 && hit(a, cr)) res.push(i + ' x canister');
              rs.forEach((c, j) => { if (j > i && hit(a, c)) res.push(i + ' x ' + j); });
              if (a.left < 0 || a.right > innerWidth || a.bottom > innerHeight) res.push(i + ' offscreen');
            });
            const info = plates.map((e, i) => ({ t: e.textContent, h: Math.round(rs[i].height * 10) / 10, op: +getComputedStyle(e.parentNode).opacity }));
            return { res, info, hscroll: document.documentElement.scrollWidth > innerWidth, theme: document.documentElement.getAttribute('data-theme') };
          });
          const tag = `${engine}-${label}-${theme}-${reduced ? 'reduced' : Math.round(pr * 100)}`;
          await p.screenshot({ path: `${out}/mk-${tag}.png` });
          const minH = Math.min(...r.info.map(i => i.h)), minOp = Math.min(...r.info.map(i => i.op));
          const visibleExpected = reduced || pr >= 0.212;
          const fail = errs.length || r.res.length || r.hscroll || r.info.length !== 3 || (visibleExpected && minOp < 0.99) || minH < 15 || r.theme !== (theme === 'light' ? null : theme) && !(theme === 'light' && r.theme === 'light');
          if (fail) bad++;
          console.log(fail ? 'FAIL' : 'ok  ', tag, 'theme=' + r.theme, 'plateH(min)=' + minH, 'op(min)=' + minOp, JSON.stringify(r.res), errs.length ? JSON.stringify(errs) : '');
        }
        await ctx.close();
      }
    }
  }
  await b.close();
  console.log(engine, bad ? bad + ' FAIL' : 'ALL OK');
})();
