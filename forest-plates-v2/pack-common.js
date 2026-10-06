/* SAMPLE helpers: load ~1000 names, map image-space -> screen, draw wooden plate glyphs on canvas */
(function (global) {
  'use strict';
  var NAMES = null, ready = null;
  function loadNames() {
    if (NAMES) return Promise.resolve(NAMES);
    if (ready) return ready;
    ready = fetch('./names.json').then(function (r) { return r.json(); }).then(function (n) {
      NAMES = n; return n;
    });
    return ready;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // same object-fit:cover mapping as zagros-hero.js
  var IMG_W = 1920, IMG_H = 1080, POS_Y = 0.6, HORIZON = 0.6, NEAR_Y = 0.95;
  function coverMap(W, H) {
    var s = Math.max(W / IMG_W, H / IMG_H);
    var ox = (W - IMG_W * s) / 2, oy = (H - IMG_H * s) * POS_Y;
    return { s: s, ox: ox, oy: oy, visW: W / s, visX0: (-ox) / s };
  }
  function toScreen(u, y, map) {
    var ix = map.visX0 + u * map.visW;
    return { x: map.ox + ix * map.s, y: map.oy + y * IMG_H * map.s };
  }
  function depthK(y) { return clamp((y - HORIZON) / (NEAR_Y - HORIZON), 0.05, 1.15); }

  // pre-bake a wooden plate glyph sheet once (for mid/far canvas markers)
  var sheet = null, sheetReady = null;
  function ensureSheet() {
    if (sheet) return Promise.resolve(sheet);
    if (sheetReady) return sheetReady;
    sheetReady = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      return loadNames().then(function (names) {
        // measure a few sizes; bake each name at small sizes into an atlas? Too big.
        // Instead: bake a few plate *styles* and draw text live on an offscreen for mid;
        // for far (texture) we rasterize batches of tiny text into one field canvas.
        sheet = { names: names, fontReady: true };
        return sheet;
      });
    });
    return sheetReady;
  }

  function makeStake(name, cls) {
    var el = document.createElement('div');
    el.className = 'zh-pack-stake' + (cls ? ' ' + cls : '');
    el.innerHTML = '<i class="foot"></i><i class="stick"></i><span class="plate"></span>';
    el.querySelector('.plate').textContent = name;
    return el;
  }

  // Avoid hero copy rect and keep stakes on-screen
  function heroRect() {
    var el = document.querySelector('.csr-hero > div');
    return el ? el.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0 };
  }

  global.zhPackUtil = {
    loadNames: loadNames, ensureSheet: ensureSheet, makeStake: makeStake,
    clamp: clamp, smooth: smooth, rng: mulberry32, coverMap: coverMap, toScreen: toScreen,
    depthK: depthK, heroRect: heroRect, IMG_H: IMG_H, HORIZON: HORIZON, NEAR_Y: NEAR_Y
  };
})(window);
