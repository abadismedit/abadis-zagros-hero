/* PREVIEW v2: plates-only forest. Canister above all plates. Unified smooth reveal. */
(function () {
  'use strict';
  var U = null, canvas, ctx, fg, dpr = 1, W = 0, H = 0, map = null, items = null;
  var FG_NAMES = ['بیمارستان جماران', 'بیمارستان باهنر کرمان', 'بیمارستان الزهرا اصفهان'];
  var FG_MAP = { tall: [0, 1, 2], wide: [0, 5, 1] };
  var farCache = null, farKey = '', spotsRef = null, keyRef = 'tall', canBox = null;

  function boot() {
    U = window.zhPackUtil;
    canvas = document.getElementById('zhPack');
    fg = document.getElementById('zhPackFg');
    if (fg) fg.textContent = ''; // no DOM plates — all drawn on canvas for one visual family
    ctx = canvas.getContext('2d', { alpha: true });
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function updateCanBox() {
    var can = document.getElementById('zhCanister');
    if (!can) { canBox = null; return; }
    var w = can.offsetWidth, h = can.offsetHeight, cx = can.offsetLeft, ty = can.offsetTop;
    // generous exclusion so nothing draws through the transparent jar
    canBox = { l: cx - w * 0.55, r: cx + w * 0.55, t: ty - 8, b: ty + h + 4 };
  }
  function hitCan(x, y, pad) {
    if (!canBox) return false;
    pad = pad || 6;
    return x > canBox.l - pad && x < canBox.r + pad && y > canBox.t - pad && y < canBox.b + pad;
  }
  function plateAppear(p, delay) {
    return U.smooth(U.clamp((p - delay) / 0.15, 0, 1));
  }
  function drawPlate(c, name, x, y, fs, rot, alpha) {
    c.font = '600 ' + fs.toFixed(1) + 'px Kalameh, Tahoma, sans-serif';
    var tw = c.measureText(name).width;
    var pw = tw + Math.max(7, fs * 0.9), ph = fs + Math.max(3.5, fs * 0.45);
    var lift = ph + 1;
    c.save();
    c.translate(x, y);
    c.rotate(rot * Math.PI / 180);
    c.globalAlpha = alpha;
    c.fillStyle = 'rgba(60,42,26,0.14)';
    c.beginPath(); c.ellipse(0, 2, pw * 0.2, 1.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e4d6b4';
    c.strokeStyle = 'rgba(96,72,46,0.42)';
    c.lineWidth = Math.max(0.6, fs * 0.08);
    roundRect(c, -pw / 2, -lift, pw, ph, Math.min(2, fs * 0.2));
    c.fill(); c.stroke();
    c.fillStyle = '#0b2e32';
    c.fillText(name, 0, -lift + ph / 2);
    c.restore();
    return { pw: pw, ph: ph };
  }

  function scatter(names, key, tall) {
    var rng = U.rng(key === 'tall' ? 40241 : 40242);
    var mid = [], far = [];
    var pool = names.slice(3);
    var midN = tall ? 32 : 48;
    for (var i = 0; i < midN; i++) {
      var y = 0.72 + rng() * 0.16;
      var u = rng();
      if (Math.abs(u - 0.5) < 0.14 && y < 0.80) u = u < 0.5 ? 0.08 + rng() * 0.22 : 0.70 + rng() * 0.22;
      mid.push({ name: pool[i], u: u, y: y, rot: (rng() - 0.5) * 5, side: u < 0.5 ? 1 : -1,
        delay: 0.16 + (1 - U.depthK(y)) * 0.12 + rng() * 0.04 });
    }
    for (var j = midN; j < pool.length; j++) {
      var fy = 0.655 + rng() * 0.085;
      var fu = rng();
      if (rng() < 0.4) fu = (Math.floor(fu * 16) + 0.25 + rng() * 0.5) / 16;
      far.push({ name: pool[j], u: fu, y: fy, rot: (rng() - 0.5) * 7 });
    }
    return { mid: mid, far: far };
  }

  function rebuildFarTexture() {
    if (!items || !map) return;
    var key = W + 'x' + H + ':v2b';
    if (key === farKey && farCache) return;
    farKey = key;
    var oc = document.createElement('canvas');
    oc.width = Math.round(W * dpr); oc.height = Math.round(H * dpr);
    var c = oc.getContext('2d');
    c.scale(dpr, dpr);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    items.far.forEach(function (it) {
      var p = U.toScreen(it.u, it.y, map);
      // skip centre band where canister will rise
      if (Math.abs(p.x - W / 2) < W * 0.12 && p.y > H * 0.45) return;
      var k = U.depthK(it.y);
      var fs = Math.max(4.2, 5 + k * 2.2);
      c.font = '600 ' + fs.toFixed(1) + 'px Kalameh, Tahoma, sans-serif';
      var tw = c.measureText(it.name).width;
      var pw = tw + 5, ph = fs + 2.5;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(it.rot * Math.PI / 180);
      c.globalAlpha = 0.30 + k * 0.26;
      c.fillStyle = 'rgba(228,214,184,' + (0.48 + k * 0.28).toFixed(2) + ')';
      c.strokeStyle = 'rgba(90,70,45,' + (0.28 + k * 0.22).toFixed(2) + ')';
      c.lineWidth = 0.55;
      roundRect(c, -pw / 2, -ph - 1, pw, ph, 1.2);
      c.fill(); c.stroke();
      c.fillStyle = 'rgba(11,46,50,' + (0.38 + k * 0.38).toFixed(2) + ')';
      c.fillText(it.name, 0, -ph / 2 - 1);
      c.fillStyle = 'rgba(60,42,26,' + (0.10 + k * 0.10).toFixed(2) + ')';
      c.beginPath(); c.ellipse(0, 1.2, pw * 0.18, 1.0, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    });
    farCache = oc;
  }

  function drawFarLayer(pProg) {
    if (!farCache) return;
    var a = U.smooth(U.clamp((pProg - 0.28) / 0.28, 0, 1));
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(farCache, 0, 0, W, H);
    // punch a soft hole where the canister sits so nothing shows through the glass
    if (canBox) {
      ctx.globalCompositeOperation = 'destination-out';
      var grd = ctx.createRadialGradient(
        (canBox.l + canBox.r) / 2, (canBox.t + canBox.b) / 2, Math.min(canBox.r - canBox.l, canBox.b - canBox.t) * 0.15,
        (canBox.l + canBox.r) / 2, (canBox.t + canBox.b) / 2, Math.max(canBox.r - canBox.l, canBox.b - canBox.t) * 0.62
      );
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(canBox.l - 20, canBox.t - 20, (canBox.r - canBox.l) + 40, (canBox.b - canBox.t) + 40);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function drawMid(pProg) {
    if (!items) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    items.mid.forEach(function (it) {
      var a = plateAppear(pProg, it.delay);
      if (a <= 0.01) return;
      var p = U.toScreen(it.u, it.y, map);
      if (hitCan(p.x, p.y, 20)) return;
      var k = U.depthK(it.y);
      var fs = (W >= 900 ? 8.8 : 7.4) * (0.72 + k * 0.38);
      var rise = (1 - a) * 6;
      drawPlate(ctx, it.name, p.x + it.side * (5 + k * 7), p.y + rise, fs, it.rot, a * (0.70 + k * 0.26));
    });
  }

  function drawFg(pProg, spots) {
    var idx = FG_MAP[keyRef] || FG_MAP.tall;
    var desk = W >= 900, maxH = 0;
    idx.forEach(function (si) { var sp = spots[si]; if (sp && sp.H > maxH) maxH = sp.H; });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    idx.forEach(function (si, ni) {
      var sp = spots[si];
      if (!sp || sp.gx == null) return;
      // same landing curve as root wooden markers
      var fall = sp.fall != null ? sp.fall : U.clamp((pProg - 0.07) / 0.09, 0, 1);
      var appear = U.smooth(U.clamp((fall - 0.85) / 0.15, 0, 1));
      if (appear <= 0.01) return;
      var side = sp.gx < W / 2 ? 1 : -1;
      var ds = U.clamp(0.94 + 0.08 * (sp.H / (maxH || 1)), 0.94, 1.04);
      var baseFs = (desk ? 9.4 : 8.2) * ds; // barely larger than near mid plates — same weight 600
      var x = sp.gx + side * (sp.H * 0.15 + (desk ? 12 : 9));
      var y = sp.gy + 2 + (1 - appear) * 6;
      // push clear of jar
      // always keep the three readable plates clear of the jar corridor once oaks are grown
      if (pProg > 0.72 && canBox) {
        var margin = 22;
        if (sp.gx < W / 2) x = Math.min(x, canBox.l - margin);
        else x = Math.max(x, canBox.r + margin);
      } else if (canBox && hitCan(x, y, 24)) {
        if (sp.gx < W / 2) x = Math.min(x, canBox.l - 16);
        else x = Math.max(x, canBox.r + 16);
      }
      x = U.clamp(x, 40, W - 40);
      drawPlate(ctx, FG_NAMES[ni], x, y, baseFs, side * -1.2, appear * 0.78);
    });
  }

  window.zhPack = {
    layout: function (spots, info) {
      if (!U) boot();
      W = info.W; H = info.H; spotsRef = spots; keyRef = info.key;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      map = U.coverMap(W, H);
      updateCanBox();
      U.ensureSheet().then(function (sh) {
        items = scatter(sh.names, info.key, info.tall);
        farKey = ''; rebuildFarTexture();
      });
    },
    render: function (p, spots) {
      if (!U || !map) return;
      if (spots) spotsRef = spots;
      updateCanBox();
      ctx.clearRect(0, 0, W, H);
      drawFarLayer(p);
      drawMid(p);
      drawFg(p, spotsRef || spots || []);
      // final clear under jar so transparent glass never shows plates through it
      if (canBox) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        var pad = 18;
        var x = canBox.l - pad, y = canBox.t - pad;
        var w = (canBox.r - canBox.l) + pad * 2, h = (canBox.b - canBox.t) + pad * 2;
        // soft vertical capsule matching the jar silhouette
        var cx = x + w / 2, cy = y + h / 2;
        var grd = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.2, cx, cy, Math.max(w, h) * 0.58);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(0.72, 'rgba(0,0,0,1)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
        ctx.restore();
      }
    }
  };
  boot();
})();
