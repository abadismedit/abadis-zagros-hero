// acorn close-up: acorns resting on the dry ground just before they sprout
const { chromium, webkit } = require(process.env.PWCORE);
const engine = process.argv[2], base = process.argv[3];
(async () => {
  const b = await (engine === 'webkit' ? webkit : chromium).launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const p = await ctx.newPage(); await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(500);
  await p.evaluate(() => { const h = document.getElementById('hero'), s = document.getElementById('zhStage'); scrollTo(0, h.getBoundingClientRect().top + scrollY + (h.offsetHeight - s.offsetHeight) * 0.235); });
  await p.waitForTimeout(1800);
  const boxes = await p.evaluate(() => [...document.querySelectorAll('.zh-piece-acorn')].map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, o: +getComputedStyle(e).opacity }; }).filter(r => r.o > 0.9));
  console.log(JSON.stringify(boxes));
  await p.screenshot({ path: '/tmp/closeup-full.png' });
  await b.close();
})();
