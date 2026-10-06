// usage: node tools/shoot.js <chromium|webkit> <baseUrl> [light|dark]  (dark = system colour scheme dark, nothing stored)
const { chromium, webkit } = require(process.env.PWCORE);
const engine = process.argv[2], base = process.argv[3], scheme = process.argv[4] || 'light';
const sfx = scheme === 'dark' ? '-night' : '';
const out = '/workspace/zagros-hero/shots';
(async () => {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch();
  const report = [];
  for (const [label, vp, mobile] of [['mobile', { width: 390, height: 844 }, true], ['desktop', { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: engine === 'chromium' ? mobile : undefined, hasTouch: mobile, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', r => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
    page.on('response', r => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });
    await page.goto(base, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const info = [];
    for (const pct of [0, 25, 50, 75, 100]) {
      await page.evaluate(p => {
        const hero = document.getElementById('hero'), stage = document.getElementById('zhStage');
        const top = hero.getBoundingClientRect().top + scrollY;
        scrollTo(0, top + (hero.offsetHeight - stage.offsetHeight) * p);
      }, pct / 100);
      await page.waitForTimeout(1600); // let the lerp settle
      const m = await page.evaluate(() => {
        const c = document.getElementById('zhCanister').getBoundingClientRect();
        return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          can: [Math.round(c.top), Math.round(c.bottom), Math.round(c.left), Math.round(c.right)], vh: innerHeight,
          font: document.fonts.check('900 20px Kalameh'), theme: document.documentElement.dataset.theme };
      });
      info.push({ pct, ...m });
      await page.screenshot({ path: `${out}/${engine}-${label}${sfx}-${String(pct).padStart(3, '0')}.png` });
    }
    // reduced motion check
    const rctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', colorScheme: scheme });
    const rp = await rctx.newPage();
    await rp.goto(base, { waitUntil: 'load' }); await rp.waitForTimeout(600);
    await rp.screenshot({ path: `${out}/${engine}-${label}${sfx}-reduced.png` });
    await rctx.close();
    report.push({ engine, label, errors, info });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
