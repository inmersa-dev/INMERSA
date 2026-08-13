// ─────────────────────────────────────────────────────────────────
//  INMERSA — Motor de escenas narrativas
//
//  Escenario de fondo + capas de personaje recortadas, compuestas y
//  animadas por código. Cada paso aporta solo sus datos: escenario,
//  reparto y guion.
//
//  Uso mínimo:
//
//    import { createScene } from './scene-engine.js';
//
//    const scene = createScene({
//      stage: '../Imagenes/stage_amphitheater.png',
//      cast: {
//        beto: {
//          name:'Beto', color:'#E8912D',
//          x:0.33, bottom:0.06, height:0.64, headTop:0.30,
//          expressions:{ neutral:'…/beto_layer.png' },
//        },
//      },
//      script: [ { m:0, who:'beto', text:'Hola.' } ],
//      moments: 3,
//      onEnd: () => { … },
//    });
//    scene.start();
//
//  Geometría: todas las medidas van en fracciones de la escena (0–1),
//  no en píxeles, para que funcione en cualquier pantalla.
// ─────────────────────────────────────────────────────────────────

const CSS = `
:root{
  --se-bg:#0A1628; --se-accent:#00D4FF; --se-teal:#00C9A7;
  --se-bubble-bg:#FFFDF4; --se-bubble-bd:#1C1C2E;
}
.se-root{position:fixed;inset:0;overflow:hidden;background:var(--se-bg)}

.se-camera{position:absolute;inset:0;transform-origin:center center;
  transition:transform 1.1s cubic-bezier(.4,0,.2,1);will-change:transform}
.se-stage{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center center;transition:opacity .5s ease}
/* Modo fitStage: el escenario se ve ENTERO (contain) en vez de recortarse
   para llenar la pantalla. Las franjas que sobran se rellenan con una copia
   borrosa y oscurecida del mismo fondo, para que no se lean como hueco. */
.se-root.se-fit .se-stage{object-fit:contain}
.se-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  filter:blur(28px) brightness(.45);transform:scale(1.08);
  transition:opacity .5s ease;display:none}
.se-root.se-fit .se-backdrop{display:block}

.se-char{position:absolute;transform:translateX(-50%)}
.se-char img{position:absolute;bottom:0;left:50%;transform:translateX(-50%);
  height:100%;width:auto;opacity:0;transition:opacity .35s ease}
.se-char img.on{opacity:1}
.se-shadow{position:absolute;transform:translateX(-50%);filter:blur(4px);
  background:radial-gradient(ellipse at center,
    rgba(60,35,10,.5) 0%, rgba(60,35,10,.25) 45%, rgba(60,35,10,0) 72%)}

.se-grad{position:absolute;inset:0;pointer-events:none;z-index:2;
  background:linear-gradient(to bottom,
    rgba(0,0,0,.10) 0%, rgba(0,0,0,0) 30%,
    rgba(0,0,0,.38) 72%, rgba(0,0,0,.74) 100%)}

.se-dots{position:absolute;top:14px;left:50%;transform:translateX(-50%);
  display:flex;gap:6px;z-index:10}
.se-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.28);
  transition:background .3s,transform .3s}
.se-dot.done{background:var(--se-teal)}
.se-dot.active{background:var(--se-accent);transform:scale(1.3)}

.se-narrator{position:absolute;top:0;left:0;right:0;z-index:11;
  background:rgba(8,16,32,.86);border-bottom:2px solid rgba(0,212,255,.22);
  padding:10px 18px 11px 14px;display:none;align-items:center;gap:10px;
  backdrop-filter:blur(8px)}
.se-narrator.show{display:flex}
.se-narrator .se-nar-icon{font-size:16px;flex-shrink:0}
.se-narrator .se-nar-text{flex:1;color:#F5C518;font-size:13.5px;
  font-weight:700;font-style:italic;line-height:1.5}
.se-narrator .se-nar-tap{font-size:11px;color:rgba(255,255,255,.4);
  flex-shrink:0;animation:se-blink 1.5s ease-in-out infinite}

.se-bubble{position:absolute;display:none;background:var(--se-bubble-bg);
  border:2.5px solid var(--se-bubble-bd);border-radius:18px;
  padding:13px 18px 11px;width:280px;max-width:82vw;
  box-shadow:3px 4px 0 rgba(0,0,0,.3);transform:translateX(-50%);
  transition:left .9s cubic-bezier(.4,0,.2,1), bottom .9s cubic-bezier(.4,0,.2,1);
  z-index:12}
.se-bubble.show{display:block}
.se-bubble::before,.se-bubble::after{content:'';position:absolute;bottom:0;
  left:50%;transform:translateX(-50%) translateY(100%);width:0;height:0}
.se-bubble::before{border:10px solid transparent;border-top:11px solid var(--se-bubble-bd)}
.se-bubble::after{border:8px solid transparent;border-top:10px solid var(--se-bubble-bg);
  margin-top:-1px}
.se-bubble.player{background:#EFF9FF;border-color:#1D6FA4}
.se-bubble.player::before{border-top-color:#1D6FA4!important}
.se-bubble.player::after{border-top-color:#EFF9FF!important}
/* Cuadro anclado a la escenografía (posición fija): sin colita. */
.se-bubble.boxed::before,.se-bubble.boxed::after{display:none}

/* ── FX: tinte de color, símbolos flotantes, shake ── */
.se-tint{position:absolute;inset:0;z-index:13;pointer-events:none;opacity:0;
  transition:opacity .45s ease}
.se-tint.cold{opacity:1;background:radial-gradient(ellipse at 50% 42%,
  rgba(30,90,170,0) 42%, rgba(18,55,140,.36) 100%)}
.se-tint.warm{opacity:1;background:radial-gradient(ellipse at 50% 42%,
  rgba(255,200,90,0) 42%, rgba(255,150,40,.30) 100%)}
.se-symbol{position:absolute;z-index:22;pointer-events:none;
  font-size:clamp(34px,10vw,64px);transform:translate(-50%,-50%);opacity:0;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,.5))}
.se-symbol.go{animation:se-symfloat 1.6s ease forwards}
@keyframes se-symfloat{0%{opacity:0;transform:translate(-50%,-20%) scale(.4)}
  22%{opacity:1;transform:translate(-50%,-58%) scale(1.18)}
  70%{opacity:1;transform:translate(-50%,-98%) scale(1)}
  100%{opacity:0;transform:translate(-50%,-134%) scale(.9)}}
@keyframes se-shake{0%,100%{transform:translate(0,0)}
  15%{transform:translate(-7px,2px)}30%{transform:translate(7px,-2px)}
  45%{transform:translate(-5px,1px)}60%{transform:translate(5px,-1px)}
  78%{transform:translate(-3px,0)}}
.se-shake{animation:se-shake .45s ease}

.se-speaker{font-size:12px;font-weight:900;letter-spacing:.09em;
  text-transform:uppercase;margin-bottom:5px}
.se-text{font-size:15px;font-weight:700;color:#111827;line-height:1.55;min-height:34px}
.se-tap{display:none;text-align:right;font-size:11px;color:#6B7280;
  margin-top:4px;animation:se-blink 1.5s ease-in-out infinite}
@keyframes se-blink{0%,100%{opacity:.3}50%{opacity:1}}

.se-bottom{position:absolute;bottom:0;left:0;right:0;z-index:14;
  background:rgba(6,14,28,.93);border-top:1.5px solid rgba(0,212,255,.18);
  padding:10px 14px 22px;backdrop-filter:blur(10px);min-height:20px}
.se-choices{display:none;flex-direction:column;gap:7px;max-height:44vh;overflow-y:auto}
.se-choice{background:rgba(255,255,255,.06);border:1.5px solid rgba(136,153,170,.28);
  border-radius:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:700;
  padding:10px 13px;text-align:left;cursor:pointer;
  transition:background .15s,border-color .15s}
.se-choice:active{background:rgba(0,212,255,.12);border-color:var(--se-accent)}

.se-info{display:none;background:rgba(0,212,255,.07);
  border:1.5px solid rgba(0,212,255,.28);border-radius:12px;
  padding:10px 13px;margin-bottom:6px}
.se-info-title{font-size:10px;font-weight:900;letter-spacing:.09em;
  text-transform:uppercase;color:var(--se-accent);margin-bottom:5px}
.se-info-body{font-size:13px;color:#CCE8FF;font-weight:600;line-height:1.55}

.se-loading{position:fixed;inset:0;z-index:999;background:var(--se-bg);
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px}
.se-spin{width:36px;height:36px;border:3px solid rgba(0,212,255,.15);
  border-top-color:var(--se-accent);border-radius:50%;
  animation:se-spin .8s linear infinite}
@keyframes se-spin{to{transform:rotate(360deg)}}
.se-loading p{color:#8899AA;font-size:14px}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
  stylesInjected = true;
}

const WIDE = { scale: 1, target: 0.5, ty: 0 };

export function createScene(config) {
  injectStyles();

  const cast     = config.cast || {};
  const script   = config.script || [];
  const actions  = config.actions || {};
  const typeSpeed = config.typeSpeed ?? 46;

  // ── DOM ────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'se-root';

  const camera = document.createElement('div');
  camera.className = 'se-camera';

  // Copia borrosa que rellena las franjas cuando el escenario se ve entero.
  const backdrop = document.createElement('img');
  backdrop.className = 'se-backdrop';
  backdrop.alt = '';
  backdrop.src = config.stage;
  camera.appendChild(backdrop);

  const stageImg = document.createElement('img');
  stageImg.className = 'se-stage';
  stageImg.src = config.stage;
  camera.appendChild(stageImg);
  if (config.fitStage) root.classList.add('se-fit');

  // Shadows first, then characters, so figures sit on top of them.
  // Cast order = draw order: list the ones standing further back first.
  for (const [id, a] of Object.entries(cast)) {
    if (a.shadow !== false) {
      const sh = document.createElement('div');
      sh.className = 'se-shadow';
      const s = a.shadow || {};
      sh.style.left   = pct(a.x);
      sh.style.bottom = pct((s.bottom ?? a.bottom - 0.006));
      sh.style.width  = pct(s.width  ?? 0.13);
      sh.style.height = pct(s.height ?? 0.026);
      sh.dataset.for  = id;
      camera.appendChild(sh);
    }
  }
  for (const [id, a] of Object.entries(cast)) {
    const slot = document.createElement('div');
    slot.className = 'se-char';
    slot.id = 'se-char-' + id;
    // La geometría la fija layout(), que puede reinterpretarla en coordenadas
    // del fondo (ver anchorToStage).
    // La primera expresión listada queda activa por defecto, para que
    // un personaje de una sola cara funcione sin que el guion la nombre.
    let first = true;
    for (const [exp, src] of Object.entries(a.expressions)) {
      const im = document.createElement('img');
      im.src = src; im.dataset.exp = exp; im.alt = '';
      if (first) { im.classList.add('on'); first = false; }
      slot.appendChild(im);
    }
    camera.appendChild(slot);
  }
  root.appendChild(camera);

  const grad = document.createElement('div');
  grad.className = 'se-grad';
  root.appendChild(grad);

  // FX: capa de tinte de color (frío/cálido) sobre la escena.
  const tint = document.createElement('div');
  tint.className = 'se-tint';
  root.appendChild(tint);

  const dotsBox = document.createElement('div');
  dotsBox.className = 'se-dots';
  root.appendChild(dotsBox);

  const narrator = document.createElement('div');
  narrator.className = 'se-narrator';
  narrator.innerHTML =
    `<span class="se-nar-icon">📖</span>` +
    `<p class="se-nar-text"></p>` +
    `<span class="se-nar-tap">▶</span>`;
  root.appendChild(narrator);
  const narText = narrator.querySelector('.se-nar-text');
  const narTap  = narrator.querySelector('.se-nar-tap');

  const bubble = document.createElement('div');
  bubble.className = 'se-bubble';
  bubble.innerHTML =
    `<div class="se-speaker"></div>` +
    `<p class="se-text"></p>` +
    `<span class="se-tap">toca para continuar ▶</span>`;
  root.appendChild(bubble);
  const bSpk = bubble.querySelector('.se-speaker');
  const bTxt = bubble.querySelector('.se-text');
  const bTap = bubble.querySelector('.se-tap');

  const bottom = document.createElement('div');
  bottom.className = 'se-bottom';
  const info = document.createElement('div');
  info.className = 'se-info';
  info.innerHTML = `<div class="se-info-title">💡 Dato científico</div>` +
                   `<p class="se-info-body"></p>`;
  const choices = document.createElement('div');
  choices.className = 'se-choices';
  bottom.appendChild(info);
  bottom.appendChild(choices);
  // Slot for step-specific controls (name input, etc.)
  const extra = document.createElement('div');
  extra.className = 'se-extra';
  bottom.appendChild(extra);
  root.appendChild(bottom);

  const loading = document.createElement('div');
  loading.className = 'se-loading';
  loading.innerHTML = `<div class="se-spin"></div><p>${config.loadingText || 'Cargando…'}</p>`;

  (config.mount ? document.querySelector(config.mount) : document.body).appendChild(root);
  document.body.appendChild(loading);

  const infoBody = info.querySelector('.se-info-body');

  function pct(v) { return (v * 100).toFixed(2) + '%'; }

  // Map a point given in BACKGROUND-image fractions (0–1) to screen
  // fractions, accounting for the stage's object-fit:cover crop. Lets a
  // line pin its bubble to a fixed spot on the scenery (a sign, a poster)
  // so it stays put no matter the viewport shape.
  function bgToScreen(bx, by) {
    const vw = root.clientWidth  || window.innerWidth;
    const vh = root.clientHeight || window.innerHeight;
    const bw = stageImg.naturalWidth  || vw;
    const bh = stageImg.naturalHeight || vh;
    if (!vw || !vh || !bw || !bh) return { x: bx, y: by };  // sin layout aún: aprox.
    const s  = Math.max(vw / bw, vh / bh);       // cover scale
    const rw = bw * s, rh = bh * s;
    const ox = (vw - rw) / 2, oy = (vh - rh) / 2;
    return { x: (ox + bx * rw) / vw, y: (oy + by * rh) / vh };
  }

  // ── Layout del reparto ─────────────────────────────────────────
  // Con `anchorToStage`, la geometría del reparto se lee en coordenadas de la
  // IMAGEN de fondo y se traduce a pantalla aplicando el mismo recorte que el
  // escenario (object-fit:cover). Sin esto, en un viewport con otra proporción
  // el fondo se recorta pero los personajes no, y acaban despegados del suelo
  // (en 16:9 con un fondo 4:3 el desfase pasa de 70px).
  // Sin la opción, los valores se usan tal cual: comportamiento de siempre.
  function layout() {
    const vw = root.clientWidth  || window.innerWidth;
    const vh = root.clientHeight || window.innerHeight;
    const bw = stageImg.naturalWidth, bh = stageImg.naturalHeight;
    const on = !!config.anchorToStage && bw && bh && vw && vh;
    // `fitStage` muestra el escenario entero (contain): encaja por el lado que
    // sobra, en vez de recortar. La geometría tiene que usar la misma cuenta.
    const s  = on ? (config.fitStage ? Math.min(vw / bw, vh / bh)
                                     : Math.max(vw / bw, vh / bh)) : 1;
    const rw = bw * s, rh = bh * s;
    const ox = (vw - rw) / 2, oy = (vh - rh) / 2;
    const mapX = bx => on ? (ox + bx * rw) / vw : bx;
    const mapY = by => on ? (oy + by * rh) / vh : by;
    const kx   = on ? rw / vw : 1;
    const ky   = on ? rh / vh : 1;

    for (const [id, a] of Object.entries(cast)) {
      a._x       = mapX(a.x);
      a._bottom  = 1 - mapY(1 - a.bottom);
      a._height  = a.height * ky;
      a._headTop = mapY(a.headTop);
      const f    = a.framing || WIDE;
      a._framing = { scale: f.scale, target: mapX(f.target), ty: f.ty * ky };

      const slot = document.getElementById('se-char-' + id);
      if (slot) {
        slot.style.left   = pct(a._x);
        slot.style.bottom = pct(a._bottom);
        slot.style.height = pct(a._height);
        slot.style.width  = pct((a.width ?? 0.2) * kx);
      }
      const sh = camera.querySelector(`.se-shadow[data-for="${id}"]`);
      if (sh) {
        const c = a.shadow || {};
        sh.style.left   = pct(a._x);
        sh.style.bottom = pct(1 - mapY(1 - (c.bottom ?? a.bottom - 0.006)));
        sh.style.width  = pct((c.width  ?? 0.13)  * kx);
        sh.style.height = pct((c.height ?? 0.026) * ky);
      }
    }
  }
  layout();
  stageImg.addEventListener('load', layout);
  window.addEventListener('resize', layout);
  // ResizeObserver además del evento: el de window no llega en todos los casos
  // (emuladores de viewport, cambios de tamaño del contenedor), y si no se
  // recalcula, los personajes se quedan con la geometría del tamaño anterior.
  if (typeof ResizeObserver === 'function') new ResizeObserver(layout).observe(root);

  // ── Camera ─────────────────────────────────────────────────────
  // Places scene-point p at screen-point t under scale s:
  //   tx = (t - 0.5)/s - (p - 0.5)
  // Se usan siempre los valores ya traducidos por layout() (_framing, _x,
  // _headTop): con anchorToStage difieren de los autorados.
  function framingFor(who) {
    if (!who || who === 'wide' || !cast[who]) return WIDE;
    return cast[who]._framing || cast[who].framing || WIDE;
  }
  function setCamera(who) {
    const f = framingFor(who);
    const p = (!who || who === 'wide' || !cast[who]) ? 0.5 : cast[who]._x;
    const tx = ((f.target - 0.5) / f.scale) - (p - 0.5);
    camera.style.transform =
      `scale(${f.scale}) translate(${(tx*100).toFixed(2)}%, ${(f.ty*100).toFixed(2)}%)`;
  }
  // Where the speaker's head lands on screen after the move.
  function headScreenY(who) {
    const f = framingFor(who);
    if (!who || who === 'wide' || !cast[who]) return 0.34;
    return f.scale * (cast[who]._headTop - 0.5) + f.scale * f.ty + 0.5;
  }

  // Screen position of a speaker's head under a GIVEN camera framing.
  // This is what lets a held wide shot still anchor each bubble to the
  // right character: the camera stays put, only the bubble moves.
  function anchorOf(speaker, framedActor) {
    const f = framingFor(framedActor);
    const p = (!framedActor || framedActor === 'wide' || !cast[framedActor])
      ? 0.5 : cast[framedActor]._x;
    const tx = ((f.target - 0.5) / f.scale) - (p - 0.5);
    const S = cast[speaker];
    if (!S) return { x: f.target, y: headScreenY(framedActor) };
    return {
      x: 0.5 + f.scale * (S._x + tx - 0.5),
      y: 0.5 + f.scale * (S._headTop + f.ty - 0.5),
    };
  }

  function setExpression(id, exp) {
    const slot = document.getElementById('se-char-' + id);
    if (!slot) return;
    slot.querySelectorAll('img').forEach(im =>
      im.classList.toggle('on', im.dataset.exp === exp));
  }

  // Swap the background to another scenario. Returns a promise that
  // resolves once the new stage is on screen, so the caller can wait
  // before showing dialogue over it.
  let currentStage = config.stage;
  function setStage(src) {
    if (!src || src === currentStage) return Promise.resolve();
    currentStage = src;
    stageImg.style.opacity = '0';
    return new Promise(resolve => {
      setTimeout(() => {
        stageImg.src = src;
        const done = () => { stageImg.style.opacity = '1'; resolve(); };
        if (stageImg.complete) done();
        else { stageImg.onload = done; stageImg.onerror = done; }
        setTimeout(done, 1500);
      }, 500);
    });
  }
  function showActor(id, visible) {
    const slot = document.getElementById('se-char-' + id);
    if (slot) slot.style.display = visible ? '' : 'none';
    const sh = camera.querySelector(`.se-shadow[data-for="${id}"]`);
    if (sh) sh.style.display = visible ? '' : 'none';
  }

  // ── Typewriter ─────────────────────────────────────────────────
  const S = { typing:false, blocked:false };
  let typeTimer = null, fullTxt = '', onTyped = null, curTxtEl = null, curTapEl = null;

  function typeWrite(txt, el, tapEl, done) {
    clearTimeout(typeTimer);
    S.typing = true; fullTxt = txt; onTyped = done;
    curTxtEl = el; curTapEl = tapEl;
    el.textContent = ''; if (tapEl) tapEl.style.display = 'none';
    let i = 0;
    (function next(){
      if (i < txt.length) { el.textContent += txt[i++]; typeTimer = setTimeout(next, typeSpeed); }
      else { S.typing = false; if (tapEl) tapEl.style.display = 'block';
             const cb = onTyped; onTyped = null; if (cb) cb(); }
    })();
  }
  function skipType() {
    if (!S.typing) return;
    clearTimeout(typeTimer); S.typing = false;
    if (curTxtEl) curTxtEl.textContent = fullTxt;
    if (curTapEl) curTapEl.style.display = 'block';
    const cb = onTyped; onTyped = null; if (cb) cb();
  }

  // ── Dots ───────────────────────────────────────────────────────
  let dots = [];
  function buildDots(n) {
    dotsBox.innerHTML = ''; dots = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'se-dot';
      dotsBox.appendChild(d); dots.push(d);
    }
  }
  function updateDots(i) {
    dots.forEach((d, k) =>
      d.className = 'se-dot' + (k < i ? ' done' : k === i ? ' active' : ''));
  }

  // ── Choices / info ─────────────────────────────────────────────
  function showChoices(opts) {
    S.blocked = true;
    choices.style.display = 'flex';
    choices.innerHTML = '';
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'se-choice' + (o.cls ? ' ' + o.cls : '');
      b.textContent = typeof o.label === 'function' ? o.label() : o.label;
      // stopPropagation: si no, el clic también dispara el "toca para
      // avanzar" del fondo y se salta la línea siguiente.
      b.onclick = (e) => { e.stopPropagation(); hideChoices(); (o.go || o.onSelect || advance)(); };
      choices.appendChild(b);
    });
  }
  function hideChoices() {
    S.blocked = false;
    choices.style.display = 'none';
    choices.innerHTML = '';
  }
  function showInfo(t) { infoBody.textContent = t; info.style.display = 'block'; }
  function hideInfo()  { info.style.display = 'none'; }

  function hideAll() {
    bubble.classList.remove('show');
    narrator.classList.remove('show');
    hideChoices();
    hideInfo();
  }

  // ── Script runner ──────────────────────────────────────────────
  let idx = -1;

  function applies(line) {
    return typeof line.when === 'function' ? !!line.when() : true;
  }

  function advance() {
    idx++;
    let line = script[idx];
    while (line && !applies(line)) { idx++; line = script[idx]; }
    if (!line) { finish(); return; }
    render(line);
  }

  function finish() {
    hideAll();
    if (config.onEnd) config.onEnd();
  }

  // FX: emoji que aparece sobre la cabeza del hablante, sube y se desvanece.
  function showSymbol(sym, who, framed) {
    const el = document.createElement('div');
    el.className = 'se-symbol';
    el.textContent = sym;
    const anc = anchorOf(who, framed || who);
    el.style.left = pct(anc.x);
    el.style.top  = pct(Math.max(0.10, anc.y - 0.08));
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('go'));
    setTimeout(() => el.remove(), 1700);
  }

  async function render(line) {
    // Recalcular aquí es barato (unos pocos estilos) y garantiza la geometría
    // correcta aunque no haya llegado ningún evento de resize.
    layout();
    hideAll();
    if (typeof line.m === 'number') updateDots(line.m);

    // A line may open a new scenario: swap the stage and reset which
    // characters stand on it. `cast` lists who is present now.
    if (line.cast) {
      for (const id of Object.keys(cast)) showActor(id, line.cast.includes(id));
    }
    if (line.stage && line.stage !== currentStage) {
      S.blocked = true;
      await setStage(line.stage);
      S.blocked = false;
    }

    // Expressions can be given as { beto:'confused', alicia:'smug' }
    if (line.exp) for (const [id, e] of Object.entries(line.exp)) setExpression(id, e);

    // A line with no speaker and a custom action is a pure beat
    // (an overlay, a form) — hand it to the page and wait.
    if (line.act && actions[line.act]) {
      S.blocked = true;
      const framed = line.frame ?? line.who;
      if (framed !== undefined) setCamera(framed === 'wide' ? 'wide' : framed);
      actions[line.act](() => { S.blocked = false; advance(); }, line);
      return;
    }

    const isNarrator = !line.who || line.who === 'narrator';
    const isPlayer   = line.who === 'player';
    const framed = line.frame ? line.frame
                 : (isNarrator || isPlayer) ? 'wide'
                 : line.who;
    setCamera(framed);

    // ── FX ── tinte de color (persiste hasta que otra línea lo cambie),
    // shake puntual, y símbolo flotante anclado a la cabeza del hablante.
    tint.className = 'se-tint' + (line.fx ? ' ' + line.fx : '');
    if (line.shake) { root.classList.remove('se-shake'); void root.offsetWidth; root.classList.add('se-shake'); }
    if (line.symbol) showSymbol(line.symbol, line.who, framed);

    const txt = typeof line.text === 'function' ? line.text() : (line.text || '');

    const after = () => {
      if (line.act === 'choice')     showChoices(resolveOpts(line));
      else if (line.act === 'info')  showInfo(typeof line.info === 'function' ? line.info() : line.info);
      else if (line.act === 'end')   setTimeout(finish, line.delay ?? 1400);
    };

    if (isNarrator) {
      narrator.classList.add('show');
      typeWrite(txt, narText, narTap, after);
      return;
    }

    if (isPlayer) {
      bubble.classList.add('player');
      bubble.style.left = '50%';
      bubble.style.top = 'auto';
      bubble.style.bottom = '16%';
      bSpk.textContent = config.playerLabel ? config.playerLabel() : 'Tú';
      bSpk.style.color = config.playerColor || '#2563EB';
    } else {
      const a = cast[line.who] || {};
      bubble.classList.remove('player');
      bSpk.textContent = a.name || line.who;
      bSpk.style.color = a.color || '#fff';
      // `box` pins the bubble to a fixed point on the background art
      // (top edge at that point, grows downward); otherwise anchor to
      // the speaker's head and grow upward as before.
      if (line.box) {
        bubble.classList.add('boxed');
        // Posición del punto de fondo, y luego LA MISMA transformación de
        // cámara que se aplica a la escena, para que el cuadro viaje pegado
        // a su elemento (letrero, pizarra…) cuando la cámara enfoca.
        const f  = framingFor(framed);
        const pc = (!framed || framed === 'wide' || !cast[framed]) ? 0.5 : cast[framed]._x;
        const cx = ((f.target - 0.5) / f.scale) - (pc - 0.5);
        const b  = bgToScreen(line.box.bx, line.box.by);
        bubble.style.left   = pct(0.5 + f.scale * ((b.x - 0.5) + cx));
        bubble.style.top    = pct(0.5 + f.scale * ((b.y - 0.5) + f.ty));
        bubble.style.bottom = 'auto';
      } else {
        bubble.classList.remove('boxed');
        const anc = anchorOf(line.who, framed);
        bubble.style.left   = pct(anc.x);
        bubble.style.top    = 'auto';
        bubble.style.bottom = pct(1 - anc.y + 0.02);
      }
    }

    // Let the camera settle before the bubble lands.
    setTimeout(() => {
      bubble.classList.add('show');
      typeWrite(txt, bTxt, bTap, after);
    }, config.cameraSettle ?? 420);
  }

  function resolveOpts(line) {
    const opts = typeof line.opts === 'function' ? line.opts() : line.opts;
    return (opts || []).filter(o => typeof o.when === 'function' ? o.when() : true);
  }

  // ── Tap to advance ─────────────────────────────────────────────
  root.addEventListener('click', () => {
    if (S.blocked) return;
    if (S.typing) { skipType(); return; }
    if (info.style.display !== 'none') { hideInfo(); advance(); return; }
    advance();
  });

  // ── Loading gate: don't start until the art is on screen ───────
  function artReady() {
    const imgs = [stageImg, ...camera.querySelectorAll('.se-char img')];
    return Promise.all(imgs.map(im => im.complete
      ? Promise.resolve()
      : new Promise(r => { im.onload = r; im.onerror = r; })));
  }

  return {
    root, camera, extra,
    setCamera, setExpression, setStage, showActor,
    showChoices, hideChoices, showInfo, hideInfo,
    advance, skipType,
    block(v = true) { S.blocked = v; },
    async start() {
      buildDots(config.moments ?? 0);
      if (config.onReady) config.onReady();
      await artReady();
      loading.remove();
      setTimeout(advance, config.startDelay ?? 650);
    },
  };
}
