/* PREVIEW v3: plates-only forest.
   - one canvas that lives INSIDE #zhSpots under every tree (trees occlude plates behind them)
   - readable plates: depth-scaled, collision-avoided, never on trunks/canopies, never under the jar,
     always fully inside the visible stage
   - far names (~900): a soft terrain-tinted texture with feathered edges (no boxes)
   - the jar is simply layered above (no clearing of the canvas) */
(function () {
  'use strict';
  var U = null, canvas, ctx, canvasF, ctxF, stage, spotsEl;
  var dpr = 1, W = 0, H = 0, map = null, built = null, buildSeq = 0, lastP = 0, lastSpots = null, info0 = null;
  var MAIN = ['بیمارستان جماران', 'بیمارستان باهنر کرمان', 'بیمارستان الزهرا اصفهان'];
  var MAIN_SPOT = { tall: [0, 1, 2], wide: [0, 5, 1] };
  var FONT = 'Kalameh, Tahoma, sans-serif';
  var grass = null;   // sampled bg-green pixels for terrain-tinted far plates

  // grown-oak silhouette (fractions of the piece box, measured from grown-oak.png alpha)
  var OAK_AR = 840 / 760, OAK_SINK = 0.035;
  var OAK_RECTS = [
    [0.28, 0.73, 0.00, 0.10], [0.12, 0.90, 0.10, 0.25], [0.00, 1.00, 0.25, 0.70],
    [0.09, 0.89, 0.70, 0.765], [0.33, 0.67, 0.765, 1.0], [0.20, 0.78, 0.88, 1.0]   // last two = trunk, root flare
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hit(a, b, pad) {
    pad = pad || 0;
    return a.l < b.r + pad && b.l < a.r + pad && a.t < b.b + pad && b.t < a.b + pad;
  }
  function isNight() { var t = document.documentElement.dataset.theme; return t === 'dark' || t === 'noir'; }

  function boot() {
    U = window.zhPackUtil;
    canvas = document.getElementById('zhPack');
    stage = document.getElementById('zhStage');
    spotsEl = document.getElementById('zhSpots');
    ctx = canvas.getContext('2d', { alpha: true });
    // front canvas: only for plates that stand nearer than the oak they overlap
    canvasF = document.createElement('canvas');
    canvasF.className = 'zh-pack zh-pack-front'; canvasF.setAttribute('aria-hidden', 'true');
    ctxF = canvasF.getContext('2d', { alpha: true });
    var fg = document.getElementById('zhPackFg'); if (fg) fg.textContent = '';
    // grass colour sampler (same-origin, tiny)
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = 384; c.height = 216;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0, 384, 216);
        grass = { d: g.getImageData(0, 0, 384, 216).data, w: 384, h: 216 };
        if (info0) rebuild();
      } catch (e) { grass = null; }
    };
    img.src = './img/hero/bg-green-1280.jpg';
    if (window.MutationObserver) {
      new MutationObserver(function () { if (info0) rebuild(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }
  function attachCanvas() {
    // live under all trees: spots carry z-index ~ 600..1000, the canvas sits at 0 in the same context
    if (canvas.parentNode !== spotsEl) spotsEl.insertBefore(canvas, spotsEl.firstChild);
    if (canvasF.parentNode !== spotsEl) spotsEl.appendChild(canvasF);
  }
  function screenY(iy) { return map.oy + iy * U.IMG_H * map.s; }
  function sampleGrass(x, y) {
    if (!grass) return [150, 165, 95];
    var ix = (x - map.ox) / map.s, iy = (y - map.oy) / map.s;
    var gx = clamp(Math.round(ix / 1920 * grass.w), 0, grass.w - 1);
    var gy = clamp(Math.round(iy / 1080 * grass.h), 0, grass.h - 1);
    var r = 0, g = 0, b = 0, n = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -2; dx <= 2; dx++) {
      var xx = clamp(gx + dx, 0, grass.w - 1), yy = clamp(gy + dy, 0, grass.h - 1), o = (yy * grass.w + xx) * 4;
      r += grass.d[o]; g += grass.d[o + 1]; b += grass.d[o + 2]; n++;
    }
    return [r / n, g / n, b / n];
  }
  function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // value noise for organic density
  function noise2(seed) {
    var r = U.rng(seed), G = 16, v = [];
    for (var i = 0; i < (G + 1) * (G + 1); i++) v.push(r());
    return function (u, w) {
      u = clamp(u, 0, 0.9999) * G; w = clamp(w, 0, 0.9999) * G;
      var x = Math.floor(u), y = Math.floor(w), fx = smooth(u - x), fy = smooth(w - y);
      var a = v[y * (G + 1) + x], b = v[y * (G + 1) + x + 1], c = v[(y + 1) * (G + 1) + x], d = v[(y + 1) * (G + 1) + x + 1];
      return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
    };
  }

  // ---- geometry snapshot (final state) ----
  function stageRel(el) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top };
  }
  function heroBox() {
    var div = document.querySelector('.csr-hero > div');
    if (!div) return { l: 0, t: 0, r: 0, b: 0 };
    var u = null;
    Array.prototype.forEach.call(div.children, function (c) {
      var r = stageRel(c);
      if (r.r - r.l < 1) return;
      u = u ? { l: Math.min(u.l, r.l), t: Math.min(u.t, r.t), r: Math.max(u.r, r.r), b: Math.max(u.b, r.b) } : r;
    });
    return u || stageRel(div);
  }
  function jarBoxes() {
    var can = document.getElementById('zhCanister');
    if (!can) return { box: null, obs: [] };
    var w = can.offsetWidth, h = can.offsetHeight, cx = can.offsetLeft, t = can.offsetTop, l = cx - w / 2;
    return {
      box: { l: l, r: l + w, t: t, b: t + h },
      obs: [
        { l: l + w * 0.12, r: l + w * 0.90, t: t - 4, b: t + h },            // glass body
        { l: l - w * 0.30, r: l + w * 1.30, t: t + h * 0.88, b: t + h * 1.06 } // base + glow
      ]
    };
  }
  function treeObstacles(spots) {
    var out = [];
    (spots || []).forEach(function (sp) {
      if (sp.gx == null || !sp.H) return;
      var h = sp.H, w = h * OAK_AR, x0 = sp.gx - w / 2, top = sp.gy + h * OAK_SINK - h;
      OAK_RECTS.forEach(function (q, i) {
        out.push({ l: x0 + q[0] * w, r: x0 + q[1] * w, t: top + q[2] * h, b: top + q[3] * h, trunk: i >= 4, base: sp.gy });
      });
    });
    return out;
  }

  // ---- plate sprites ----
  function palette() {
    return isNight()
      ? { a: '#e6d9bc', b: '#cfbe9c', edge: 'rgba(70,52,34,0.62)', ink: '#082427', hi: 'rgba(255,244,220,0.30)', sh: 'rgba(0,0,0,0.30)' }
      : { a: '#ece2c8', b: '#dac9a6', edge: 'rgba(96,72,46,0.48)', ink: '#0b2e32', hi: 'rgba(255,255,255,0.55)', sh: 'rgba(50,36,22,0.22)' };
  }
  var measureCtx = null;
  function plateSize(name, fs) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = '600 ' + fs.toFixed(2) + 'px ' + FONT;
    var tw = measureCtx.measureText(name).width;
    var padX = Math.max(4, fs * 0.72);
    return { w: Math.ceil(tw + padX * 2), h: Math.ceil(fs * 1.55 + 1), tw: tw };
  }
  function makeSprite(name, fs, pal) {
    var sz = plateSize(name, fs), m = 4;
    var c = document.createElement('canvas');
    c.width = Math.ceil((sz.w + m * 2) * dpr); c.height = Math.ceil((sz.h + m * 2 + 2) * dpr);
    var g = c.getContext('2d');
    g.scale(dpr, dpr);
    var x = m, y = m, r = Math.min(2.5, fs * 0.22);
    g.shadowColor = pal.sh; g.shadowBlur = Math.max(1.5, fs * 0.3); g.shadowOffsetY = 1;
    var grd = g.createLinearGradient(0, y, 0, y + sz.h);
    grd.addColorStop(0, pal.a); grd.addColorStop(1, pal.b);
    g.fillStyle = grd; roundRect(g, x, y, sz.w, sz.h, r); g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.lineWidth = 0.8; g.strokeStyle = pal.edge; roundRect(g, x + 0.4, y + 0.4, sz.w - 0.8, sz.h - 0.8, r); g.stroke();
    g.strokeStyle = pal.hi; g.beginPath(); g.moveTo(x + r, y + 1.2); g.lineTo(x + sz.w - r, y + 1.2); g.stroke();
    g.fillStyle = pal.ink; g.font = '600 ' + fs.toFixed(2) + 'px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    try { g.direction = 'rtl'; } catch (e) {}
    g.fillText(name, x + sz.w / 2, y + sz.h / 2 + fs * 0.06);
    return { c: c, w: sz.w, h: sz.h, m: m };
  }

  // ---- layout ----
  function rebuild() {
    if (!info0 || !U) return;
    var seq = ++buildSeq;
    var fontP = document.fonts && document.fonts.load ? document.fonts.load('600 12px Kalameh').catch(function () {}) : Promise.resolve();
    Promise.all([U.ensureSheet(), fontP]).then(function (r) {
      if (seq !== buildSeq) return;
      built = build(r[0].names, lastSpots || []);
      render(lastP);
    });
  }

  function build(names, spots) {
    var desk = W >= 900, key = info0.key;
    var rng = U.rng(key === 'tall' ? 73013 : 73014);
    var hero = heroBox(), jar = jarBoxes(), trees = treeObstacles(spots);
    var pal = palette();
    var M = 6;                                                    // viewport margin
    var jarB = jar.box ? jar.box.b : H - 20;
    var visBot = Math.min(H - M, jarB + H * 0.01);                // stays above Safari's bottom bar
    var readTop = Math.max(hero.b + 14, screenY(desk ? 0.655 : 0.632));
    var placed = [];                                              // rects of readable plates
    var hard = jar.obs.concat(trees).concat([{ l: hero.l - 6, r: hero.r + 6, t: hero.t - 6, b: hero.b + 10 }]);

    function rectAt(x, y, sz) { return { l: x - sz.w / 2, r: x + sz.w / 2, t: y - sz.h, b: y }; }
    function inView(rc) { return rc.l >= M && rc.r <= W - M && rc.t >= readTop - 2 && rc.b <= visBot; }
    var lastFront = false;
    function free(rc, gap) {
      lastFront = false;
      for (var i = 0; i < hard.length; i++) {
        var o = hard[i];
        if (!hit(rc, o, o.trunk ? 5 : 3)) continue;
        if (o.base != null && !o.trunk && rc.b > o.base + 4) { lastFront = true; continue; }   // plate is in front of this oak
        return false;
      }
      // a front plate must not be overlapped by any oak that is nearer than it (would need to be behind it)
      for (var j = 0; j < placed.length; j++) if (hit(rc, placed[j], gap)) return false;
      return true;
    }

    // 1) the three main plates near their foreground oaks, clear of the jar and trunks
    var mains = [], idx = MAIN_SPOT[key] || MAIN_SPOT.tall;
    var fsMain = desk ? 12.2 : 10.6;
    idx.forEach(function (si, ni) {
      var sp = spots[si]; if (!sp || sp.gx == null) return;
      var sz = plateSize(MAIN[ni], fsMain);
      var toC = sp.gx < W / 2 ? 1 : -1, best = null, bestD = 1e9;
      var cands = [];
      for (var dy = -sp.H * 0.12; dy <= sp.H * 0.30 + 40; dy += 4) {
        for (var dx = -sp.H * 0.9 - sz.w; dx <= sp.H * 0.9 + sz.w; dx += 5) cands.push([sp.gx + dx, sp.gy + 4 + dy]);
      }
      cands.forEach(function (cd) {
        var rc = rectAt(cd[0], cd[1], sz);
        if (!inView(rc) || !free(rc, 8)) return;
        // prefer: just beside/below the trunk, leaning toward the centre, close to the ground line
        var d = Math.abs(cd[1] - (sp.gy + 6)) * 1.6 + Math.abs(cd[0] - (sp.gx + toC * (sz.w * 0.5 + sp.H * 0.12))) * 1.0;
        if (d < bestD) { bestD = d; best = cd; }
      });
      if (!best) {   // fallback: anywhere in the field, nearest to the spot
        for (var y = readTop + sz.h + 4; y <= visBot; y += 6) for (var x = M + sz.w / 2; x <= W - M - sz.w / 2; x += 8) {
          var rc2 = rectAt(x, y, sz);
          if (!inView(rc2) || !free(rc2, 8)) continue;
          var d2 = Math.hypot(x - sp.gx, y - sp.gy);
          if (d2 < bestD) { bestD = d2; best = [x, y]; }
        }
      }
      if (!best) return;
      var rc3 = rectAt(best[0], best[1], sz);
      free(rc3, 8); var fr3 = lastFront;
      placed.push(rc3);
      mains.push({ name: MAIN[ni], x: best[0], y: best[1], sp: sp, spr: makeSprite(MAIN[ni], fsMain, pal), rot: -toC * 1.0, rc: rc3, front: fr3 });
    });

    // 2) readable plates spread over the whole field with depth (small far -> larger near)
    var pool = names.slice(3), pi = 0, readable = [], skipped = [], fails = 0;
    var fsFar = desk ? 7.4 : 6.4, fsNear = desk ? 10.4 : 8.7;
    var area = W * Math.max(0, visBot - readTop);
    var target = Math.min(desk ? 120 : 40, Math.round(area / (desk ? 3400 : 2300)));
    var REJ = { target: target, skipped: 0 };
    var consecutive = 0, NC = desk ? 1600 : 1400;
    while (readable.length < target && pi < pool.length && consecutive < 10) {
      var name = pool[pi++], best = null, bestS = -1;
      for (var c = 0; c < NC; c++) {
        var kk = Math.pow(rng(), 0.9);
        var y = lerp(readTop + 10, visBot, kk);
        var k = (y - readTop) / Math.max(1, visBot - readTop);
        var fs = lerp(fsFar, fsNear, smooth(k));
        var sz = plateSize(name, fs);
        if (sz.w > W - 2 * M) continue;
        var x = lerp(M + sz.w / 2, W - M - sz.w / 2, rng());
        var rc = rectAt(x, y, sz);
        if (!inView(rc) || !free(rc, lerp(3, 7, k))) continue;
        // best-candidate: keep the spot farthest from plates already placed (even spread, no clumps)
        var sc = 1e6;
        for (var q = 0; q < placed.length; q++) {
          var pc = placed[q], dx = (pc.l + pc.r) / 2 - x, dy = ((pc.t + pc.b) / 2 - (rc.t + rc.b) / 2) * 2.2;
          var dd = dx * dx + dy * dy; if (dd < sc) sc = dd;
        }
        if (sc > bestS) { bestS = sc; best = { x: x, y: y, k: k, fs: fs, rc: rc, front: lastFront }; }
      }
      if (!best) { skipped.push(name); REJ.skipped++; consecutive++; continue; }
      consecutive = 0;
      placed.push(best.rc);
      readable.push({ name: name, x: best.x, y: best.y, k: best.k, rc: best.rc, fs: best.fs, rot: (rng() - 0.5) * 3.2, spr: null, delay: 0, front: best.front });
    }
    // reveal order: distance first, then forward, with jitter -> calm wave toward the viewer
    readable.forEach(function (it) { it.delay = 0.30 + clamp(it.k * 0.34 + rng() * 0.16, 0, 0.5); it.spr = makeSprite(it.name, it.fs, pal); });

    // 3) far names: soft terrain-tinted texture, feathered, drawn into 3 band canvases for a staggered reveal
    var far = skipped.concat(pool.slice(pi));
    // far strip: distant green foothills + far field; thins out quickly toward the viewer
    var bandTop = Math.max(hero.b + 24, screenY(desk ? 0.598 : 0.585));
    var bandBot = Math.min(visBot, desk ? Math.min(screenY(0.765), readTop + 90) : screenY(0.705));
    var hz = Math.max(1, screenY(desk ? 0.70 : 0.672) - bandTop);   // depth span of the texture
    var nz = noise2(key === 'tall' ? 991 : 992), nz2 = noise2(key === 'tall' ? 4441 : 4442);
    var bandH = Math.ceil(bandBot - bandTop + 8), fdpr = Math.min(dpr, desk ? 1.5 : 2);
    var layers = [0, 1, 2].map(function () {
      var c = document.createElement('canvas');
      c.width = Math.ceil(W * fdpr); c.height = Math.ceil(bandH * fdpr);
      var g = c.getContext('2d'); g.scale(fdpr, fdpr); g.translate(0, -bandTop);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      try { g.direction = 'rtl'; } catch (e) {}
      return { c: c, g: g };
    });
    var CELL = 4, gw = Math.ceil(W / CELL) + 1, gh = Math.ceil(bandH / CELL) + 1, occ = new Uint8Array(gw * gh);
    function occMax(rc) {
      var x0 = clamp(Math.floor(rc.l / CELL), 0, gw - 1), x1 = clamp(Math.floor(rc.r / CELL), 0, gw - 1);
      var y0 = clamp(Math.floor((rc.t - bandTop) / CELL), 0, gh - 1), y1 = clamp(Math.floor((rc.b - bandTop) / CELL), 0, gh - 1), m = 0;
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) { var v = occ[yy * gw + xx]; if (v > m) m = v; }
      return m;
    }
    function occAdd(rc) {
      var x0 = clamp(Math.floor(rc.l / CELL), 0, gw - 1), x1 = clamp(Math.floor(rc.r / CELL), 0, gw - 1);
      var y0 = clamp(Math.floor((rc.t - bandTop) / CELL), 0, gh - 1), y1 = clamp(Math.floor((rc.b - bandTop) / CELL), 0, gh - 1);
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) if (occ[yy * gw + xx] < 250) occ[yy * gw + xx]++;
    }
    var mc = measureCtx, farCount = 0;
    var softHard = [{ l: hero.l - 10, r: hero.r + 10, t: hero.t - 10, b: hero.b + 6 }];
    far.forEach(function (name, fi) {
      for (var a = 0; a < 90; a++) {
        var forced = a >= 70;
        var cap = a < 25 ? 1 : a < 45 ? 2 : a < 60 ? 3 : a < 70 ? 4 : 99;
        var fy = lerp(bandTop + 2, bandBot, Math.pow(rng(), desk ? 1.5 : 1.8));   // denser in the distance
        var kf = clamp((fy - bandTop) / hz, 0, 1.3);
        var fs = lerp(desk ? 2.0 : 1.5, desk ? 5.0 : 3.6, Math.min(1, kf));
        mc.font = '600 ' + fs.toFixed(2) + 'px ' + FONT;
        var pw = mc.measureText(name).width + fs * 1.1, ph = fs * 1.5;
        var fx = lerp(M + pw / 2, W - M - pw / 2, rng());
        var rc = { l: fx - pw / 2, r: fx + pw / 2, t: fy - ph, b: fy };
        // density: organic noise x soft vertical/horizontal falloff (never a box edge)
        var u = fx / W, vv = (fy - bandTop) / Math.max(1, bandBot - bandTop);
        var dens = Math.pow(0.2 + 0.8 * nz(u, vv * 0.6), 1.4) * (0.55 + 0.45 * nz2(u * 1.7 % 1, vv));
        dens *= smooth(vv / 0.14) * (1 - smooth((vv - 0.35) / 0.65) * 0.9);
        dens *= smooth(Math.min(u, 1 - u) / 0.07);
        if (!forced && rng() > dens) continue;
        if (forced && rng() > 0.25 + dens) continue;
        var bad = false;
        for (var i = 0; i < placed.length; i++) if (hit(rc, placed[i], 4)) { bad = true; break; }
        if (!bad) for (var j = 0; j < softHard.length; j++) if (hit(rc, softHard[j], 0)) { bad = true; break; }
        if (bad || occMax(rc) >= cap) continue;
        occAdd(rc);
        // atmospheric perspective: far plates take on the field's own colour, low contrast
        var gcol = sampleGrass(fx, fy - ph / 2);
        var kc = Math.min(1, kf);
        var haze = isNight() ? [200, 205, 190] : [232, 234, 222];
        var wood = mixc([228, 214, 182], haze, 0.35 * (1 - kc));
        var fill = mixc(mixc(gcol, haze, 0.18), wood, 0.16 + 0.5 * kc);
        var ink = mixc(mixc(gcol, [20, 30, 20], 0.5), [11, 46, 50], 0.55 * kc);
        var alpha = (desk ? 0.40 + 0.46 * kc : 0.26 + 0.40 * kc) * (0.65 + 0.35 * nz2(u, vv));
        var L = layers[fi % 3].g;
        L.save(); L.translate(fx, fy); L.rotate((rng() - 0.5) * 0.10);
        L.globalAlpha = alpha;
        L.fillStyle = rgba(fill, 1); roundRect(L, -pw / 2, -ph, pw, ph, Math.min(1.4, fs * 0.25)); L.fill();
        if (fs > 3.2) { L.strokeStyle = rgba(gcol.map(function (c) { return c * 0.55; }), 0.35); L.lineWidth = 0.5; L.stroke(); }
        L.fillStyle = rgba(ink, 0.55 + 0.4 * kc);
        L.font = '600 ' + fs.toFixed(2) + 'px ' + FONT;
        L.fillText(name, 0, -ph / 2 + fs * 0.05);
        L.restore();
        farCount++;
        return;
      }
    });
    // final feather masks (vertical + horizontal) so the texture melts into the grass
    layers.forEach(function (Ly) {
      var g = Ly.g;
      g.save(); g.globalCompositeOperation = 'destination-in';
      var v = g.createLinearGradient(0, bandTop, 0, bandBot);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.14, 'rgba(0,0,0,0.75)'); v.addColorStop(0.3, 'rgba(0,0,0,1)');
      v.addColorStop(0.8, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0.4)');
      g.fillStyle = v; g.fillRect(0, bandTop - 4, W, bandH + 8);
      var hgr = g.createLinearGradient(0, 0, W, 0);
      hgr.addColorStop(0, 'rgba(0,0,0,0)'); hgr.addColorStop(0.06, 'rgba(0,0,0,1)');
      hgr.addColorStop(0.94, 'rgba(0,0,0,1)'); hgr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hgr; g.fillRect(0, bandTop - 4, W, bandH + 8);
      g.restore();
    });

    return { mains: mains, readable: readable, layers: layers, bandTop: bandTop, bandH: bandH, farCount: farCount,
      dbg: { hard: hard, rej: REJ, hero: hero, jar: jar.box, jarObs: jar.obs, readTop: readTop, visBot: visBot, trees: trees.length, farTotal: far.length } };
  }

  // ---- per-frame ----
  function drawSprite(s, x, y, rot, a, front) {
    var c = front ? ctxF : ctx;
    c.save();
    c.globalAlpha = a;
    c.translate(x, y);
    if (rot) c.rotate(rot * Math.PI / 180);
    c.drawImage(s.c, -s.w / 2 - s.m, -s.h - s.m, s.c.width / dpr, s.c.height / dpr);
    c.restore();
  }
  function render(p) {
    if (!built || !ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctxF.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxF.clearRect(0, 0, W, H);
    // far texture: three staggered soft fades
    built.layers.forEach(function (L, j) {
      var a = smooth((p - (0.28 + j * 0.11)) / 0.2);
      if (a <= 0.005) return;
      ctx.globalAlpha = a;
      ctx.drawImage(L.c, 0, built.bandTop, W, built.bandH);
    });
    ctx.globalAlpha = 1;
    built.readable.forEach(function (it) {
      var a = smooth((p - it.delay) / 0.14);
      if (a <= 0.005) return;
      drawSprite(it.spr, it.x, it.y + (1 - a) * 5, it.rot, a * 0.96, it.front);
    });
    if (/dbg=1/.test(location.search)) {
      ctxF.save(); ctxF.globalAlpha = 1; ctxF.lineWidth = 1;
      built.dbg.hard.forEach(function (o) { ctxF.strokeStyle = o.trunk ? 'red' : o.base != null ? 'blue' : 'magenta'; ctxF.strokeRect(o.l, o.t, o.r - o.l, o.b - o.t); });
      ctxF.strokeStyle = 'yellow'; ctxF.beginPath(); ctxF.moveTo(0, built.dbg.readTop); ctxF.lineTo(W, built.dbg.readTop); ctxF.moveTo(0, built.dbg.visBot); ctxF.lineTo(W, built.dbg.visBot); ctxF.stroke();
      ctxF.restore();
    }
    built.mains.forEach(function (m) {
      var fall = m.sp.fall != null ? m.sp.fall : clamp((p - 0.07) / 0.09, 0, 1);
      var a = smooth((fall - 0.85) / 0.15);
      if (a <= 0.005) return;
      drawSprite(m.spr, m.x, m.y + (1 - a) * 6, m.rot, a, m.front);
    });
  }

  window.zhPack = {
    layout: function (spots, info) {
      if (!U) boot();
      attachCanvas();
      W = info.W; H = info.H; info0 = info; lastSpots = spots;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      canvasF.width = canvas.width; canvasF.height = canvas.height;
      canvasF.style.width = W + 'px'; canvasF.style.height = H + 'px';
      map = U.coverMap(W, H);
      rebuild();
    },
    render: function (p, spots) {
      if (!U) return;
      if (spots) lastSpots = spots;
      lastP = p;
      render(p);
    },
    debug: function () {
      if (!built) return null;
      var all = built.mains.map(function (m) { return m.rc; }).concat(built.readable.map(function (r) { return r.rc; }));
      var overlaps = 0, off = 0, jarHits = 0, j = built.dbg.jar;
      for (var a = 0; a < all.length; a++) {
        if (all[a].l < 0 || all[a].r > W || all[a].t < 0 || all[a].b > H) off++;
        built.dbg.jarObs.forEach(function (o) { if (hit(all[a], o)) jarHits++; });
        for (var b = a + 1; b < all.length; b++) if (hit(all[a], all[b])) overlaps++;
      }
      return { mains: built.mains.map(function (m) { return [m.name, Math.round(m.rc.l), Math.round(m.rc.t), Math.round(m.rc.r), Math.round(m.rc.b)]; }),
        readable: built.readable.length, front: built.readable.filter(function (r) { return r.front; }).length, far: built.farCount, farTotal: built.dbg.farTotal, overlaps: overlaps, offscreen: off, jarHits: jarHits,
        jar: j && [Math.round(j.l), Math.round(j.t), Math.round(j.r), Math.round(j.b)], rej: built.dbg.rej, hero: built.dbg.hero, readTop: Math.round(built.dbg.readTop), visBot: Math.round(built.dbg.visBot) };
    }
  };
  boot();
})();
