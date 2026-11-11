// ===== timeline + shots =====
const S = id => TL.lines.find(l => l.id === id).s;
const E = id => TL.lines.find(l => l.id === id).e;
const WT = (id, i) => TL.lines.find(l => l.id === id).w[i][1];
const cam = (inner, cx, cy, z, r = 0) => G(inner, `translate(540 960) rotate(${R(r, 2)}) scale(${R(z, 4)}) translate(${R(-cx)} ${R(-cy)})`);
const shake = (t, a, amt) => [amt * a * Math.sin(t * 71), amt * a * Math.cos(t * 53)];

const MAN = { skin: SK[1], hairC: '#22150f', mous: true, waiter: true, shirt: '#f7f7f7', pants: '#1d1d2b', sleeve: '#f7f7f7' };
const PACO = { skin: SK[0], hair: 'bald', hairC: '#6b4a3a', shirt: '#2fae7a', glasses: true };
const CUST = {
  B: { x: 540, y: 1120, s: .62, p: { skin: SK[2], shirt: '#ffb020', hairC: '#1b120d' } },
  P8: { x: 200, y: 1120, s: .62, p: PACO, num: '8' },
  N9: { x: 880, y: 1120, s: .62, num: '9' },
  A: { x: 360, y: 1340, s: .82, p: { skin: SK[4], hair: 'bun', hairC: '#8a4b2a', shirt: '#e9524f' }, num: '3' },
  Cc: { x: 720, y: 1340, s: .82, p: { skin: SK[0], hair: 'long', hairC: '#c4852f', shirt: '#8A4DFF' } },
};
const N9a = { skin: SK[3], hair: 'bun', hairC: '#1a1010', shirt: '#ff8a3d' };
const N9b = { skin: SK[1], hairC: '#5a3a22', shirt: '#5b6cff' };

function miniPhone(x, y, s, glow = 0) {
  return G(`<rect x="-20" y="-34" width="40" height="68" rx="8" fill="#111219"/><rect x="-16" y="-29" width="32" height="56" rx="5" fill="${glow ? C.cyan : '#7fb2ff'}"/>`, tf(x, y, s));
}
function seat(c, t, o = {}) {
  const { x, y, s } = c; let g = chairBack(x, y + 95 * s, s * 1.15);
  if (o.who !== false) g += person(x, y + 95 * s, s, Object.assign({ sit: true }, c.p, o.p || {}));
  g += table(x, y, s, { num: o.num || c.num, tag: o.tag, plate: o.plate });
  return g;
}
function seat9(t, o = {}) {
  const c = CUST.N9, { x, y, s } = c, s2 = s * .86;
  let g = chairBack(x - 48, y + 95 * s2, s2 * 1.1) + chairBack(x + 48, y + 95 * s2, s2 * 1.1);
  if (!o.gone) {
    const up = o.up || 0, wx = o.wx || 0;
    g += person(x - 48 + wx, y + 95 * s2 - up * 120 * s2, s2, Object.assign({ sit: up < .5 }, N9a, { mood: o.mood || 'neutral', look: o.lookA != null ? o.lookA : .8, la: o.la, ra: o.ra }));
    g += person(x + 48 + wx * 1.1, y + 95 * s2 - up * 120 * s2, s2, Object.assign({ sit: up < .5 }, N9b, { mood: o.mood || 'neutral', look: o.lookB != null ? o.lookB : -.8 }));
  }
  g += table(x, y, s, { num: o.numDown ? null : '9', tag: o.tag });
  if (o.numDown) g += G(`<rect x="-28" y="-14" width="56" height="28" rx="8" fill="#fff"/>`, tf(x + 10, y - 6, s));
  return g;
}
function badge(x, y, k, ch = '!', col = '#ff4d5e') {
  if (k <= 0) return '';
  return G(`<circle r="34" fill="${col}" filter="url(#sh)"/>${txt(0, 17, ch, 50, '#fff')}`, tf(x, y, k));
}
function raisedHandIcon(x, y, k) { return badge(x, y, k, '✋', '#ffffff'); }

// Terrace world. mode: chaos | calm.  m = manolo {x,y,s,o}
function world(t, mode, m, o = {}) {
  let g = terraceBG(t, o);
  const chaos = mode === 'chaos';
  const wig = i => Math.sin(t * 9 + i) * 8;
  // back row
  g += seat(CUST.P8, t, { p: chaos ? { ra: 172 + wig(1), mood: 'angry', look: .5 } : { ra: 40, mood: 'happy', extra: '' }, tag: o.tags ? o.tags[0] : 0 });
  if (!chaos) g += miniPhone(CUST.P8.x + 40, CUST.P8.y - 80, .62);
  g += seat(CUST.B, t, { p: chaos ? { la: 150 + wig(2), mood: 'neutral', look: Math.sin(t * 2) } : { mood: 'happy', blink: (t % 3) < .12 }, tag: o.tags ? o.tags[1] : 0 });
  if (o.n9 !== 'hide') g += seat9(t, Object.assign({ mood: chaos ? 'sad' : 'happy', tag: o.tags ? o.tags[2] : 0 }, o.n9 || {}));
  // manolo between rows
  if (m && m.y < 1330) g += person(m.x, m.y, m.s, Object.assign({}, MAN, m.o));
  if (m && m.lines) for (let i = 0; i < 5; i++) g += `<rect x="${R(m.x - m.dir * (140 + i * 50))}" y="${R(m.y - 300 + i * 50)}" width="${120 - i * 12}" height="10" rx="5" fill="#fff" opacity=".55"/>`;
  // mid row
  if (!o.hideMid) g += seat(CUST.A, t, { p: chaos ? { ra: 160 + wig(3), mood: 'neutral', look: -.6 } : { mood: 'happy' }, tag: o.tags ? o.tags[3] : 0, plate: chaos ? null : '#f0a43a' });
  if (!o.hideMid) g += seat(CUST.Cc, t, { p: chaos ? { la: 165 + wig(4), mood: 'angry', look: -1 } : { mood: 'happy', blink: (t % 2.6) < .12 }, tag: o.tags ? o.tags[4] : 0, plate: chaos ? null : '#ff8f8f' });
  if (m && m.y >= 1330 && !o.hideMid) g += person(m.x, m.y, m.s, Object.assign({}, MAN, m.o));
  // front decor tables
  if (!o.hideMid) g += table(60, 1700, 1.15, { glasses: true }) + table(1030, 1720, 1.15, { glasses: true });
  if (chaos && o.badges) {
    const bs = [[CUST.P8.x, 860], [CUST.B.x, 860], [CUST.N9.x, 860], [CUST.A.x, 1030], [CUST.Cc.x, 1030]];
    bs.forEach(([bx, by], i) => g += badge(bx, by - 20, pop(t, o.badges + i * .12)));
  }
  return g;
}
function manRun(t, x, y, s, dir = 1, tray = 3) {
  const ph = Math.sin(t * 22);
  return { x, y: y - Math.abs(ph) * 14, s, dir, lines: true, o: { step: ph, la: 40 + ph * 30, ra: 100, tray, mood: 'tired', sweat: t, flip: dir < 0, look: dir } };
}

function bgGrad(c1, c2, t) {
  let g = `<linearGradient id="bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><rect width="1080" height="1920" fill="url(#bgg)"/>`;
  for (let i = 0; i < 14; i++) { const x = hash(i + 3) * 1080, y = 300 + hash(i + 21) * 1300, r = 40 + hash(i + 7) * 90; g += `<circle cx="${R(x + Math.sin(t + i) * 20)}" cy="${R(y)}" r="${R(r)}" fill="#ffd27a" opacity="${R(.06 + .08 * hash(i + 2), 2)}"/>`; }
  return g;
}

// ---------- WATCH SCREENS ----------
function runScreen(t, km, hr, col = '#ff5a5a', sub = 'pasos  29.874') {
  let g = `<circle cx="0" cy="0" r="196" fill="none" stroke="#1d2030" stroke-width="18"/>`;
  g += `<path d="M0 -196 A196 196 0 1 1 ${R(-196 * Math.sin(Math.min(km / 21.1, .999) * Math.PI * 2) * -1)} ${R(-196 * Math.cos(Math.min(km / 21.1, .999) * Math.PI * 2))}" stroke="${col}" stroke-width="18" fill="none" stroke-linecap="round" transform="scale(-1 1)"/>`;
  g += txt(0, -88, 'DISTANCIA', 30, '#9aa3c7', { ls: 3 });
  g += txt(0, 40, km.toFixed(1).replace('.', ','), 150, '#fff');
  g += txt(0, 96, 'km', 44, col);
  const hb = 1 + .12 * Math.max(0, Math.sin(t * (hr / 60) * Math.PI * 2));
  g += G(`<path d="M0 10 C-30 -20 -14 -40 0 -24 C14 -40 30 -20 0 10Z" fill="${col}"/>`, tf(-50, 162, hb * 1.1)) + txt(20, 174, String(hr), 40, '#fff', { anchor: 'start' });
  return g;
}
function notifScreen(t, k) {
  let g = `<rect x="-190" y="-190" width="380" height="380" rx="80" fill="#0b2a55"/>`;
  g += G(`<circle r="64" fill="${C.cyan}"/><path d="M-22 6 Q-22 -30 0 -30 Q22 -30 22 6 L30 16 L-30 16Z M-8 22 Q0 34 8 22Z" fill="#0b2a55"/>`, tf(0, -80, .9 + .1 * Math.sin(t * 40)));
  g += txt(0, 56, 'MESA 8', 66, '#fff') + txt(0, 112, 'te llama', 38, C.cyan);
  return G(g, '', `opacity="${R(k, 2)}"`);
}

// ---------- PHONE SCREENS ----------
const FOOD = [
  ['Tortillitas de camarones', '9,50 €', (x, y) => [0, 1, 2].map(i => `<ellipse cx="${x - 40 + i * 40}" cy="${y + (i % 2) * 8}" rx="34" ry="22" fill="url(#gold)"/><circle cx="${x - 46 + i * 40}" cy="${y - 4}" r="4" fill="#ff8f6b"/><circle cx="${x - 30 + i * 40}" cy="${y + 6}" r="4" fill="#ff8f6b"/>`).join('')],
  ['Langostinos de Sanlúcar', '16,00 €', (x, y) => [0, 1, 2].map(i => `<path d="M${x - 50 + i * 36} ${y + 14} q-10 -40 26 -42 q-26 12 -12 36Z" fill="#ff8a7a" stroke="#d9544a" stroke-width="3"/>`).join('')],
  ['Pescaíto frito', '12,00 €', (x, y) => [0, 1].map(i => `<path d="M${x - 50 + i * 54} ${y + i * 6} q30 -24 56 0 q-26 24 -56 0Z M${x + 6 + i * 54} ${y + i * 6} l16 -12 l0 24Z" fill="url(#gold)"/>`).join('')],
  ['Manzanilla fresquita', '2,50 €', (x, y) => `<path d="M${x - 16} ${y - 34} L${x + 16} ${y - 34} L${x + 10} ${y + 4} Q${x} ${y + 12} ${x - 10} ${y + 4}Z" fill="#fff4b8" stroke="#d7c27a" stroke-width="3"/><rect x="${x - 3}" y="${y + 8}" width="6" height="24" fill="#d7c27a"/><ellipse cx="${x}" cy="${y + 34}" rx="18" ry="5" fill="#d7c27a"/>`],
];
function menuScreen(t, kPhotos, kOrder) {
  let g = `<rect x="-160" y="-330" width="320" height="660" fill="#fff7ec"/><rect x="-160" y="-330" width="320" height="120" fill="${C.blue}"/>`;
  g += txt(0, -262, 'EL FARO', 40, '#fff', { ls: 2 }) + txt(0, -226, 'Carta · Mesa 3', 24, '#cfe0ff', { w: 800 });
  FOOD.forEach(([n, p, fn], i) => {
    const y = -178 + i * 104, k = pop(t, kPhotos + i * .1, .25);
    g += `<rect x="-146" y="${y}" width="292" height="92" rx="18" fill="#fff" stroke="#f0e2cf" stroke-width="2"/>`;
    g += `<rect x="-138" y="${y + 8}" width="100" height="76" rx="14" fill="#ffe7c7"/>`;
    if (k > 0) g += G(fn(0, 0), `translate(-88 ${y + 50}) scale(${R(.55 * k, 3)})`);
    const words = n.split(' '); const l1 = words.slice(0, 2).join(' '), l2 = words.slice(2).join(' ');
    g += txt(-28, y + 32, l1, 17, C.ink, { anchor: 'start' }) + (l2 ? txt(-28, y + 54, l2, 17, C.ink, { anchor: 'start' }) : '') + txt(-28, y + 80, p, 18, C.blue, { anchor: 'start' });
  });
  const ok = kOrder >= 1;
  const bs = 1 - .08 * Math.sin(P(kOrder, 0, 1) * Math.PI);
  g += G(`<rect x="-130" y="-34" width="260" height="68" rx="34" fill="${ok ? '#22c07a' : C.blue}"/>${txt(0, 13, ok ? '✓ ¡PEDIDO!' : 'PEDIR', ok ? 30 : 34, '#fff')}`, tf(0, 268, bs));
  return g;
}
function wifiScreen(t, k, ok) {
  let g = `<rect x="-160" y="-330" width="320" height="660" fill="#f2fbff"/>`;
  for (let i = 0; i < 3; i++) { const on = k > i / 3; const r = 60 + i * 52; g += `<path d="M${-r * .78} ${-40 - r * .55} A${r} ${r} 0 0 1 ${r * .78} ${-40 - r * .55}" stroke="${on ? C.blue : '#cfdcec'}" stroke-width="30" fill="none" stroke-linecap="round" transform="translate(0 ${R(r * .2)})"/>`; }
  g += `<circle cx="0" cy="30" r="22" fill="${k > 0 ? C.blue : '#cfdcec'}"/>`;
  g += txt(0, 130, 'ElFaro_Clientes', 30, '#55627a', { w: 800 });
  const kk = pop(t, ok, .3);
  if (kk > 0) g += G(`<rect x="-120" y="-34" width="240" height="68" rx="34" fill="#22c07a"/>${txt(0, 12, '✓ Conectado', 32, '#fff')}`, tf(0, 230, kk));
  return g;
}
function profileScreen(t, kf) {
  let g = `<rect x="-160" y="-330" width="320" height="660" fill="#fff"/>`;
  g += `<circle cx="-92" cy="-218" r="50" fill="url(#brand)"/><circle cx="-92" cy="-218" r="44" fill="#1b1640"/>`;
  g += `<rect x="-100" y="-246" width="16" height="44" fill="#f7f2e8"/><rect x="-100" y="-234" width="16" height="7" fill="#e23b4a"/><path d="M-110 -202 L-74 -202 L-78 -194 L-106 -194Z" fill="#f7f2e8"/><path d="M-92 -250 L-40 -262 L-40 -240Z" fill="#fff6c8" opacity=".5"/>`;
  g += txt(-28, -230, 'elfaro.sanlucar', 19, C.ink, { anchor: 'start' }) + txt(-28, -202, 'Chiringuito · Sanlúcar', 14, '#7a7f95', { anchor: 'start', w: 800 });
  const fol = kf >= 1, bs = 1 + .1 * Math.sin(P(kf, 0, 1) * Math.PI);
  g += G(`<rect x="-136" y="-24" width="272" height="52" rx="16" fill="${fol ? '#eef0f6' : C.blue}"/>${txt(0, 12, fol ? 'Siguiendo ✓' : 'Seguir', 28, fol ? C.ink : '#fff')}`, tf(0, -130, bs));
  const cols = [['#f39a62', '#3e2770'], ['#ffd36b', '#d98a25'], ['#3AD6FF', '#3B7BEA'], ['#ff8a7a', '#ffe7c7'], ['#8A4DFF', '#16123a'], ['#22c07a', '#fff4b8']];
  cols.forEach(([a, b], i) => { const x = -152 + (i % 3) * 102, y = -86 + Math.floor(i / 3) * 102; g += `<rect x="${x}" y="${y}" width="98" height="98" fill="${b}"/><circle cx="${x + 49}" cy="${y + 56}" r="26" fill="${a}"/>`; });
  g += txt(0, 190, '♥  ♥  ♥', 40, '#ff4d6d', { op: R(clamp((kf - 1) * 3), 2) });
  return g;
}
function callScreen(t, k) {
  let g = `<rect x="-160" y="-330" width="320" height="660" fill="#0f1630"/>`;
  g += txt(0, -230, 'EL FARO · MESA 8', 24, '#9fb4ff', { w: 800 });
  const pr = k > 0;
  g += G(`<circle r="${R(110 + (pr ? 20 * Math.sin(t * 20) : 0))}" fill="${C.cyan}" opacity=".25"/><circle r="100" fill="${pr ? C.cyan : C.blue}"/><path d="M-30 14 Q-30 -36 0 -36 Q30 -36 30 14 L40 26 L-40 26Z M-10 34 Q0 48 10 34Z" fill="#fff"/>`, tf(0, -20, 1 - .06 * Math.sin(P(k, 0, 1) * Math.PI)));
  g += txt(0, 150, 'LLAMAR AL', 32, '#fff') + txt(0, 190, 'CAMARERO', 32, '#fff');
  if (pr) g += txt(0, 260, 'Avisado ✓', 28, '#22c07a');
  return g;
}

// ripple rings
function ripple(x, y, t, t0, col = C.cyan) {
  let g = '';
  for (let i = 0; i < 3; i++) { const k = P(t, t0 + i * .09, t0 + i * .09 + .55); if (k > 0 && k < 1) g += `<circle cx="${x}" cy="${y}" r="${R(40 + k * 300)}" fill="none" stroke="${col}" stroke-width="${R(16 * (1 - k))}" opacity="${R(1 - k, 2)}"/>`; }
  return g;
}

// =================== SHOTS ===================
const SH = [];
function shot(a, fn, o = {}) { SH.push(Object.assign({ a, fn }, o)); }
function buildShots() {
  SH.length = 0;
  const T = { h2: S('h2'), s1: S('s1'), s2: S('s2'), s3: S('s3'), s4: S('s4'), s5: S('s5'), s6: S('s6'), s7: S('s7'), s8: S('s8'), s9: S('s9'), s10: S('s10'), s11: S('s11'), s12: S('s12'), s13: S('s13'), s14: S('s14') };
  const feetA = WT('h1', 3) - .05, feetB = WT('h1', 5);
  // 0 HOOK: watch racing
  shot(0, (t, lt) => {
    const km = lerp(13.6, 21.1, eo(P(t, 0, 1.95)));
    const [sx, sy] = shake(t, 1, 10 * (1 - P(t, 1.9, 2.2)));
    let g = bgGrad('#2a1650', '#f08a5d', t);
    g += watch(560 + sx, 1000 + sy, 1.05 + lt * .05, runScreen(t, km, 168));
    if (t > 1.92) g += `<circle cx="560" cy="1000" r="${R(260 + P(t, 1.92, 2.3) * 300)}" fill="none" stroke="#fff" stroke-width="${R(20 * (1 - P(t, 1.92, 2.3)))}" opacity="${R(1 - P(t, 1.92, 2.3), 2)}"/>`;
    return g;
  });
  // feet insert
  shot(feetA, (t, lt) => {
    let g = `<rect width="1080" height="1920" fill="#5a3522"/>`;
    for (let i = 0; i < 12; i++) { const x = ((i * 180 - lt * 3800) % 2160 + 2160) % 2160 - 540; g += `<rect x="${R(x)}" y="0" width="16" height="1920" fill="#3a2218" opacity=".6"/>`; }
    for (let i = 0; i < 8; i++) g += `<rect x="${R((hash(i) * 1400 - lt * 4000) % 1400 + 1400 - 200)}" y="${R(700 + hash(i + 4) * 500)}" width="260" height="12" rx="6" fill="#fff" opacity=".5"/>`;
    const ph = Math.sin(lt * 34);
    g += G(`<rect x="-60" y="-500" width="120" height="460" rx="50" fill="#1d1d2b"/><ellipse cx="30" cy="-30" rx="110" ry="46" fill="#111"/>`, tf(420 + ph * 90, 1300 - Math.max(0, ph) * 80, 1, ph * 12));
    g += G(`<rect x="-60" y="-500" width="120" height="460" rx="50" fill="#1d1d2b"/><ellipse cx="30" cy="-30" rx="110" ry="46" fill="#111"/>`, tf(640 - ph * 90, 1300 - Math.max(0, -ph) * 80, 1, -ph * 12));
    return g;
  }, { whip: 1 });
  shot(feetB, (t, lt) => {
    let g = bgGrad('#2a1650', '#f08a5d', t);
    g += watch(560, 1000, 1.12 + lt * .04, runScreen(t, 21.1, 171, '#ff5a5a'));
    return g;
  }, { whip: -1 });
  // 1 reveal terrace: pull out from Manolo
  shot(T.h2, (t, lt) => {
    const k = eio(P(lt, 0, 1.2)), mx = lerp(380, 700, P(lt, 0, 1.6));
    const m = manRun(t, mx, 1250, .78, 1);
    return cam(world(t, 'chaos', m), lerp(mx, 540, k), lerp(1060, 1150, k), lerp(2.6, 1.22, k));
  });
  // 2 SÁBADO / LLENO stamps
  shot(T.s1, (t, lt) => {
    const mx = lerp(820, 300, P(lt, 0, 1.5));
    const m = manRun(t, mx, 1250, .78, -1);
    let g = cam(world(t, 'chaos', m, { badges: WT('s1', 4) - T.s1 + T.s1 }), 540, 1150, 1.22 + lt * .03);
    const k1 = pop(t, WT('s1', 0) - .02, .25), k2 = pop(t, WT('s1', 1), .22);
    if (k1 > 0) g += G(`<rect x="-260" y="-80" width="520" height="160" rx="24" fill="#1f2a22" stroke="#c9a27a" stroke-width="12"/>${txt(0, 30, 'SÁBADO · 21:47', 66, '#fff', { hand: 1, w: 400 })}`, tf(540, 640, k1, -3));
    if (k2 > 0) g += G(`<rect x="-170" y="-58" width="340" height="116" rx="16" fill="none" stroke="#ff3b4f" stroke-width="12"/>${txt(0, 30, 'LLENO', 86, '#ff3b4f')}`, tf(700, 800, 1.6 - .6 * k2, 10), `opacity="${R(clamp(k2 * 2), 2)}"`);
    return g;
  });
  // 3 cada mesa quiere algo: badges pop, push in
  shot(WT('s1', 3), (t, lt) => {
    const m = manRun(t, lerp(260, 640, P(lt, 0, 1.1)), 1250, .78, 1);
    return cam(world(t, 'chaos', m, { badges: WT('s1', 4) }), 540, 1110, 1.45 + lt * .1, Math.sin(t * 3) * .6);
  }, { whip: 1 });
  // 4 close-ups (boom boom)
  const cu = (c, z, text, tail, k0, extra) => (t, lt) => {
    const m = manRun(t, lerp(-200, 1300, P(lt, .1, .7)), 1250, .78, 1);
    let g = cam(world(t, 'chaos', lt > .1 && lt < .7 ? m : null, { hideMid: c.y < 1200 }), c.x, c.y - 170 * c.s, z + lt * .08);
    g += bubble(540, 760, text, { k: pop(t, k0, .22), fs: 54, tail: tail });
    if (extra) g += extra(t, lt);
    return g;
  };
  shot(T.s2, cu(CUST.A, 2.3, '¿Nos traes la carta?', -120, WT('s2', 0)), { whip: 1 });
  shot(WT('s2', 2) - .04, cu(CUST.B, 3.2, '¿La clave del wifi?', 0, WT('s2', 2)), { whip: -1 });
  shot(WT('s2', 6) - .04, cu(CUST.Cc, 2.3, '¿Cómo os llamáis\nen Insta?', 120, WT('s2', 6)), { whip: 1 });
  // 5 mesa 8: hand raised + clock
  shot(T.s3, (t, lt) => {
    const c = CUST.P8;
    const z = WT('s3', 4) - T.s3 > lt ? 3.0 : 3.6;
    const cy = lt < WT('s3', 4) - T.s3 ? c.y - 180 * c.s : c.y - 260 * c.s;
    let w = world(t, 'chaos', null, { hideMid: true });
    let g = cam(w, c.x + 10, cy, z + lt * .05);
    // clock
    const mins = Math.floor(lerp(0, 10, eio(P(t, WT('s3', 6), WT('s3', 11)))));
    const ck = pop(t, WT('s3', 2), .25);
    if (ck > 0) {
      const ang = (t - T.s3) * 900;
      g += G(`<circle r="120" fill="#fff" filter="url(#sh)"/><circle r="104" fill="none" stroke="${C.ink}" stroke-width="8"/><path d="M0 0 L0 -78" stroke="#ff3b4f" stroke-width="10" stroke-linecap="round" transform="rotate(${R(ang)})"/><path d="M0 0 L46 0" stroke="${C.ink}" stroke-width="12" stroke-linecap="round" transform="rotate(${R(ang / 12)})"/><circle r="12" fill="${C.ink}"/>`, tf(790, 760, ck));
      g += G(`<rect x="-150" y="-50" width="300" height="100" rx="50" fill="#ff3b4f"/>${txt(0, 22, `${Math.max(mins, 1)} MIN`, 62, '#fff')}`, tf(790, 940, ck));
    }
    // manolo blur pass in front
    const pk = P(t, WT('s3', 8) - .1, WT('s3', 8) + .35);
    if (pk > 0 && pk < 1) g += G(person(0, 0, 2.2, Object.assign({}, MAN, { tray: 3, ra: 100, mood: 'tired', step: Math.sin(t * 30) })), `translate(${R(lerp(-500, 1600, pk))} 2100)`, 'filter="url(#bx)"');
    return g;
  }, { whip: -1 });
  // 6 Si tienes un bar — Manolo to camera + tribe tiles
  shot(T.s4, (t, lt) => {
    let g = bgGrad('#24164a', '#6b3a8a', t);
    const tk = WT('s4', 3);
    const bars = [['BAR', '#e9524f'], ['CAFÉ', '#2fae7a'], ['TAPAS', '#ffb020'], ['MESÓN', '#3B7BEA'], ['CHIRINGUITO', '#8A4DFF'], ['TABERNA', '#ff8a3d']];
    bars.forEach(([n, c], i) => {
      const k = pop(t, tk - .1 + i * .07, .25); if (k <= 0) return;
      const x = 200 + (i % 3) * 340, y = 620 + Math.floor(i / 3) * 300;
      let s = `<rect x="-140" y="-110" width="280" height="220" rx="16" fill="#f3e9da"/><path d="M-150 -110 L150 -110 L140 -50 L-140 -50Z" fill="${c}"/>`;
      for (let j = 0; j < 6; j++) s += `<path d="M${-140 + j * 47} -50 q23 26 47 0" fill="${c}"/>`;
      s += txt(0, -68, n, n.length > 7 ? 28 : 38, '#fff') + `<rect x="-110" y="-10" width="90" height="120" fill="#3a2a5a"/><rect x="10" y="-10" width="100" height="70" fill="#ffd27a" opacity=".8"/>`;
      s += badge(80, -150, 1, '✋', '#fff');
      g += G(s, tf(x, y, k * .92, (i % 2 ? 3 : -3)));
    });
    const br = 1 + .03 * Math.sin(t * 14);
    g += G(person(0, 0, 1, Object.assign({}, MAN, { mood: 'tired', sweat: t, ra: 20, la: 20, tray: 0 })), `translate(540 ${1760}) scale(${R(1.95, 3)} ${R(1.95 * br, 3)})`);
    g += bubble(800, 1010, 'uff…', { k: pop(t, T.s4 + .2), fs: 54, tail: -80 });
    const ks = pop(t, WT('s4', 8) - .05, .2);
    if (ks > 0) g += G(`<rect x="-230" y="-62" width="460" height="124" rx="16" fill="none" stroke="#ffd93b" stroke-width="12"/>${txt(0, 30, 'ESTE SÁBADO', 70, '#ffd93b')}`, tf(540, 1300, 1.5 - .5 * ks, -6), `opacity="${R(clamp(ks * 2), 2)}"`);
    return g;
  }, { whip: 1 });
  // 7 mesa 9 se va
  shot(T.s5, (t, lt) => {
    const c = CUST.N9;
    const up = eio(P(t, WT('s5', 6) - .05, WT('s5', 6) + .35));
    const walk = eio(P(t, WT('s5', 7), WT('s5', 11) + .3));
    const gone = walk >= 1;
    let w = world(t, 'chaos', null, { n9: { up, wx: walk * 420, mood: up > 0 ? 'angry' : 'sad', lookA: up > 0 ? 1 : .8, lookB: up > 0 ? 1 : -.8, gone, numDown: gone }, hideMid: true });
    const z = lerp(3.0, 3.4, P(lt, 0, 2.9));
    let g = cam(w, c.x + walk * 80, c.y - 170 * c.s, z);
    return g;
  }, { whip: -1, gray: (t) => P(t, S('s5') + .3, S('s5') + 2.2) * .9 });
  shot(WT('s5', 11) + .2, (t, lt) => {
    const c = CUST.N9;
    let w = world(t, 'chaos', null, { n9: { gone: true, numDown: true }, hideMid: true });
    let g = cam(w, c.x, c.y - 60 * c.s, 3.6 + lt * .2);
    g += `<rect width="1080" height="1920" fill="#000" opacity="${R(.25 + P(lt, 0, .6) * .3, 2)}"/>`;
    return g;
  }, { gray: () => .95 });
  // 8 calendar flip -> Manolo shock
  shot(T.s6, (t, lt) => {
    let g = `<rect width="1080" height="1920" fill="#14122b"/>`;
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const k = P(t, WT('s6', 0), WT('s6', 4) + .1), idx = Math.min(6, Math.floor(eio(k) * 6.999));
    const flip = (eio(k) * 6.999) % 1;
    g += G(`<rect x="-300" y="-330" width="600" height="660" rx="30" fill="#fff" filter="url(#sh)"/><rect x="-300" y="-330" width="600" height="150" rx="30" fill="#ff3b4f"/><rect x="-300" y="-220" width="600" height="40" fill="#ff3b4f"/>${txt(0, -230, days[idx], days[idx].length > 7 ? 70 : 88, '#fff')}${txt(0, 120, String(14 + idx), 300, C.ink)}${idx === 6 ? txt(0, 250, 'siguiente', 64, '#ff3b4f', { hand: 1, w: 400 }) : ''}`, tf(540, 960, 1));
    if (idx < 6) g += G(`<rect x="-300" y="0" width="600" height="330" fill="#f2f2f6"/>`, `translate(540 960) scale(1 ${R(1 - flip, 3)})`);
    return g;
  }, { whip: 1 });
  shot(WT('s6', 5) - .05, (t, lt) => {
    let w = world(t, 'calm', { x: 540, y: 1250, s: .78, o: { tray: 3, ra: 100, mood: 'happy' } }, { n9: { mood: 'happy' } });
    let g = cam(w, 540, 1150, 1.2 + lt * .03);
    g += `<rect width="1080" height="1920" fill="#14122b" opacity=".45"/>`;
    const sc = 2.3 + lt * .08;
    g += G(person(0, 0, 1, Object.assign({}, MAN, { mood: 'shock', la: 30, ra: 30 })), `translate(540 ${R(1900 + 0)}) scale(${R(sc, 3)}) translate(0 0) scale(-1 1)`);
    g += G(`<g transform="translate(0 0)">${txt(0, 0, '?!', 140, C.yel, { stroke: '#14122b', sw: 14 })}</g>`, tf(820, 980, pop(t, WT('s6', 7)), 10));
    return g;
  }, { whip: -1 });
  // 9 calm terrace
  shot(T.s7, (t, lt) => {
    const mx = lerp(260, 760, P(lt, 0, 2.4)), ph = Math.sin(t * 8);
    const m = { x: mx, y: 1250 - Math.abs(ph) * 4, s: .78, o: { step: ph * .5, ra: 100, la: 20, tray: 3, mood: 'happy' } };
    let g = cam(world(t, 'calm', m), 540, 1150, 1.25 + lt * .04);
    for (let i = 0; i < 3; i++) g += txt(mx * 1.25 - 135 + 60 + i * 50, 640 - ((lt * 1.2 + i * .3) % 1) * 140, '♪', 64, '#fff', { op: R(1 - ((lt * 1.2 + i * .3) % 1), 2) });
    return g;
  }, { whip: 1 });
  shot(WT('s7', 3) - .05, (t, lt) => {
    const c = CUST.P8;
    let g = cam(world(t, 'calm', null, { hideMid: true }), c.x + 20, c.y - 180 * c.s, 3.0 + lt * .1);
    g += G(`<circle r="70" fill="#22c07a" filter="url(#sh)"/><path d="M-30 0 L-8 24 L32 -22" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, tf(820, 780, pop(t, WT('s7', 6))));
    return g;
  }, { whip: -1 });
  // 10 reveal tag in darkness
  shot(T.s8, (t, lt) => {
    const fl = WT('s8', 3) - .03;
    let g = `<rect width="1080" height="1920" fill="#07060f"/>`;
    g += `<ellipse cx="540" cy="1000" rx="520" ry="520" fill="url(#spot)" opacity="${R(.25 + .1 * Math.sin(t * 9), 2)}"/>`;
    g += `<circle cx="540" cy="1000" r="430" fill="url(#check)" opacity="${t < fl ? .12 : .9}"/>`;
    const tag = nfcTag(540, 1000, 1.7 + (t > fl ? .06 * eob(P(t, fl, fl + .4)) : 0), t > fl ? .9 : 0);
    g += t < fl ? G(tag, '', 'filter="url(#sil)"') : tag;
    if (t > fl) { for (let i = 0; i < 12; i++) g += `<path d="M540 1000 L${R(540 + Math.cos(i * .52 + t) * 900)} ${R(1000 + Math.sin(i * .52 + t) * 900)} L${R(540 + Math.cos(i * .52 + t + .1) * 900)} ${R(1000 + Math.sin(i * .52 + t + .1) * 900)}Z" fill="#3AD6FF" opacity=".07"/>`; }
    if (t < fl) g += txt(540, 1380, '?', 160, '#ffffff', { op: R(.35 + .2 * Math.sin(t * 10), 2) });
    const fk = P(t, fl, fl + .35);
    if (fk > 0 && fk < 1) g += `<rect width="1080" height="1920" fill="#fff" opacity="${R(1 - fk, 2)}"/>`;
    return g;
  });
  shot(WT('s8', 4) - .05, (t, lt) => {
    const st = WT('s8', 4);
    const tags = [0, 1, 2, 3, 4].map(i => pop(t, st + i * .1, .3));
    let g = cam(world(t, 'calm', null, { tags }), 540, 1150, 1.2);
    g += `<rect width="1080" height="1920" fill="#07060f" opacity=".35"/>`;
    return g;
  }, { whip: 1 });
  // 11 touch + menu
  shot(T.s9, (t, lt) => {
    let g = `<rect width="1080" height="1920" fill="url(#check)"/><rect width="1080" height="1920" fill="#1b1640" opacity=".25"/>`;
    const touch = WT('s9', 2);
    const big = eio(P(t, WT('s9', 3) - .1, WT('s9', 3) + .3));
    g += nfcTag(420, 1200, 1.5, t > touch ? 1 : .3);
    if (t > touch) g += ripple(420, 1200, t, touch);
    const app = eo(P(t, T.s9, touch));
    const px = lerp(lerp(980, 700, app), 540, big), py = lerp(lerp(1700, 1080, app), 1010, big), ps = lerp(1.0, 1.45, big), pr = lerp(lerp(-24, -12, app), 0, big);
    const kPh = WT('s9', 9) - .05, kOr = P(t, WT('s9', 11), WT('s9', 11) + .25);
    const scr = big > .05 ? menuScreen(t, kPh, kOr) : `<rect x="-160" y="-330" width="320" height="660" fill="#1b2340"/>${txt(0, 0, 'Acerca', 40, '#9fb4ff')}${txt(0, 50, 'a la mesa', 40, '#9fb4ff')}`;
    if (big < .5) g += hand(px + 60 * (1 - big), py + 160, 1.6 * (1 - big), pr - 10);
    g += phone(px, py, ps, scr, pr);
    // tap finger + ticket
    const tk = WT('s9', 11);
    if (t > tk - .2 && t < tk + .3) g += `<circle cx="540" cy="${R(1010 + 268 * 1.45)}" r="${R(40 + 30 * P(t, tk - .2, tk))}" fill="#fff" opacity=".5"/>`;
    const fk = P(t, tk + .25, tk + .85);
    if (fk > 0 && fk < 1) g += G(`<rect x="-60" y="-80" width="120" height="160" rx="8" fill="#fff" filter="url(#sh)"/><rect x="-40" y="-50" width="80" height="10" fill="#c9cde0"/><rect x="-40" y="-26" width="60" height="10" fill="#c9cde0"/><rect x="-40" y="-2" width="70" height="10" fill="#c9cde0"/>${txt(0, 56, 'MESA 3', 22, C.blue)}`, tf(lerp(540, 980, eio(fk)), lerp(1300, 560, eio(fk)), lerp(1, .5, fk), fk * 40));
    return g;
  }, { whip: -1 });
  // 12 wifi
  shot(T.s10, (t, lt) => {
    let g = bgGrad('#0e5fae', '#3AD6FF', t);
    const touch = T.s10 + .2;
    const k = P(t, WT('s10', 1), WT('s10', 3) + .1);
    g += ripple(540, 960, t, touch, '#fff');
    g += phone(540, 1010, 1.48 + lt * .03, wifiScreen(t, k, WT('s10', 3)), Math.sin(t * 2) * 2);
    return g;
  }, { whip: 1 });
  // 13 social
  shot(T.s11, (t, lt) => {
    let g = bgGrad('#3a1a8a', '#8A4DFF', t);
    g += ripple(540, 960, t, T.s11 + .08, '#fff');
    const kf = P(t, WT('s11', 3) - .1, WT('s11', 3) + .15);
    g += phone(540, 1010, 1.48 + lt * .03, profileScreen(t, kf), Math.sin(t * 2) * -2);
    if (kf >= 1) for (let i = 0; i < 6; i++) { const q = ((t - WT('s11', 3)) * 1.1 + i * .17) % 1; g += txt(240 + i * 120, 1380 - q * 700, '♥', 80 + i * 6, ['#ff4d6d', '#ffd93b', '#fff'][i % 3], { op: R(1 - q, 2) }); }
    return g;
  }, { whip: -1 });
  // 14 call waiter: Paco thinking -> phone press -> watch -> arrives
  shot(T.s12, (t, lt) => {
    const c = CUST.P8;
    let w = world(t, 'calm', null, { tags: [1, 0, 0, 0, 0], hideMid: true });
    let g = cam(w, c.x + 20, c.y - 180 * c.s, 3.0 + lt * .06);
    g += bubble(800, 770, '¿Y el camarero?', { k: pop(t, WT('s12', 2)), fs: 50, tail: -140 });
    return g;
  }, { whip: 1 });
  shot(WT('s12', 5) - .05, (t, lt) => {
    let g = bgGrad('#0f1630', '#3B7BEA', t);
    const pk = P(t, WT('s12', 6), WT('s12', 6) + .2);
    g += ripple(540, 960, t, WT('s12', 6));
    g += phone(540, 1010, 1.48, callScreen(t, pk), 0);
    if (pk > 0 && pk < 1) g += `<circle cx="540" cy="930" r="${R(60 + 80 * pk)}" fill="#fff" opacity="${R(.5 * (1 - pk), 2)}"/>`;
    return g;
  }, { whip: -1 });
  shot(WT('s12', 9) - .05, (t, lt) => {
    const [sx, sy] = shake(t, 1, 12);
    let g = bgGrad('#2a1650', '#f08a5d', t);
    g += watch(560 + sx, 1000 + sy, 1.1, notifScreen(t, pop(t, WT('s12', 9))));
    for (let i = 0; i < 3; i++) g += `<path d="M${R(250 - i * 40)} ${R(700 - i * 30)} q-30 40 0 80" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity="${R(.5 + .5 * Math.sin(t * 30 + i), 2)}"/><path d="M${R(870 + i * 40)} ${R(1200 + i * 30)} q30 -40 0 -80" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity="${R(.5 + .5 * Math.sin(t * 30 + i), 2)}"/>`;
    return g;
  }, { whip: 1 });
  shot(WT('s12', 12) - .05, (t, lt) => {
    const c = CUST.P8;
    const ak = eo(P(lt, 0, .35));
    const m = { x: lerp(700, c.x + 130, ak), y: 1250, s: .62 * 1.15, o: { mood: 'happy', ra: 60, la: 20, tray: 0, flip: true, look: -1 } };
    let w = world(t, 'calm', m, { tags: [1, 0, 0, 0, 0], hideMid: true });
    let g = cam(w, c.x + 70, c.y - 190 * c.s, 2.6 + lt * .05);
    g += bubble(760, 760, '¡Dime, Paco!', { k: pop(t, WT('s12', 12) + .25), fs: 56, tail: -60 });
    return g;
  }, { whip: -1 });
  // 15 watch loop
  shot(T.s13, (t, lt) => {
    let g = bgGrad('#2a1650', '#f08a5d', t);
    const z = lerp(1.08, .7, eio(P(t, WT('s13', 2), E('s13') + .1)));
    g += watch(560, 1000, z, runScreen(t, 21.1, 96, '#22c07a'));
    return g;
  }, { whip: 1 });
  // 16 final: each step a plate
  shot(T.s14, (t, lt) => {
    const beats = [WT('s14', 2), WT('s14', 3), WT('s14', 4), WT('s14', 6)];
    const mx = lerp(240, 820, P(lt, 0, 2.2)), ph = Math.sin(t * 8);
    const m = { x: mx, y: 1250 - Math.abs(ph) * 5, s: .78, o: { step: ph * .5, ra: 100, la: 20, tray: Math.max(0, 3 - beats.filter(b => t > b).length) + 1, mood: 'happy' } };
    const plates = [CUST.A, CUST.B, CUST.Cc, CUST.N9];
    let w = world(t, 'calm', m);
    plates.forEach((c, i) => { const k = pop(t, beats[i], .3); if (k > 0) w += G(`<circle r="90" fill="url(#bulb)" opacity=".8"/>${txt(0, 30, '✦', 90, '#fff')}`, tf(c.x + 40 * c.s, c.y - 140 * c.s, k * c.s * 1.4)); });
    for (let i = 0; i < 6; i++) { const fx = 240 + i * 100; if (fx < mx - 40) w += `<ellipse cx="${fx}" cy="${1262 + (i % 2) * 14}" rx="22" ry="9" fill="${C.cyan}" opacity="${R(.25 + .5 * (fx / mx), 2)}"/>`; }
    let g = cam(w, lerp(500, 560, P(lt, 0, 2.4)), 1150, lerp(1.45, 1.2, eio(P(lt, 0, 2.4))));
    return g;
  }, { whip: -1 });
  // 17 logo
  shot(E('s14') + .35, (t, lt) => {
    let g = `<rect width="1080" height="1920" fill="#08080f"/>`;
    g += `<circle cx="540" cy="930" r="${R(380 + 20 * Math.sin(t * 2))}" fill="url(#cglow)" opacity=".35"/>`;
    const k = eo(P(lt, 0, .6));
    g += G(txt(0, 0, 'VISAX', 170, '#fff', { ls: 10 }) + txt(0, 92, 'A I', 60, C.cyan, { ls: 18 }) + `<rect x="-280" y="40" width="${R(560 * k)}" height="6" rx="3" fill="url(#brand)"/>`, tf(540, 960, .9 + .1 * k), `opacity="${R(k, 2)}"`);
    return g;
  });
}

// SFX timeline
function sfxTimeline() {
  const L = [];
  const s = (t, n, v = 1) => L.push([R(t, 3), n, v]);
  s(0, 'riser_short', .6); for (let i = 0; i < 12; i++) s(i * .16, 'tick', .35);
  s(WT('h1', 3) - .05, 'whoosh', .8); s(WT('h1', 5), 'whoosh', .7); s(1.92, 'ding', .7);
  s(S('h2'), 'whoosh_big', .8); s(S('h2') + .2, 'crowd', .5);
  s(WT('s1', 0) - .02, 'stamp', .9); s(WT('s1', 1), 'stamp', .9);
  s(WT('s1', 3), 'whoosh', .6); for (let i = 0; i < 5; i++) s(WT('s1', 4) + i * .12, 'pop', .5);
  s(S('s2'), 'whoosh', .7); s(WT('s2', 0), 'pop', .7);
  s(WT('s2', 2) - .04, 'whoosh', .7); s(WT('s2', 2), 'pop', .7);
  s(WT('s2', 6) - .04, 'whoosh', .7); s(WT('s2', 6), 'pop', .7);
  s(S('s3'), 'whoosh', .7); s(WT('s3', 2), 'pop', .6); for (let i = 0; i < 10; i++) s(WT('s3', 6) + i * .12, 'tick', .45); s(WT('s3', 8) - .1, 'whoosh_big', .7);
  s(S('s4'), 'whoosh', .6); for (let i = 0; i < 6; i++) s(WT('s4', 3) - .1 + i * .07, 'pop', .45); s(WT('s4', 8) - .05, 'stamp', .9);
  s(S('s5'), 'whoosh', .5); s(WT('s5', 6), 'chair', .9); s(WT('s5', 11) + .2, 'thud', .9);
  s(WT('s6', 0), 'flip', .7); s(WT('s6', 5) - .05, 'whoosh', .6); s(WT('s6', 7), 'boing', .6); s(S('s6') + .6, 'riser', .7);
  s(S('s7'), 'whoosh', .6); s(WT('s7', 6), 'ding', .6);
  s(S('s8'), 'heart', .8); s(WT('s8', 3) - .03, 'impact', 1); s(WT('s8', 3) - .03, 'shimmer', .7); for (let i = 0; i < 5; i++) s(WT('s8', 4) + i * .1, 'tin', .45);
  s(S('s9'), 'whoosh', .6); s(WT('s9', 2), 'tin', .9); s(WT('s9', 3) - .1, 'whoosh', .5); for (let i = 0; i < 4; i++) s(WT('s9', 9) - .05 + i * .1, 'pop', .45); s(WT('s9', 11), 'success', .8); s(WT('s9', 11) + .25, 'whoosh', .5);
  s(S('s10'), 'whoosh', .6); s(S('s10') + .2, 'tin', .8); for (let i = 0; i < 3; i++) s(WT('s10', 1) + i * .2, 'blip', .5); s(WT('s10', 3), 'success', .7);
  s(S('s11'), 'whoosh', .6); s(S('s11') + .08, 'tin', .8); s(WT('s11', 3), 'success', .7);
  s(S('s12'), 'whoosh', .6); s(WT('s12', 2), 'pop', .6); s(WT('s12', 5) - .05, 'whoosh', .6); s(WT('s12', 6), 'tin', .9); s(WT('s12', 9) - .05, 'buzz', .9); s(WT('s12', 12) - .05, 'whoosh', .6); s(WT('s12', 12) + .25, 'pop', .6);
  s(S('s13'), 'whoosh', .5); s(S('s13') + .1, 'ding', .45);
  s(S('s14'), 'whoosh', .5); [2, 3, 4, 6].forEach(i => s(WT('s14', i), 'tin', .55));
  s(E('s14') + .35, 'logo', .8);
  return L;
}

// =================== RENDER ===================
let BUILT = false;
function render(t) {
  if (!BUILT) { buildShots(); BUILT = true; }
  let i = 0; for (let j = 0; j < SH.length; j++) if (t >= SH[j].a) i = j;
  const sh = SH[i], lt = t - sh.a;
  let body = sh.fn(t, lt);
  if (sh.whip && lt < .14) { const k = eo(lt / .14); body = G(body, `translate(${R(sh.whip * 260 * (1 - k))} 0)`, 'filter="url(#bx)"'); }
  const gray = sh.gray ? sh.gray(t) : 0;
  const vg = `<rect width="1080" height="1920" fill="url(#vign)"/>`;
  document.getElementById('st').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${DEFS}${PHCLIP}<g style="filter:saturate(${R(1 - gray, 2)})">${body}</g>${vg}${captions(t)}</svg>`;
}
window.render = render; window.sfxList = () => { buildShots(); return sfxTimeline(); };
window.setTL = tl => { TL = tl; BUILT = false; };
