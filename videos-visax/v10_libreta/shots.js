// ===== v10 — "La libreta de 312 nombres" =====
const SH = [];
function shot(a, fn, o = {}) { SH.push(Object.assign({ a, fn }, o)); }
HLW.length = 0;
HLW.push('padre', 'libreta', 'trescientos', 'doce', 'nombres', 'paco', 'fútbol', 'lola', 'marzo', 'página', 'septiembre', 'verano', 'nombre', 'carta', 'wifi', 'instagram', 'llama', 'siempre', 'venir', 'traspasa', 'gente', 'comida', 'sabes', 'mesas', 'móvil', 'avisas', 'tiempo', 'trece', 'frase');

let CLIPN = 0;
// handwritten line revealed left->right (k 0..1)
function hw(x, y, text, size, col, k, o = {}) {
  if (k <= 0) return '';
  const id = 'hw' + (CLIPN++), w = text.length * size * .5 + 40;
  return `<clipPath id="${id}"><rect x="${R(x - 10)}" y="${R(y - size * 1.1)}" width="${R(w * clamp(k))}" height="${R(size * 1.6)}"/></clipPath><g clip-path="url(#${id})">${txt(x, y, text, size, col, { hand: 1, w: 400, anchor: 'start' })}</g>`;
}
const HK = (t, a, b) => P(t, a, b);
function bookBase(t, o = {}) {
  let g = `<rect width="1080" height="1920" fill="${o.bg || '#6b4a32'}"/>`;
  for (let i = 0; i < 9; i++) g += `<rect x="0" y="${i * 230}" width="1080" height="6" fill="#000" opacity=".12"/>`;
  g += `<rect x="40" y="470" width="1000" height="1100" rx="26" fill="#5a2e1e" filter="url(#sh)"/>`;
  g += `<rect x="62" y="486" width="478" height="1068" rx="10" fill="url(#paper)"/><rect x="540" y="486" width="478" height="1068" rx="10" fill="url(#paper)"/>`;
  g += `<rect x="530" y="486" width="20" height="1068" fill="#000" opacity=".12"/>`;
  for (let i = 0; i < 17; i++) { const y = 600 + i * 56; g += `<path d="M90 ${y} L512 ${y} M568 ${y} L990 ${y}" stroke="#9bb7d8" stroke-width="2" opacity=".55"/>`; }
  g += `<path d="M130 500 L130 1540 M608 500 L608 1540" stroke="#e28a8a" stroke-width="2" opacity=".6"/>`;
  return g;
}
function polaroid(x, y, r, k, who, label) {
  if (k <= 0) return '';
  let g = `<rect x="-120" y="-130" width="240" height="280" rx="6" fill="#fff" filter="url(#sh)"/><rect x="-104" y="-114" width="208" height="200" fill="#bfe6ff"/>`;
  g += `<g clip-path="url(#pclip)">${person(0, 210, .62, Object.assign({ mood: 'happy' }, who))}</g>`;
  g += txt(0, 128, label, 38, C.ink, { hand: 1, w: 400 });
  g += `<rect x="-40" y="-150" width="80" height="34" fill="#f5e6a8" opacity=".85" transform="rotate(-6)"/>`;
  return G(`<clipPath id="pclip"><rect x="-104" y="-114" width="208" height="200"/></clipPath>` + g, tf(x, y, k, r));
}
function dadFrame(x, y, s) {
  let g = `<rect x="-130" y="-160" width="260" height="320" rx="10" fill="#7a4b2a" filter="url(#sh)"/><rect x="-110" y="-140" width="220" height="280" fill="#f3e3c3"/>`;
  g += `<clipPath id="dclip"><rect x="-110" y="-140" width="220" height="280"/></clipPath><g clip-path="url(#dclip)"><rect x="-110" y="-140" width="220" height="280" fill="#e9d2a8"/>${person(0, 330, .78, Object.assign({ mood: 'happy' }, DAD))}</g>`;
  g += `<path d="M60 -160 L130 -160 L130 -90Z" fill="#111"/><path d="M70 -160 L130 -100" stroke="#111" stroke-width="22"/>`;
  return G(g, tf(x, y, s));
}
function facade(t) {
  let g = `<rect width="1080" height="1920" fill="url(#skyDay)"/><circle cx="860" cy="330" r="110" fill="#fff6c8"/>`;
  g += `<rect y="1240" width="1080" height="700" fill="#f3d9a4"/>`;
  for (let i = 0; i < 30; i++) g += `<circle cx="${R(hash(i) * 1080)}" cy="${R(1260 + hash(i + 4) * 600)}" r="4" fill="#d9b77a"/>`;
  // hut
  g += `<rect x="120" y="760" width="840" height="520" fill="#c98a52"/>`;
  for (let i = 0; i < 14; i++) g += `<rect x="${120 + i * 60}" y="760" width="4" height="520" fill="#8a5a33" opacity=".5"/>`;
  g += `<path d="M60 790 L540 560 L1020 790Z" fill="#e8c26a"/>`;
  for (let i = 0; i < 16; i++) g += `<path d="M${R(60 + i * 60)} 790 L540 560" stroke="#b88a3a" stroke-width="5" opacity=".6"/>`;
  g += `<rect x="200" y="900" width="380" height="200" rx="10" fill="#3a2a22"/><rect x="190" y="1090" width="400" height="30" fill="#8a5a33"/>`;
  g += `<rect x="660" y="950" width="200" height="330" rx="8" fill="#5a3a22"/><circle cx="830" cy="1120" r="10" fill="#ffd27a"/>`;
  g += G(`<rect x="-300" y="-60" width="600" height="120" rx="16" fill="#2a1a12" stroke="#ffd27a" stroke-width="6"/>${txt(0, 22, 'CHIRINGUITO ANTONIO', 54, '#ffd27a', { hand: 1, w: 400 })}`, tf(540, 830, 1));
  g += dadFrame(390, 1000, .62);
  return g;
}
function bigText(x, y, s, k, col = '#ff3b4f', rot = -8) {
  if (k <= 0) return '';
  return G(`<ellipse cx="0" cy="-18" rx="${R(s.length * 22 + 50)}" ry="70" fill="none" stroke="${col}" stroke-width="9" stroke-dasharray="${R(900 * k)} 2000"/>`, tf(x, y, 1, rot));
}

function buildShots() {
  SH.length = 0;
  const T = {}; TL.lines.forEach(l => T[l.id] = l.s);
  // A: dad photo -> facade
  shot(0, (t, lt) => {
    const k = eio(P(lt, .15, 1.7));
    let g = cam(facade(t) + `<g>${person(700, 1420, 1.05, Object.assign({}, ROCIO, { apron: null, shirt: '#e9524f', sleeve: '#e9524f', mood: 'sad', look: -.8, ra: 25 }))}</g>`, lerp(390, 540, k), lerp(1100, 1050, k), lerp(3.0, 1.12, k));
    return g;
  });
  // B: notebook opens + 312
  shot(WT('h1', 7) - .05, (t, lt) => {
    CLIPN = 0;
    let g = bookBase(t);
    const names = ['Manoli · café con sacarina', 'Curro · tinto de verano', 'Los de Jerez · 4 cañas', 'Mari Carmen · sin gluten', 'Rafa · cumple el 3 de mayo', 'Pepi · la mesa del rincón', 'Andrés · nunca pide postre', 'Inma · le encanta el sol'];
    names.forEach((n, i) => { g += hw(150, 640 + i * 112, (i + 1) + '. ' + n.split(' · ')[0], 40, '#2a3a7a', 1); g += hw(170, 680 + i * 112, n.split(' · ')[1], 32, '#4a4a6a', 1); });
    const ns = ['Juanma · fino', 'Chari · descafeinado', 'El Rubio · gambas', 'Toñi · sin sal', 'Nico · con su hija', 'Lucía · cerveza 0,0', 'Manolo · paga siempre', 'Rocío · ¡mi niña!'];
    ns.forEach((n, i) => { g += hw(626, 640 + i * 112, (305 + i) + '. ' + n.split(' · ')[0], 40, '#2a3a7a', 1); g += hw(646, 680 + i * 112, n.split(' · ')[1], 32, '#4a4a6a', 1); });
    // cover opening
    const ck = eio(P(lt, 0, .35));
    if (ck < 1) g += G(`<rect x="0" y="470" width="500" height="1100" rx="20" fill="#5a2e1e"/><rect x="40" y="520" width="420" height="1000" rx="12" fill="none" stroke="#c9a27a" stroke-width="6"/>${ck < .5 ? txt(250, 1040, 'CLIENTES', 64, '#c9a27a', { hand: 1, w: 400 }) : ''}`, `translate(540 0) scale(${R(1 - 2 * ck, 3)} 1)`);
    const n = Math.floor(lerp(1, 312, eo(P(t, WT('h1', 10), WT('h1', 12) + .2))));
    const kk = pop(t, WT('h1', 11), .3);
    if (kk > 0) { g += G(`<rect x="-200" y="-110" width="400" height="220" rx="30" fill="#ff3b4f" filter="url(#sh)"/>${txt(0, 40, String(n), 150, '#fff')}${txt(0, 92, 'nombres', 40, '#ffe1e5', { w: 800 })}`, tf(540, 1080, kk, -4)); }
    return cam(g, 540, 1040, 1.0 + lt * .05);
  }, { whip: 1 });
  // C: Paco
  shot(T.h2, (t, lt) => {
    CLIPN = 0;
    let g = bookBase(t);
    g += hw(150, 700, '87. Paco', 64, '#2a3a7a', HK(t, WT('h2', 0) - .05, WT('h2', 0) + .4));
    g += hw(160, 790, 'manzanilla, bien fría', 46, '#2a3a7a', HK(t, WT('h2', 1) - .05, WT('h2', 1) + .5));
    g += hw(160, 880, '¡NO hablarle de fútbol!', 46, '#c22a3a', HK(t, WT('h2', 3) - .05, WT('h2', 7) + .3));
    g += polaroid(690, 1180, 6, pop(t, WT('h2', 0) + .1, .35), PACO, 'Paco');
    const bk = pop(t, WT('h2', 7), .3);
    if (bk > 0) g += G(`<circle r="54" fill="#fff" stroke="${C.ink}" stroke-width="6"/><path d="M-20 -30 L20 -30 L34 8 L0 34 L-34 8Z" fill="${C.ink}" opacity=".85"/><path d="M-64 -64 L64 64" stroke="#ff3b4f" stroke-width="14" stroke-linecap="round"/>`, tf(760, 1370, bk));
    return cam(g, 430, 960, 1.42 + lt * .04);
  }, { whip: 1 });
  // D: Lola
  shot(T.h3, (t, lt) => {
    CLIPN = 0;
    let g = bookBase(t);
    g += hw(150, 700, '142. Lola', 64, '#2a3a7a', HK(t, WT('h3', 0) - .05, WT('h3', 0) + .4));
    g += hw(160, 790, 'manzanilla sin hielo', 46, '#2a3a7a', HK(t, WT('h3', 1) - .05, WT('h3', 2) + .4));
    g += hw(160, 880, 'su marido murió en marzo.', 44, '#2a3a7a', HK(t, WT('h3', 3) - .05, WT('h3', 7) + .3));
    g += hw(160, 960, 'Sentarse con ella un ratito.', 44, '#2a3a7a', HK(t, WT('h3', 7) + .1, WT('h3', 7) + .7));
    g += polaroid(690, 1180, -5, pop(t, WT('h3', 0) + .1, .35), Object.assign({}, LOLA), 'Lola');
    const hk = pop(t, WT('h3', 5), .35);
    if (hk > 0) g += G(`<path d="M0 26 C-50 -16 -26 -52 0 -26 C26 -52 50 -16 0 26Z" fill="#ff4d6d"/>`, tf(780, 1360, hk * 1.2));
    return cam(g, 430, 960, 1.42 + lt * .04);
  }, { whip: -1 });
  // E: last page blurred
  shot(T.h4, (t, lt) => {
    CLIPN = 0;
    let g = bookBase(t);
    const fk = eio(P(lt, 0, .3));
    g += `<g filter="url(#soft)">${txt(780, 900, 'La gente no vuelve', 50, '#2a3a7a', { hand: 1, w: 400 })}${txt(780, 980, 'por la comida...', 50, '#2a3a7a', { hand: 1, w: 400 })}${txt(780, 1080, '— Papá', 50, '#2a3a7a', { hand: 1, w: 400 })}</g>`;
    g += `<rect x="62" y="486" width="478" height="1068" fill="#efdfb8" opacity=".9"/>${txt(300, 1040, 'FIN', 80, '#c9b48a', { hand: 1, w: 400 })}`;
    if (fk < 1) g += G(`<rect x="0" y="486" width="478" height="1068" fill="url(#paper)"/>`, `translate(540 0) scale(${R(1 - 2 * fk, 3)} 1)`);
    g += txt(780, 1300, '?', 200, '#ff3b4f', { op: R(pop(t, WT('h4', 6)) * (.7 + .3 * Math.sin(t * 8)), 2) });
    const sk = pop(t, WT('h4', 11), .3);
    if (sk > 0) g += G(`<rect x="-170" y="-80" width="340" height="160" fill="#ffe66d" filter="url(#sh)"/>${txt(0, 18, 'SEPTIEMBRE', 54, C.ink, { hand: 1, w: 400 })}`, tf(330, 1350, sk, -8));
    return cam(g, 600, 1000, 1.15 + lt * .08);
  }, { whip: 1 });
  // F: summer chaos
  shot(T.s1, (t, lt) => {
    const mx = lerp(240, 820, P(lt, 0, 2.4));
    const m = manRun(t, mx, 1250, .78, 1, 3);
    let w = world(t, 'chaos', m, { pal: 'day', signText: 'ANTONIO' });
    let g = cam(w, 540, 1150, 1.22 + lt * .04);
    const qs = [[CUST.P8.x, 870], [CUST.B.x, 870], [CUST.N9.x, 870], [CUST.A.x, 1050], [CUST.Cc.x, 1050]];
    qs.forEach(([x, y], i) => { const k = pop(t, WT('s1', 4) + i * .1, .3); if (k > 0) g += G(`<rect x="-80" y="-36" width="160" height="72" rx="36" fill="#fff" filter="url(#sh)"/>${txt(0, 18, '¿…?', 50, '#ff3b4f')}`, tf(540 + (x - 540) * 1.3, 960 + (y - 1150) * 1.3, k)); });
    return g;
  }, { whip: -1 });
  const cu = (c, z, text, tail, k0) => (t, lt) => {
    const m = manRun(t, lerp(-200, 1300, P(lt, .05, .55)), 1250, .78, 1);
    let g = cam(world(t, 'chaos', lt > .05 && lt < .55 ? m : null, { pal: 'day', hideMid: c.y < 1200 }), c.x, c.y - 170 * c.s, z + lt * .1);
    g += bubble(540, 760, text, { k: pop(t, k0, .2), fs: 54, tail });
    return g;
  };
  shot(T.s2, cu(CUST.A, 2.3, '¿Nos traes la carta?', -120, WT('s2', 1) - .1), { whip: 1 });
  shot(WT('s2', 2) - .04, cu(CUST.B, 3.2, '¿La clave del wifi?', 0, WT('s2', 3)), { whip: -1 });
  shot(WT('s2', 6) - .04, cu(CUST.Cc, 2.3, '¿Tenéis Instagram?', 120, WT('s2', 7)), { whip: 1 });
  shot(WT('s2', 8) - .04, cu(CUST.P8, 3.1, '¡Niña, la mesa 8!', -60, WT('s2', 9)), { whip: -1 });
  // H: Paco empty
  shot(T.s3, (t, lt) => {
    const c = CUST.P8;
    let w = world(t, 'chaos', null, { pal: 'day', noPaco: true, hideMid: true });
    w += G(`<path d="M-16 -50 L16 -50 L10 -8 Q0 0 -10 -8Z" fill="#fff4b8" stroke="#d7c27a" stroke-width="3"/><rect x="-3" y="-6" width="6" height="22" fill="#d7c27a"/><ellipse cy="16" rx="16" ry="5" fill="#d7c27a"/>`, tf(c.x + 20, c.y - 10, .9));
    return cam(w, c.x, c.y - 120 * c.s, 3.2 + lt * .2);
  }, { whip: 1, gray: t => P(t, S('s3'), S('s3') + 1.5) * .7 });
  shot(WT('s3', 4) - .05, (t, lt) => {
    const c = CUST.N9;
    const up = eio(P(lt, 0, .35)), walk = eio(P(lt, .3, 1.3));
    let w = world(t, 'chaos', null, { pal: 'day', hideMid: true, n9: { up, wx: walk * 400, mood: 'sad', look: 1 } });
    return cam(w, c.x + walk * 60, c.y - 170 * c.s, 3.0);
  }, { whip: -1, gray: t => .7 + P(t, WT('s3', 4), E('s3')) * .25 });
  // I: September rain, se traspasa
  shot(T.s4, (t, lt) => {
    const sk = WT('s4', 4) - .05;
    const m = { x: 420, y: 1250, s: .8, o: { mood: 'sad', ra: t > sk ? 150 : 20, la: 15, look: .5 } };
    let w = world(t, 'empty', m, { pal: 'grey', rain: 1 });
    const k = eob(P(t, sk, sk + .4));
    if (k > 0) w += G(`<path d="M-120 -170 L0 -230 L120 -170" stroke="#333" stroke-width="5" fill="none"/><rect x="-190" y="-170" width="380" height="170" rx="10" fill="#fff" stroke="#e23b4a" stroke-width="10"/>${txt(0, -104, 'SE', 50, '#e23b4a')}${txt(0, -42, 'TRASPASA', 66, '#e23b4a')}`, `translate(640 990) rotate(${R(Math.sin(t * 3) * 3 * (1 - P(t, sk, sk + 2)))}) scale(${R(k * .9, 3)})`);
    return cam(w, 540, 1080, 1.4 + lt * .04);
  }, { whip: 1, gray: () => .35 });
  shot(WT('s4', 8) - .05, (t, lt) => {
    // rocío sits alone, opens notebook
    let g = terraceBG(t, { pal: 'grey' });
    g += chairBack(540, 1600, 1.6) + person(540, 1600, 1.6, Object.assign({ sit: true }, ROCIO, { mood: 'sad', la: 30, ra: 30, look: 0 }));
    g += table(540, 1420, 2.0, { glasses: false });
    const ok = eio(P(t, WT('s4', 9), WT('s4', 11) + .2));
    g += G(`<rect x="-150" y="-40" width="300" height="80" fill="#5a2e1e"/><rect x="${R(-150 * ok)}" y="-36" width="${R(150 * ok)}" height="72" fill="url(#paper)"/><rect x="0" y="-36" width="${R(150)}" height="72" fill="url(#paper)" opacity="${R(ok, 2)}"/>`, tf(540, 1390, 1, 0) + ' scale(1 .55)');
    g += rain(t, .8);
    return g;
  }, { whip: -1, gray: () => .35 });
  // K: the phrase
  shot(T.s5 - .1, (t, lt) => {
    CLIPN = 0;
    let g = bookBase(t, { bg: '#4b3a33' });
    g += `<rect x="62" y="486" width="478" height="1068" fill="#efdfb8" opacity=".9"/>${txt(300, 1040, 'FIN', 80, '#c9b48a', { hand: 1, w: 400 })}`;
    const L1 = [['La gente', 0, 1], ['no vuelve', 2, 3], ['por la comida.', 4, 6]], L2 = [['Vuelve porque', 7, 8], ['te sabes', 9, 10], ['su nombre.', 11, 12]];
    let y = 760;
    [...L1, ...L2].forEach(([s, a, b], i) => { g += hw(590, y + i * 92 + (i > 2 ? 40 : 0), s, 62, '#1f2d6a', HK(t, WT('s5', a) - .05, WT('s5', b) + .25)); });
    g += hw(700, 1420, '— Papá', 60, '#1f2d6a', HK(t, E('s5') + .02, E('s5') + .35));
    const dk = P(t, E('s5') + .15, E('s5') + .5);
    if (dk > 0) { if (dk < 1) g += `<path d="M880 ${R(520 + dk * 720)} q14 22 0 34 q-14 -12 0 -34Z" fill="#8fd0ff"/>`; else g += `<ellipse cx="880" cy="1262" rx="${R(28 + 10 * P(t, E('s5') + .5, E('s5') + .8))}" ry="14" fill="#8fd0ff" opacity=".55"/>`; }
    return cam(g, 780, 1010, 1.42 + lt * .05);
  }, { whip: 1 });
  // L: rip sign, tags appear
  shot(T.s6, (t, lt) => {
    const rp = P(lt, .0, .45), cl = eio(P(t, WT('s6', 4) - .3, WT('s6', 5)));
    const pal = cl > .5 ? 'dusk' : 'grey';
    const m = { x: 420, y: 1250, s: .8, o: { mood: lt > .4 ? 'happy' : 'neutral', ra: 150 - rp * 120, la: 15 } };
    let w = world(t, 'empty', m, { pal, rain: 1 - cl, tagsAll: c => pop(t, WT('s6', 5) + ([CUST.P8, CUST.B, CUST.N9, CUST.A, CUST.Cc].indexOf(c)) * .12, .3) });
    if (rp < 1) { w += G(`<rect x="-190" y="-170" width="190" height="170" fill="#fff" stroke="#e23b4a" stroke-width="10"/>${txt(-95, -42, 'TRAS', 60, '#e23b4a')}`, `translate(${R(640 - rp * 300)} ${R(990 + rp * 500)}) rotate(${R(-rp * 60)})`); w += G(`<rect x="0" y="-170" width="190" height="170" fill="#fff" stroke="#e23b4a" stroke-width="10"/>${txt(95, -42, 'PASA', 60, '#e23b4a')}`, `translate(${R(640 + rp * 300)} ${R(990 + rp * 500)}) rotate(${R(rp * 60)})`); }
    return cam(w, 540, 1120, 1.3 + lt * .05);
  }, { whip: -1, gray: t => .35 * (1 - P(t, S('s6') + .6, S('s6') + 1.2)) });
  // M: phone montage
  shot(T.s7, (t, lt) => {
    let g = `<rect width="1080" height="1920" fill="url(#check)"/><rect width="1080" height="1920" fill="#1b1640" opacity=".25"/>`;
    const touch = WT('s7', 2);
    g += nfcTag(420, 1200, 1.5, t > touch ? 1 : .3);
    if (t > touch) g += ripple(420, 1200, t, touch);
    const app = eo(P(t, T.s7, touch));
    const px = lerp(980, 700, app), py = lerp(1700, 1080, app);
    g += hand(px + 60, py + 160, 1.6, -22);
    g += phone(px, py, 1.0, `<rect x="-160" y="-330" width="320" height="660" fill="#1b2340"/>${txt(0, 0, 'Acerca', 40, '#9fb4ff')}${txt(0, 50, 'a la mesa', 40, '#9fb4ff')}`, lerp(-24, -12, app));
    return g;
  }, { whip: 1 });
  shot(WT('s7', 3) - .05, (t, lt) => bgGrad('#ffb35c', '#ff7a59', t) + phone(540, 1010, 1.45 + lt * .04, menuScreen(t, WT('s7', 3), 0), 2), { whip: -1 });
  shot(WT('s7', 5) - .05, (t, lt) => bgGrad('#0e5fae', '#3AD6FF', t) + phone(540, 1010, 1.45 + lt * .04, wifiScreen(t, P(t, WT('s7', 5), WT('s7', 6) + .3), WT('s7', 6) + .2), -2), { whip: 1 });
  shot(WT('s7', 7) - .05, (t, lt) => bgGrad('#3a1a8a', '#8A4DFF', t) + phone(540, 1010, 1.45 + lt * .04, profileScreen(t, P(t, WT('s7', 8) + .1, WT('s7', 8) + .35)), 2), { whip: -1 });
  shot(WT('s7', 9) - .05, (t, lt) => { const pk = P(t, WT('s7', 13), WT('s7', 13) + .2); return bgGrad('#0f1630', '#3B7BEA', t) + ripple(540, 960, t, WT('s7', 13)) + phone(540, 1010, 1.45 + lt * .04, callScreen(t, pk), 0); }, { whip: 1 });
  // N: sitting with Lola
  shot(T.s8, (t, lt) => {
    const k = eio(P(lt, .2, 1.4));
    let w = world(t, 'calm', null, { pal: 'dusk', pacoToast: true, hideMid: true, n9: { extraSeat: true, mood: 'happy', look: .8, rp: { mood: 'happy', look: -.8, apron: '#3B7BEA' } }, tags: [1, 1, 1, 1, 1] });
    let g = cam(w, lerp(540, CUST.N9.x + 40, k), lerp(1150, 1000, k), lerp(1.3, 2.5, k));
    g += bubble(540, 700, 'Igualita que tu padre.', { k: pop(t, WT('s8', 5), .3), fs: 52, tail: 120 });
    return g;
  }, { whip: -1 });
  // O: 313
  shot(T.s9, (t, lt) => {
    CLIPN = 0;
    let g = bookBase(t);
    const ns = ['Juanma · fino', 'Chari · descafeinado', 'El Rubio · gambas', 'Toñi · sin sal', 'Nico · con su hija', 'Lucía · cerveza 0,0'];
    ns.forEach((n, i) => { g += hw(150, 640 + i * 112, (305 + i) + '. ' + n.split(' · ')[0], 40, '#2a3a7a', 1); g += hw(170, 680 + i * 112, n.split(' · ')[1], 32, '#4a4a6a', 1); });
    g += hw(150, 640 + 6 * 112, '311. Manolo', 40, '#2a3a7a', 1) + hw(150, 640 + 7 * 112, '312. Rocío · ¡mi niña!', 40, '#2a3a7a', 1);
    g += hw(600, 720, '313. Marta', 64, '#1f6fe0', HK(t, WT('s9', 0), WT('s9', 3) + .2));
    g += hw(610, 810, 'caña bien fría', 46, '#1f6fe0', HK(t, WT('s9', 3) + .1, WT('s9', 6)));
    g += hw(610, 900, 'viene con su perro,', 46, '#1f6fe0', HK(t, WT('s9', 6), WT('s9', 7) + .2));
    g += hw(610, 980, 'Lucas', 46, '#1f6fe0', HK(t, WT('s9', 7) + .2, WT('s9', 8) + .2));
    g += bigText(650, 720, '313.', P(t, WT('s9', 7), WT('s9', 8) + .4), '#ff3b4f', -6);
        return cam(g, 790, 880, 1.45 - lt * .08);
  }, { whip: 1 });
  // logo
  shot(E('s9') + .4, (t, lt) => {
    let g = `<rect width="1080" height="1920" fill="#08080f"/>`;
    g += `<circle cx="540" cy="930" r="${R(380 + 20 * Math.sin(t * 2))}" fill="url(#cglow)" opacity=".35"/>`;
    const k = eo(P(lt, 0, .6));
    g += G(txt(0, 0, 'VISAX', 170, '#fff', { ls: 10 }) + txt(0, 92, 'A I', 60, C.cyan, { ls: 18 }) + `<rect x="-280" y="40" width="${R(560 * k)}" height="6" rx="3" fill="url(#brand)"/>`, tf(540, 960, .9 + .1 * k), `opacity="${R(k, 2)}"`);
    return g;
  });
}

function sfxTimeline() {
  const L = []; const s = (t, n, v = 1) => L.push([R(t, 3), n, v]);
  s(0, 'shimmer', .4); s(WT('h1', 7) - .05, 'flip', .8); s(WT('h1', 10), 'riser_short', .5); s(WT('h1', 11), 'stamp', .9);
  s(S('h2'), 'whoosh', .6); s(S('h2'), 'scribble', .5); s(WT('h2', 0) + .1, 'pop', .6); s(WT('h2', 3), 'scribble', .5); s(WT('h2', 7), 'boing', .5);
  s(S('h3'), 'whoosh', .5); s(S('h3'), 'scribble', .5); s(WT('h3', 0) + .1, 'pop', .5); s(WT('h3', 3), 'scribble', .5); s(WT('h3', 5), 'tin', .4);
  s(S('h4'), 'flip', .8); s(WT('h4', 6), 'heart', .7); s(WT('h4', 11), 'stamp', .7);
  s(S('s1'), 'whoosh_big', .7); s(S('s1') + .1, 'crowd', .55); for (let i = 0; i < 5; i++) s(WT('s1', 4) + i * .1, 'pop', .5);
  [[1, 0], [2, 3], [6, 7], [8, 9]].forEach(([a, b], i) => { s(i === 0 ? S('s2') : WT('s2', a) - .04, 'whoosh', .7); s(WT('s2', i === 0 ? 1 : b) - (i === 0 ? .1 : 0), 'pop', .7); });
  s(S('s3'), 'whoosh', .5); s(WT('s3', 4), 'chair', .9);
  s(S('s4'), 'rain', .7); s(S('s4'), 'thud', .6); s(WT('s4', 4) - .05, 'creak', .8); s(WT('s4', 8) - .05, 'whoosh', .4); s(WT('s4', 9), 'flip', .5);
  s(S('s5') - .1, 'whoosh', .4); s(S('s5'), 'scribble', .45); s(WT('s5', 7), 'scribble', .45); s(E('s5') + .5, 'drop', .9);
  s(S('s6'), 'rip', 1); for (let i = 0; i < 5; i++) s(WT('s6', 5) + i * .12, 'tin', .5); s(WT('s6', 5) - .1, 'shimmer', .6);
  s(S('s7'), 'whoosh', .6); s(WT('s7', 2), 'tin', .9);
  [3, 5, 7, 9].forEach(i => s(WT('s7', i) - .05, 'whoosh', .6)); s(WT('s7', 6) + .2, 'success', .6); s(WT('s7', 8) + .3, 'success', .6); s(WT('s7', 13), 'tin', .8);
  s(S('s8'), 'whoosh', .5); s(WT('s8', 5), 'pop', .6);
  s(S('s9'), 'whoosh', .5); s(S('s9'), 'scribble', .5); s(WT('s9', 6), 'scribble', .5); s(WT('s9', 7), 'ding', .5);
  s(E('s9') + .4, 'logo', .8);
  return L;
}
