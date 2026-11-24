'use strict';
/* Живое небо: мрачные зимние сумерки в дождь.
   Тёмно-серая база, светло-серый просвет в левом верхнем углу, рваный туман, дождь с порывами ветра.
   Рисуется на двух canvas:
   - задний (#sky-back): небо, просвет, туман, пелена и дальний дождь, брызги — за эмблемой;
   - передний (#sky-front): ближние капли и стелющийся туман — перед эмблемой, но под панелями. */
const Sky = (() => {
  const back = document.getElementById('sky-back');
  const front = document.getElementById('sky-front');
  const bx = back.getContext('2d');
  const fx = front.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Тёмно-серая база (при прокрутке ещё темнеет) и приглушённый светло-серый просвет слева сверху. */
  const BASE = { top: [42, 45, 50], bottom: [29, 31, 35] };
  const BASE_DEEP = { top: [35, 38, 43], bottom: [24, 26, 30] };
  const CORNER = [122, 127, 133];
  const RAIN_COLOR = [200, 208, 216];
  const MIST_COLOR = [168, 176, 184];
  const VEIL_COLOR = [150, 158, 166];

  /* Туман: band — полоса экрана (доли высоты), cells — крупность клочьев, aspect — насколько они вытянуты,
     lo/hi — порог «рваности», alpha — плотность, speed — дрейф px/с, ground — гуще книзу. */
  const MIST_DEF = [
    { front: false, band: [0.02, 0.5], cells: 3, aspect: 0.5, lo: 0.46, hi: 0.74, alpha: 0.1, speed: 6, parallax: 0.03 },
    { front: false, band: [0.32, 0.86], cells: 4, aspect: 0.55, lo: 0.44, hi: 0.72, alpha: 0.13, speed: 13, parallax: 0.06 },
    { front: false, band: [0.6, 1.12], cells: 3, aspect: 0.6, lo: 0.36, hi: 0.7, alpha: 0.26, speed: 20, parallax: 0.08, ground: true },
    { front: true, band: [0.72, 1.12], cells: 3, aspect: 0.5, lo: 0.48, hi: 0.78, alpha: 0.16, speed: 34, parallax: 0.1, ground: true }
  ];
  /* Слои дождя: density — капель на пиксель площади. */
  const RAIN_DEF = [
    { front: false, density: 1 / 5200, len: [8, 14], speed: [620, 820], alpha: 0.13, width: 1 },
    { front: false, density: 1 / 11500, len: [14, 22], speed: [900, 1150], alpha: 0.2, width: 1, splash: true },
    { front: true, density: 1 / 38000, len: [28, 44], speed: [1300, 1600], alpha: 0.26, width: 1.4 }
  ];
  const VEIL_COUNT = 3;

  let W = 0, H = 0, dpr = 1;
  let dark = 0, darkTarget = 0;
  let rain = reduceMotion ? 0 : 1, rainTarget = rain;
  let scroll = 0;
  let mist = [], layers = [], splashes = [], veils = [];
  let wind = -0.2;
  let last = performance.now();

  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const smooth = t => t * t * (3 - 2 * t);
  const smoothstep = (a, b, x) => smooth(Math.max(0, Math.min(1, (x - a) / (b - a))));

  /* ============================= Туман ============================= */

  /* Фрактальный шум (несколько слоёв «облачного» шума разной крупности), бесшовный по горизонтали. */
  function fbm(w, h, cells, aspect, octaves) {
    const out = new Float32Array(w * h);
    let amp = 1, total = 0;
    for (let o = 0; o < octaves; o += 1) {
      const cx = cells * (1 << o);
      const cy = Math.max(1, Math.round(cx * aspect));
      const grid = new Float32Array(cx * (cy + 1));
      for (let i = 0; i < grid.length; i += 1) grid[i] = Math.random();
      for (let y = 0; y < h; y += 1) {
        const gy = (y / h) * cy;
        const y0 = Math.floor(gy);
        const y1 = Math.min(y0 + 1, cy);
        const ty = smooth(gy - y0);
        for (let x = 0; x < w; x += 1) {
          const gx = (x / w) * cx;
          const x0 = Math.floor(gx);
          const x1 = (x0 + 1) % cx;
          const tx = smooth(gx - x0);
          const top = lerp(grid[y0 * cx + x0], grid[y0 * cx + x1], tx);
          const bottom = lerp(grid[y1 * cx + x0], grid[y1 * cx + x1], tx);
          out[y * w + x] += amp * lerp(top, bottom, ty);
        }
      }
      total += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < out.length; i += 1) out[i] /= total;
    return out;
  }

  /* Текстура считается один раз (размер не зависит от экрана) и потом растягивается — так туман мягкий. */
  function makeMist(def) {
    const w = 512, h = 192;
    const noise = fbm(w, h, def.cells, def.aspect, 5);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      const t = y / (h - 1);
      /* Края полосы растворяются; у стелющегося тумана плотность растёт книзу. */
      const profile = def.ground ? smoothstep(0, 0.6, t) : Math.pow(Math.sin(Math.PI * t), 0.9);
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        const a = smoothstep(def.lo, def.hi, noise[i]) * profile;
        const p = i * 4;
        img.data[p] = MIST_COLOR[0];
        img.data[p + 1] = MIST_COLOR[1];
        img.data[p + 2] = MIST_COLOR[2];
        img.data[p + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return { canvas, def, offset: Math.random() * 2000, phase: Math.random() * 6.28 };
  }

  function drawMist(ctx, isFront, dt, time) {
    for (const m of mist) {
      if (m.def.front !== isFront) continue;
      if (!reduceMotion) m.offset += m.def.speed * dt;
      const off = m.offset % W;
      const top = m.def.band[0] * H - Math.min(scroll, H) * m.def.parallax;
      const height = (m.def.band[1] - m.def.band[0]) * H;
      /* Плотность медленно «дышит»: туман то сгущается, то редеет. */
      const breathe = reduceMotion ? 1 : 0.82 + 0.18 * Math.sin(time * 0.11 + m.phase);
      ctx.globalAlpha = m.def.alpha * breathe * lerp(1, 0.85, dark);
      ctx.drawImage(m.canvas, -off, top, W, height);
      ctx.drawImage(m.canvas, W - off, top, W, height);
    }
    ctx.globalAlpha = 1;
  }

  /* ============================= Дождь ============================= */

  function makeDrop(def, anywhere) {
    const len = rand(def.len[0], def.len[1]);
    return {
      x: rand(-0.05 * W, 1.3 * W),
      y: anywhere ? rand(-0.1 * H, H) : rand(-0.3 * H, -len),
      len,
      speed: rand(def.speed[0], def.speed[1]),
      ground: def.splash ? rand(0.8, 1.02) * H : Infinity
    };
  }

  function seedRain() {
    layers = RAIN_DEF.map(def => {
      const count = Math.round(W * H * def.density);
      return { def, drops: Array.from({ length: count }, () => makeDrop(def, true)) };
    });
    splashes = [];
  }

  /* Пелена дождя: широкие косые полосы, которые медленно проходят по экрану, как стена ливня вдали. */
  function makeVeil(anywhere) {
    const width = rand(0.2, 0.42) * W;
    return {
      x: anywhere ? rand(-0.2, 1.2) * W : W + width + rand(0, 0.5) * W,
      width,
      speed: rand(28, 60),
      alpha: rand(0.04, 0.08)
    };
  }

  function drawVeils(dt, intensity) {
    if (rain < 0.01) return;
    const angle = Math.atan(-wind);
    for (let i = 0; i < veils.length; i += 1) {
      const v = veils[i];
      if (!reduceMotion) v.x -= v.speed * dt;
      if (v.x + v.width < -0.3 * W) { veils[i] = makeVeil(false); continue; }
      const half = v.width / 2;
      bx.save();
      bx.translate(v.x, H / 2);
      bx.rotate(angle);
      const g = bx.createLinearGradient(-half, 0, half, 0);
      const a = v.alpha * rain * intensity;
      g.addColorStop(0, rgba(VEIL_COLOR, 0));
      g.addColorStop(0.5, rgba(VEIL_COLOR, a));
      g.addColorStop(1, rgba(VEIL_COLOR, 0));
      bx.fillStyle = g;
      bx.fillRect(-half, -H, v.width, H * 2);
      bx.restore();
    }
  }

  function drawRain(dt, intensity) {
    if (rain < 0.01) return;
    for (const layer of layers) {
      const ctx = layer.def.front ? fx : bx;
      ctx.strokeStyle = rgba(RAIN_COLOR, layer.def.alpha * rain * intensity * lerp(0.9, 1.15, dark));
      ctx.lineWidth = layer.def.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const d of layer.drops) {
        d.y += d.speed * dt;
        d.x += d.speed * wind * dt;
        if (d.y > d.ground) {
          if (splashes.length < 110 && rain > 0.3) splashes.push({ x: d.x, y: d.ground, t: 0 });
          Object.assign(d, makeDrop(layer.def, false));
          continue;
        }
        if (d.y - d.len > H || d.x < -80) {
          Object.assign(d, makeDrop(layer.def, false));
          continue;
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - wind * d.len, d.y - d.len);
      }
      ctx.stroke();
    }
  }

  function drawSplashes(dt) {
    if (!splashes.length) return;
    bx.strokeStyle = rgba(RAIN_COLOR);
    bx.lineWidth = 1;
    for (let i = splashes.length - 1; i >= 0; i -= 1) {
      const s = splashes[i];
      s.t += dt;
      const k = s.t / 0.32;
      if (k >= 1) { splashes.splice(i, 1); continue; }
      bx.globalAlpha = (1 - k) * 0.3 * rain;
      bx.beginPath();
      bx.ellipse(s.x, s.y, 2 + k * 7, 0.6 + k * 1.8, 0, Math.PI, Math.PI * 2);
      bx.stroke();
    }
    bx.globalAlpha = 1;
  }

  /* ============================= Небо ============================= */

  /* Центр и радиус просвета: источник чуть за левым верхним краем экрана. */
  const cornerGeometry = () => ({ x: W * 0.03, y: -H * 0.06, r: Math.hypot(W, H) * 0.56 });

  function drawSky(time) {
    const top = mix(BASE.top, BASE_DEEP.top, dark);
    const bottom = mix(BASE.bottom, BASE_DEEP.bottom, dark);
    const grad = bx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, rgba(top));
    grad.addColorStop(1, rgba(bottom));
    bx.fillStyle = grad;
    bx.fillRect(0, 0, W, H);

    /* Светло-серый просвет слева сверху. Медленно «дышит», будто тучи то густеют, то редеют. */
    const pulse = reduceMotion ? 1 : 1 + Math.sin(time * 0.35) * 0.05 + Math.sin(time * 0.13) * 0.05;
    const k = lerp(1, 0.78, dark) * pulse;
    const c = cornerGeometry();
    const light = bx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    light.addColorStop(0, rgba(CORNER, Math.min(1, 0.95 * k)));
    light.addColorStop(0.24, rgba(CORNER, 0.66 * k));
    light.addColorStop(0.52, rgba(CORNER, 0.18 * k));
    light.addColorStop(1, rgba(CORNER, 0));
    bx.fillStyle = light;
    bx.fillRect(0, 0, W, H);
  }

  /* Тень: всё, кроме левого верхнего угла, уходит в глубокий тёмно-серый. */
  function drawShade() {
    const c = cornerGeometry();
    const bottom = mix(BASE.bottom, BASE_DEEP.bottom, dark);
    const shade = bx.createRadialGradient(c.x, c.y, c.r * 0.3, c.x, c.y, c.r * 1.8);
    shade.addColorStop(0, rgba(bottom, 0));
    shade.addColorStop(0.3, rgba(bottom, 0.4));
    shade.addColorStop(1, rgba(bottom, 0.62));
    bx.fillStyle = shade;
    bx.fillRect(0, 0, W, H);
  }

  /* ============================= Кадр ============================= */

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    const time = now / 1000;
    last = now;
    dark = lerp(dark, darkTarget, 1 - Math.exp(-dt * 5));
    rain = lerp(rain, rainTarget, 1 - Math.exp(-dt * 3));
    /* Порывы ветра меняют наклон дождя, а сила дождя идёт волнами. */
    wind = reduceMotion ? -0.2 : -0.2 + 0.06 * Math.sin(time * 0.27) + 0.03 * Math.sin(time * 0.71 + 1.3);
    const intensity = reduceMotion ? 1 : 0.82 + 0.18 * Math.sin(time * 0.19);

    fx.clearRect(0, 0, W, H);
    drawSky(time);
    drawShade();
    drawMist(bx, false, dt, time);
    drawVeils(dt, intensity);
    drawRain(dt, intensity);
    drawSplashes(dt);
    drawMist(fx, true, dt, time);
    requestAnimationFrame(frame);
  }

  /* Шум плёнки — маленькая текстура, её двигает CSS. */
  function makeGrain() {
    const size = 180;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
  }

  function resize() {
    const nextW = window.innerWidth;
    const nextH = window.innerHeight;
    /* На телефоне высота «прыгает» при прокрутке из-за адресной строки — мелкие изменения не пересобираем. */
    const big = nextW !== W || Math.abs(nextH - H) > 120;
    W = nextW;
    H = nextH;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const c of [back, front]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    bx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (big || !layers.length) {
      seedRain();
      veils = Array.from({ length: VEIL_COUNT }, () => makeVeil(true));
    }
  }

  mist = MIST_DEF.map(makeMist);
  resize();
  makeGrain();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { scroll = window.scrollY; }, { passive: true });
  scroll = window.scrollY;
  requestAnimationFrame(frame);

  return {
    /* 0 — сумерки, 1 — почти ночь. immediate — без плавного перехода. */
    setDarkness(value, immediate) {
      darkTarget = Math.max(0, Math.min(1, value));
      if (immediate) dark = darkTarget;
    },
    setRain(on) { rainTarget = on ? 1 : 0; },
    get reduceMotion() { return reduceMotion; }
  };
})();
