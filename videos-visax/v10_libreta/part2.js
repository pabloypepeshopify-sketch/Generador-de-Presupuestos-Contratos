// ===== timeline + shots =====
const S = id => TL.lines.find(l => l.id === id).s;
const E = id => TL.lines.find(l => l.id === id).e;
const WT = (id, i) => TL.lines.find(l => l.id === id).w[i][1];
const cam = (inner, cx, cy, z, r = 0) => G(inner, `translate(540 960) rotate(${R(r, 2)}) scale(${R(z, 4)}) translate(${R(-cx)} ${R(-cy)})`);
const shake = (t, a, amt) => [amt * a * Math.sin(t * 71), amt * a * Math.cos(t * 53)];

const MAN = { skin: SK[4], hair: 'pony', hairC: '#2a1610', shirt: '#ffffff', apron: '#3B7BEA', pants: '#2c3550', sleeve: '#ffffff' };
const ROCIO = MAN;
const LOLA = { skin: SK[0], hair: 'bun', hairC: '#dcdce6', shirt: '#b07ad6', glasses: true };
const DAD = { skin: SK[1], hairC: '#cfcfd8', mous: true, waiter: true, shirt: '#f7f7f7' };
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
function seatLola(t, o = {}) {
  const c = CUST.N9, { x, y, s } = c; let g = chairBack(x, y + 95 * s, s * 1.15);
  const lx = o.extraSeat ? x - 50 * s : x;
  if (o.extraSeat) g += chairBack(x + 170 * s, y + 95 * s, s * 1.15);
  if (o.extraSeat) g += person(x + 170 * s, y + 95 * s, s, Object.assign({ sit: true }, ROCIO, o.rp || {}));
  if (!o.gone) g += person(lx + (o.wx || 0), y + 95 * s - (o.up || 0) * 120 * s, s, Object.assign({ sit: (o.up || 0) < .5 }, LOLA, { mood: o.mood || 'neutral', look: o.look || 0, la: o.la, ra: o.ra }));
  g += table(x + (o.extraSeat ? 60 * s : 0), y, s * (o.extraSeat ? 1.25 : 1), { num: '9', tag: o.tag, plate: o.plate });
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
  if (mode === 'empty') {
    [CUST.P8, CUST.B, CUST.N9, CUST.A, CUST.Cc].forEach(c => { g += chairBack(c.x, c.y + 95 * c.s, c.s * 1.15) + table(c.x, c.y, c.s, { glasses: false, tag: o.tagsAll ? o.tagsAll(c) : 0 }); });
    if (m) g += person(m.x, m.y, m.s, Object.assign({}, MAN, m.o));
    return g + (o.rain ? rain(t, o.rain) : '');
  }
  const wig = i => Math.sin(t * 9 + i) * 8;
  // back row
  if (!o.noPaco) g += seat(CUST.P8, t, { p: chaos ? { ra: 172 + wig(1), mood: 'angry', look: .5 } : { ra: o.pacoToast ? 150 : 40, mood: 'happy', extra: '' }, tag: o.tags ? o.tags[0] : 0 }); else g += chairBack(CUST.P8.x, CUST.P8.y + 95 * CUST.P8.s, CUST.P8.s * 1.15) + table(CUST.P8.x, CUST.P8.y, CUST.P8.s, { num: '8' });
  if (!chaos && !o.noPaco) g += miniPhone(CUST.P8.x + 40, CUST.P8.y - 80, .62);
  g += seat(CUST.B, t, { p: chaos ? { la: 150 + wig(2), mood: 'neutral', look: Math.sin(t * 2) } : { mood: 'happy', blink: (t % 3) < .12 }, tag: o.tags ? o.tags[1] : 0 });
  if (o.n9 !== 'hide') g += seatLola(t, Object.assign({ mood: chaos ? 'neutral' : 'happy', tag: o.tags ? o.tags[2] : 0 }, o.n9 || {}));
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
  g += txt(0, -262, 'ANTONIO', 40, '#fff', { ls: 2 }) + txt(0, -226, 'Carta · Mesa 3', 24, '#cfe0ff', { w: 800 });
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
  g += txt(0, 130, 'Antonio_Clientes', 30, '#55627a', { w: 800 });
  const kk = pop(t, ok, .3);
  if (kk > 0) g += G(`<rect x="-120" y="-34" width="240" height="68" rx="34" fill="#22c07a"/>${txt(0, 12, '✓ Conectado', 32, '#fff')}`, tf(0, 230, kk));
  return g;
}
function profileScreen(t, kf) {
  let g = `<rect x="-160" y="-330" width="320" height="660" fill="#fff"/>`;
  g += `<circle cx="-92" cy="-218" r="50" fill="url(#brand)"/><circle cx="-92" cy="-218" r="44" fill="#1b1640"/>`;
  g += `<rect x="-100" y="-246" width="16" height="44" fill="#f7f2e8"/><rect x="-100" y="-234" width="16" height="7" fill="#e23b4a"/><path d="M-110 -202 L-74 -202 L-78 -194 L-106 -194Z" fill="#f7f2e8"/><path d="M-92 -250 L-40 -262 L-40 -240Z" fill="#fff6c8" opacity=".5"/>`;
  g += txt(-28, -230, 'chiringuitoantonio', 19, C.ink, { anchor: 'start' }) + txt(-28, -202, 'Chiringuito · Sanlúcar', 14, '#7a7f95', { anchor: 'start', w: 800 });
  const fol = kf >= 1, bs = 1 + .1 * Math.sin(P(kf, 0, 1) * Math.PI);
  g += G(`<rect x="-136" y="-24" width="272" height="52" rx="16" fill="${fol ? '#eef0f6' : C.blue}"/>${txt(0, 12, fol ? 'Siguiendo ✓' : 'Seguir', 28, fol ? C.ink : '#fff')}`, tf(0, -130, bs));
  const cols = [['#f39a62', '#3e2770'], ['#ffd36b', '#d98a25'], ['#3AD6FF', '#3B7BEA'], ['#ff8a7a', '#ffe7c7'], ['#8A4DFF', '#16123a'], ['#22c07a', '#fff4b8']];
  cols.forEach(([a, b], i) => { const x = -152 + (i % 3) * 102, y = -86 + Math.floor(i / 3) * 102; g += `<rect x="${x}" y="${y}" width="98" height="98" fill="${b}"/><circle cx="${x + 49}" cy="${y + 56}" r="26" fill="${a}"/>`; });
  g += txt(0, 190, '♥  ♥  ♥', 40, '#ff4d6d', { op: R(clamp((kf - 1) * 3), 2) });
  return g;
}
function callScreen(t, k) {
  let g = `<rect x="-160" y="-330" width="320" height="660" fill="#0f1630"/>`;
  g += txt(0, -230, 'ANTONIO · MESA 8', 24, '#9fb4ff', { w: 800 });
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

//@@SHOTS@@
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
