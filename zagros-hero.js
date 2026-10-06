/* Abadis — Zagros oak scroll-scrubbed hero (prototype)
   Only transform / opacity are animated, driven by one rAF loop with lerp smoothing. */
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  var stage = document.getElementById('zhStage');
  var spotsEl = document.getElementById('zhSpots');
  var canister = document.getElementById('zhCanister');
  var hint = document.getElementById('zhHint');
  var exitEl = document.getElementById('zhExit');
  var marksEl = document.getElementById('zhMarks');
  var bgMid = stage.querySelector('.zh-bg-mid');
  var bgGreen = stage.querySelector('.zh-bg-green');
  var root = document.documentElement;

  var IMG_W = 1920, IMG_H = 1080, POS_Y = 0.6;   // must match .bg-layer object-position
  var HORIZON = 0.6;                              // image-space y where trees would be 0 tall
  var NEAR_Y = 0.95;                              // image-space y of the reference (largest) tree
  var MAX_TREE = 0.42;                            // grown oak height at NEAR_Y, fraction of image height

  // growth stages: file, height relative to the grown oak, aspect (w/h), how far the base sinks into the ground
  var STAGES = [
    { f: 'acorn',     h: 0.105, ar: 124 / 132, sink: 0.10 },
    { f: 'sprout',    h: 0.21,  ar: 317 / 380, sink: 0.14 },
    { f: 'sapling',   h: 0.47,  ar: 271 / 560, sink: 0.02 },
    { f: 'young-oak', h: 0.73,  ar: 511 / 680, sink: 0.025 },
    { f: 'grown-oak', h: 1.0,   ar: 840 / 760, sink: 0.035 }
  ];

  // spot layouts: u = fraction of the *visible* width, y = image-space ground height, o = planting order
  var LAYOUT_WIDE = [
    { u: 0.11, y: 0.885, o: 2 }, { u: 0.30, y: 0.775, o: 0 }, { u: 0.205, y: 0.69, o: 5 },
    { u: 0.385, y: 0.705, o: 3 }, { u: 0.64, y: 0.745, o: 1 }, { u: 0.86, y: 0.86, o: 4 },
    { u: 0.935, y: 0.70, o: 6 }, { u: 0.755, y: 0.675, o: 7 }
  ];
  var LAYOUT_TALL = [
    { u: 0.17, y: 0.86, o: 1 }, { u: 0.84, y: 0.80, o: 0 }, { u: 0.29, y: 0.705, o: 3 },
    { u: 0.74, y: 0.685, o: 4 }, { u: 0.02, y: 0.735, o: 2 }, { u: 0.47, y: 0.655, o: 5 }
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  // hospital name markers: small painted wooden stakes at the base of three foreground spots
  var MARK_NAMES = ['بیمارستان جماران', 'بیمارستان باهنر کرمان', 'بیمارستان الزهرا اصفهان'];
  var MARK_MAP = { tall: { 0: 0, 1: 1, 2: 2 }, wide: { 0: 0, 5: 1, 1: 2 } };   // spot index -> name
  var marks = [], marksKey = '', stageW = 0, canBox = null;

  function buildMarks(key) {
    marksEl.textContent = '';
    marks = [];
    var map = MARK_MAP[key];
    spots.forEach(function (sp, i) {
      if (!(i in map)) return;
      var el = document.createElement('div');
      el.className = 'zh-mark';
      el.innerHTML = '<i class="zh-mark-foot"></i><i class="zh-mark-stick"></i><span class="zh-mark-plate"><span class="zh-mark-txt"></span></span>';
      el.querySelector('.zh-mark-txt').textContent = MARK_NAMES[map[i]];
      marksEl.appendChild(el);
      marks.push({ sp: sp, el: el, plate: el.querySelector('.zh-mark-plate'), w: 0, side: 1 });
    });
    marksKey = key;
  }
  function layoutMarks(key, W) {
    if (!marksEl) return;
    if (key !== marksKey || !marks.length) buildMarks(key);
    marks.forEach(function (m) {
      m.side = m.sp.gx < W / 2 ? 1 : -1;            // stakes lean toward the centre of the screen
      m.w = m.plate.offsetWidth; m.h = m.plate.offsetHeight;
      m.lift = parseFloat(getComputedStyle(m.plate).bottom) || 16;
    });
    // final (risen) canister box, so a marker never ends up in front of it
    canBox = { l: canister.offsetLeft - canister.offsetWidth / 2, r: canister.offsetLeft + canister.offsetWidth / 2,
               t: canister.offsetTop, b: canister.offsetTop + canister.offsetHeight };
  }
  function renderMarks() {
    if (!marks.length) return;
    var desk = stageW >= 900, maxH = 0;
    marks.forEach(function (m) { if (m.sp.H > maxH) maxH = m.sp.H; });
    marks.forEach(function (m) {
      var sp = m.sp;
      var appear = smooth(clamp((sp.fall - 0.85) / 0.15, 0, 1));   // once the acorn has landed
      var ds = clamp(0.8 + 0.2 * (sp.H / maxH), 0.82, 1);         // farther spots get smaller markers
      var x = sp.gx + m.side * (sp.H * 0.15 + (desk ? 12 : 9));
      var y = sp.gy + 2 + (1 - appear) * 6;
      var half = m.w * ds / 2;
      if (canBox) {
        var pt = sp.gy - m.lift - m.h * ds, pb = sp.gy - m.lift + 8;
        if (pb > canBox.t && pt < canBox.b) {
          if (sp.gx < stageW / 2) x = Math.min(x, canBox.l - 8 - half);
          else x = Math.max(x, canBox.r + 8 + half);
        }
      }
      var px = clamp(x, half + 6, stageW - half - 6) - x;   // plate stays on screen
      var tr = 'translateX(calc(-50% + ' + px.toFixed(1) + 'px)) rotate(' + (m.side * -1.5) + 'deg) scale(' + ds.toFixed(3) + ')';
      if (tr !== m._tr) { m.plate.style.transform = tr; m._tr = tr; }
      var o = appear.toFixed(3);
      if (o !== m._o) { m.el.style.opacity = o; m._o = o; }
      m.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    });
  }

  function pictureFor(name) {
    var pic = document.createElement('picture');
    var src = document.createElement('source');
    src.type = 'image/webp';
    src.srcset = './img/hero/' + name + '.webp';
    var img = document.createElement('img');
    img.src = './img/hero/' + name + '.png';
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    pic.appendChild(src); pic.appendChild(img);
    return pic;
  }

  var spots = [];
  var layoutKey = '';
  var stageH = 0, heroTop = 0, track = 1;

  function build(layout) {
    spotsEl.textContent = '';
    spots = [];
    var n = layout.length;
    layout.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'zh-spot';
      var shadow = document.createElement('div');
      shadow.className = 'zh-shadow';
      el.appendChild(shadow);
      var ashadow = document.createElement('div');
      ashadow.className = 'zh-ashadow';
      el.appendChild(ashadow);
      var pieces = STAGES.map(function (st) {
        var p = document.createElement('div');
        p.className = 'zh-piece zh-piece-' + st.f;
        p.appendChild(pictureFor(st.f));
        el.appendChild(p);
        return p;
      });
      spotsEl.appendChild(el);
      spots.push({ d: d, el: el, shadow: shadow, ashadow: ashadow, pieces: pieces, delay: (d.o / Math.max(1, n - 1)) * 0.075, H: 0 });
    });
  }

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight;
    stageH = H;
    var rect = hero.getBoundingClientRect();
    heroTop = rect.top + (window.pageYOffset || document.documentElement.scrollTop);
    track = Math.max(1, hero.offsetHeight - H);

    var tall = W / H < 0.9;
    var key = tall ? 'tall' : 'wide';
    if (key !== layoutKey) { build(tall ? LAYOUT_TALL : LAYOUT_WIDE); layoutKey = key; }

    // object-fit: cover mapping of the background
    var s = Math.max(W / IMG_W, H / IMG_H);
    var ox = (W - IMG_W * s) / 2, oy = (H - IMG_H * s) * POS_Y;
    var visW = W / s;                       // visible image width in image px
    var visX0 = (-ox) / s;
    var sizeMul = clamp(0.56 + (visW - 520) / (1700 - 520) * 0.44, 0.56, 1);

    spots.forEach(function (sp) {
      var ix = visX0 + sp.d.u * visW;
      var iy = sp.d.y;
      var x = ox + ix * s, y = oy + iy * IMG_H * s;
      var k = clamp((iy - HORIZON) / (NEAR_Y - HORIZON), 0.12, 1.1);
      var treeH = MAX_TREE * IMG_H * s * k * sizeMul;    // grown oak height in CSS px
      sp.H = treeH; sp.gx = x; sp.gy = y;
      sp.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      sp.el.style.zIndex = String(Math.round(iy * 1000));
      STAGES.forEach(function (st, i) {
        var h = Math.max(st.h * treeH, i === 0 ? 16 : 0);
        var w = h * st.ar;
        var p = sp.pieces[i];
        p.style.width = w.toFixed(1) + 'px';
        p.style.left = (-w / 2).toFixed(1) + 'px';
        p.style.bottom = (-h * st.sink).toFixed(1) + 'px';
        p._h = h;
      });
      var sw = treeH * 0.95, sh = sw * 0.16;
      sp.shadow.style.width = sw.toFixed(1) + 'px';
      sp.shadow.style.height = sh.toFixed(1) + 'px';
      sp.shadow.style.left = (-sw / 2).toFixed(1) + 'px';
      sp.shadow.style.bottom = (-sh / 2).toFixed(1) + 'px';
      var aw = sp.pieces[0]._h * 1.6, ah = aw * 0.32;
      sp.ashadow.style.width = aw.toFixed(1) + 'px';
      sp.ashadow.style.height = ah.toFixed(1) + 'px';
      sp.ashadow.style.left = (-aw / 2).toFixed(1) + 'px';
      sp.ashadow.style.bottom = (-ah * 0.45).toFixed(1) + 'px';
    });
    stageW = W;
    layoutMarks(key, W);
  }

  function render(p) {
    // background: dry -> mid -> green
    bgMid.style.opacity = smooth(seg(p, 0.20, 0.48)).toFixed(3);
    bgGreen.style.opacity = smooth(seg(p, 0.46, 0.76)).toFixed(3);

    for (var i = 0; i < spots.length; i++) {
      var sp = spots[i], d = sp.delay, P = sp.pieces;
      var fall = seg(p, 0.07 + d, 0.16 + d);
      sp.fall = fall;
      var x = [
        smooth(seg(p, 0.22 + d, 0.29 + d)),   // acorn -> sprout
        smooth(seg(p, 0.36 + d, 0.43 + d)),   // sprout -> sapling
        smooth(seg(p, 0.50 + d, 0.57 + d)),   // sapling -> young oak
        smooth(seg(p, 0.63 + d, 0.70 + d))    // young -> grown
      ];
      // acorn: falls gently, lands, then settles into the soil as the sprout appears
      var e = easeOut(fall);
      var drop = -(1 - e) * Math.max(70, sp.H * 0.55);
      var rot = (1 - e) * -28;
      var sinkIn = x[0] * P[0]._h * 0.25;
      var aOp = Math.min(1, fall * 2.5) * (1 - x[0]);
      P[0].style.opacity = aOp.toFixed(3);
      var near = e * e;
      sp.ashadow.style.opacity = (near * (1 - x[0] * 0.85)).toFixed(3);
      sp.ashadow.style.transform = 'scale(' + mix(1.5, 1, near).toFixed(3) + ')';
      P[0].style.transform = 'translate3d(0,' + (drop + sinkIn).toFixed(1) + 'px,0) rotate(' + rot.toFixed(1) + 'deg) scale(' + (1 - 0.25 * x[0]).toFixed(3) + ')';

      // stages 1..4: crossfade with a gentle growth scale that bridges the size difference
      for (var j = 1; j < 5; j++) {
        var inT = x[j - 1], outT = j < 4 ? x[j] : 0;
        var op = inT * (1 - outT);
        var piece = P[j];
        if (op <= 0.001) {
          if (piece._op !== 0) { piece.style.opacity = '0'; piece._op = 0; }
          continue;
        }
        var ratioIn = STAGES[j - 1].h / STAGES[j].h;         // start smaller, closer to previous stage
        var ratioOut = j < 4 ? STAGES[j + 1].h / STAGES[j].h : 1;
        var sc = mix(mix(1, ratioIn, 0.35), 1, inT) * mix(1, mix(1, ratioOut, 0.25), outT);
        if (j === 4) sc *= mix(0.965, 1, smooth(seg(p, 0.70 + d, 0.9)));   // keeps maturing calmly
        piece.style.opacity = op.toFixed(3);
        piece._op = op;
        piece.style.transform = 'scale(' + sc.toFixed(4) + ')';
      }

      // contact shadow grows with the tree
      var g = x[0] * 0.18 + x[1] * 0.27 + x[2] * 0.25 + x[3] * 0.3;
      sp.shadow.style.opacity = (Math.min(1, g * 1.05) * 0.95).toFixed(3);
      sp.shadow.style.transform = 'scale(' + mix(0.15, 1, g).toFixed(3) + ',' + mix(0.4, 1, g).toFixed(3) + ')';
    }

    // canister rises calmly at the end
    var c = smooth(seg(p, 0.80, 0.95));
    canister.style.opacity = Math.min(1, c * 1.6).toFixed(3);
    canister.style.transform = 'translate3d(-50%,' + ((1 - c) * 26).toFixed(2) + '%,0)';

    hint.style.opacity = (1 - seg(p, 0, 0.04)).toFixed(3);
    renderMarks();

  }

  // ---------- scroll -> target, rAF lerp -> current ----------
  var target = 0, current = 0, rafId = 0, lastT = 0;
  var reduced = false;

  var lastExit = -1;
  function readTarget() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    target = clamp((y - heroTop) / track, 0, 1);
    // once the pinned scene starts scrolling away, soften its bottom edge into the page background
    var ex = clamp((y - heroTop - track) / (stageH * 0.35), 0, 1);
    ex = Math.round(ex * 100) / 100;
    if (ex !== lastExit) { exitEl.style.opacity = String(ex); lastExit = ex; }
  }
  function tick(t) {
    var dt = lastT ? Math.min(64, t - lastT) : 16.7;
    lastT = t;
    var k = 1 - Math.pow(1 - 0.12, dt / 16.7);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.0004) current = target;
    render(current);
    if (current !== target) rafId = requestAnimationFrame(tick);
    else { rafId = 0; lastT = 0; }
  }
  function kick() { if (!rafId) rafId = requestAnimationFrame(tick); }
  function onScroll() { if (reduced) return; readTarget(); kick(); }

  var lastW = 0, lastH = 0, resizeRaf = 0;
  function onResize() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      var W = stage.clientWidth, H = stage.clientHeight;
      if (W === lastW && H === lastH) { readTarget(); kick(); return; }
      lastW = W; lastH = H;
      layout();
      if (reduced) { render(1); return; }
      readTarget(); current = target; render(current);
    });
  }

  function applyMotionPref(isReduced) {
    reduced = isReduced;
    root.classList.toggle('zh-reduced', reduced);
    layout();
    if (reduced) { if (rafId) cancelAnimationFrame(rafId); rafId = 0; current = target = 1; render(1); }
    else { readTarget(); current = target; render(current); }
  }

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  lastW = stage.clientWidth; lastH = stage.clientHeight;
  applyMotionPref(!!(mq && mq.matches));
  if (mq) {
    var onMq = function (e) { applyMotionPref(e.matches); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
  window.addEventListener('load', function () { layout(); if (!reduced) { readTarget(); kick(); } else render(1); });
  // plate widths depend on Kalameh; re-measure once it is in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); render(reduced ? 1 : current); });

  // test hook for screenshots: jump straight to a progress value without smoothing
  window.__zagrosHero = { set: function (p) { target = current = clamp(p, 0, 1); render(current); }, layout: layout };
})();
