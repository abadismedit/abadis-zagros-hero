/* SAMPLE 1: Forest of markers — few large readable stakes, mid-field dozens, far hills as tiny plate texture */
(function () {
  'use strict';
  var U = null, canvas, ctx, fg, dpr = 1, W = 0, H = 0, map = null, items = null;
  var FG_NAMES = ['بیمارستان جماران', 'بیمارستان باهنر کرمان', 'بیمارستان الزهرا اصفهان'];
  var FG_MAP = { tall: [0, 1, 2], wide: [0, 5, 1] };
  var farCache = null, farKey = '', fgMarks = [], spotsRef = null, keyRef = 'tall';
  var rodMode = 'no-rods'; // PREVIEW: plates only, no wooden rods on any marker

  function boot() {
    U = window.zhPackUtil;
    canvas = document.getElementById('zhPack');
    fg = document.getElementById('zhPackFg');
    ctx = canvas.getContext('2d', { alpha: true });
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  function scatter(names, key, tall) {
    var rng = U.rng(key === 'tall' ? 20241 : 20242);
    var mid = [], far = [];
    var pool = names.slice(3);
    var midN = tall ? 32 : 48;
    for (var i = 0; i < midN; i++) {
      var y = 0.72 + rng() * 0.16;
      var u = rng();
      if (Math.abs(u - 0.5) < 0.14 && y < 0.80) u = u < 0.5 ? 0.08 + rng() * 0.22 : 0.70 + rng() * 0.22;
      mid.push({ name: pool[i], u: u, y: y, rot: (rng() - 0.5) * 5, side: u < 0.5 ? 1 : -1 });
    }
    // far hills only (below mountain crest / on grassy ridges), denser bands
    for (var j = midN; j < pool.length; j++) {
      var fy = 0.655 + rng() * 0.085;   // far ground, not sky
      var fu = rng();
      if (rng() < 0.4) fu = (Math.floor(fu * 16) + 0.25 + rng() * 0.5) / 16;
      far.push({ name: pool[j], u: fu, y: fy, rot: (rng() - 0.5) * 7 });
    }
    return { mid: mid, far: far };
  }

  function rebuildFarTexture() {
    if (!items || !map) return;
    var key = W + 'x' + H + ':' + rodMode;
    if (key === farKey && farCache) return;
    farKey = key;
    var oc = document.createElement('canvas');
    oc.width = Math.round(W * dpr); oc.height = Math.round(H * dpr);
    var c = oc.getContext('2d');
    c.scale(dpr, dpr);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    items.far.forEach(function (it) {
      var p = U.toScreen(it.u, it.y, map);
      var k = U.depthK(it.y);
      var fs = Math.max(4.2, 5 + k * 2.4);
      c.font = '700 ' + fs.toFixed(1) + 'px Kalameh, Tahoma, sans-serif';
      var tw = c.measureText(it.name).width;
      var pw = tw + 5, ph = fs + 2.5;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(it.rot * Math.PI / 180);
      c.globalAlpha = 0.32 + k * 0.28;
      c.fillStyle = 'rgba(228,214,184,' + (0.5 + k * 0.3).toFixed(2) + ')';
      c.strokeStyle = 'rgba(90,70,45,' + (0.3 + k * 0.25).toFixed(2) + ')';
      c.lineWidth = 0.55;
      roundRect(c, -pw / 2, -ph - 1, pw, ph, 1.2);
      c.fill(); c.stroke();
      c.fillStyle = 'rgba(11,46,50,' + (0.4 + k * 0.4).toFixed(2) + ')';
      c.fillText(it.name, 0, -ph / 2 - 1);
      if (rodMode !== 'no-rods') {
        // consistent thin stake under every far plate (including tiny ones)
        var sh = Math.max(3.2, 2.5 + k * 4);
        var sw = Math.max(0.7, 0.55 + k * 0.45);
        c.fillStyle = 'rgba(74,55,38,' + (0.4 + k * 0.35).toFixed(2) + ')';
        c.fillRect(-sw / 2, -1, sw, sh);
        c.fillStyle = 'rgba(60,42,26,' + (0.25 + k * 0.2).toFixed(2) + ')';
        c.beginPath(); c.ellipse(0, sh - 0.5, sw * 2.2, 1.1, 0, 0, Math.PI * 2); c.fill();
      } else {
        // no rod: soft pin shadow under the floating plate
        c.fillStyle = 'rgba(60,42,26,' + (0.12 + k * 0.12).toFixed(2) + ')';
        c.beginPath(); c.ellipse(0, 1.2, pw * 0.18, 1.0, 0, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    });
    farCache = oc;
  }

  function drawMid(appear) {
    if (!items) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    items.mid.forEach(function (it) {
      var p = U.toScreen(it.u, it.y, map);
      var k = U.depthK(it.y);
      var fs = (W >= 900 ? 9.2 : 7.8) * (0.72 + k * 0.38);
      ctx.font = '700 ' + fs.toFixed(1) + 'px Kalameh, Tahoma, sans-serif';
      var tw = ctx.measureText(it.name).width;
      var pw = tw + 9, ph = fs + 4.5;
      var lift = rodMode === 'no-rods' ? (ph + 2) : (12 + k * 8);
      ctx.save();
      ctx.translate(p.x + it.side * (5 + k * 7), p.y);
      ctx.rotate(it.rot * Math.PI / 180);
      ctx.globalAlpha = appear * (0.7 + k * 0.25);
      if (rodMode !== 'no-rods') {
        ctx.fillStyle = 'rgba(60,42,26,0.32)';
        ctx.beginPath(); ctx.ellipse(0, 1, 6.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a4430';
        ctx.fillRect(-1.1, -lift + ph, 2.2, lift - ph + 2);
      } else {
        // floating plate: soft contact shadow only
        ctx.fillStyle = 'rgba(60,42,26,0.18)';
        ctx.beginPath(); ctx.ellipse(0, 2, pw * 0.22, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#e4d6b4';
      ctx.strokeStyle = 'rgba(96,72,46,0.48)';
      ctx.lineWidth = 1;
      roundRect(ctx, -pw / 2, -lift, pw, ph, 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0b2e32';
      ctx.fillText(it.name, 0, -lift + ph / 2);
      ctx.restore();
    });
  }

  function ensureFg() {
    if (fgMarks.length === 3) return;
    fg.textContent = '';
    fgMarks = [];
    FG_NAMES.forEach(function (name) {
      var el = U.makeStake(name);
      if (rodMode === 'no-rods') {
        var st = el.querySelector('.stick'), ft = el.querySelector('.foot');
        if (st) st.style.display = 'none';
        if (ft) ft.style.display = 'none';
        // plate sits slightly lower without a post
        el.querySelector('.plate').style.bottom = '2px';
      }
      fg.appendChild(el);
      var plate = el.querySelector('.plate');
      fgMarks.push({ el: el, plate: plate, w: 0, si: 0 });
    });
  }

  function renderFg(appear, spots) {
    ensureFg();
    var idx = FG_MAP[keyRef] || FG_MAP.tall;
    var desk = W >= 900, maxH = 0;
    idx.forEach(function (si) { var sp = spots[si]; if (sp && sp.H > maxH) maxH = sp.H; });
    fgMarks.forEach(function (m, ni) {
      var sp = spots[idx[ni]];
      if (!sp || sp.gx == null) return;
      m.w = m.w || m.plate.offsetWidth;
      var side = sp.gx < W / 2 ? 1 : -1;
      var ds = U.clamp(0.82 + 0.18 * (sp.H / (maxH || 1)), 0.82, 1);
      var x = sp.gx + side * (sp.H * 0.15 + (desk ? 12 : 9));
      var y = sp.gy + 2;
      var half = (m.w || 80) * ds / 2;
      var px = U.clamp(x, half + 6, W - half - 6) - x;
      m.plate.style.transform = 'translateX(calc(-50% + ' + px.toFixed(1) + 'px)) rotate(' + (side * -1.5) + 'deg) scale(' + ds.toFixed(3) + ')';
      m.plate.style.transformOrigin = '50% 100%';
      m.el.style.opacity = appear.toFixed(3);
      m.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
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
      ensureFg();
      U.ensureSheet().then(function (sh) {
        items = scatter(sh.names, info.key, info.tall);
        farKey = ''; rebuildFarTexture();
        fgMarks.forEach(function (m) { m.w = m.plate.offsetWidth; });
      });
    },
    render: function (p, spots) {
      if (!U || !map) return;
      if (spots) spotsRef = spots;
      var appear = U.smooth(U.clamp((p - 0.35) / 0.35, 0, 1));
      ctx.clearRect(0, 0, W, H);
      rebuildFarTexture();
      if (farCache) ctx.drawImage(farCache, 0, 0, W, H);
      drawMid(appear);
      renderFg(U.smooth(U.clamp((p - 0.18) / 0.08, 0, 1)), spotsRef || spots || []);
    }
  };
  boot();
})();
