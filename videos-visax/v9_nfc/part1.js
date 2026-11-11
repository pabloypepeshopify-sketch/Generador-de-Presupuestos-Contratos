// ===== VISAX v9 — "Manolo y la media maratón" — kit 2D =====
const W = 1080, H = 1920;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eo = k => 1 - Math.pow(1 - k, 3);
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eob = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const pop = (t, a, d = .28) => t < a ? 0 : eob(P(t, a, a + d));
const sn = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * Math.PI * 2);
const R = (x, n = 1) => Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// deterministic noise
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const C = { blue: '#3B7BEA', cyan: '#3AD6FF', vio: '#8A4DFF', ink: '#14122b', white: '#ffffff', yel: '#FFD93B', warm: '#ffd27a' };
const SK = ['#f4cda6', '#e3ad80', '#c98a5c', '#9a643f', '#f1c29b'];

function txt(x, y, s, size, fill = '#fff', opt = {}) {
  const fam = opt.hand ? 'CaveatB' : 'NunitoX';
  const w = opt.w || 900, anc = opt.anchor || 'middle';
  const st = opt.stroke ? `stroke="${opt.stroke}" stroke-width="${opt.sw || 10}" stroke-linejoin="round" paint-order="stroke"` : '';
  return `<text x="${R(x)}" y="${R(y)}" font-family="${fam}" font-weight="${w}" font-size="${size}" fill="${fill}" text-anchor="${anc}" ${st} ${opt.ls ? `letter-spacing="${opt.ls}"` : ''} ${opt.op != null ? `opacity="${opt.op}"` : ''}>${esc(s)}</text>`;
}
const G = (inner, tr = '', extra = '') => `<g ${tr ? `transform="${tr}"` : ''} ${extra}>${inner}</g>`;
const tf = (x, y, s = 1, r = 0) => `translate(${R(x)} ${R(y)}) rotate(${R(r)}) scale(${R(s, 3)})`;

// ---------- DEFS ----------
const DEFS = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16123a"/><stop offset=".55" stop-color="#3e2770"/><stop offset=".85" stop-color="#b8527a"/><stop offset="1" stop-color="#f39a62"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d77a7a"/><stop offset=".25" stop-color="#5a3f86"/><stop offset="1" stop-color="#231c55"/></linearGradient>
<linearGradient id="deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4b33"/><stop offset="1" stop-color="#4b2c1f"/></linearGradient>
<radialGradient id="bulb"><stop offset="0" stop-color="#fff6d0"/><stop offset=".25" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<radialGradient id="spot"><stop offset="0" stop-color="#fff3d6" stop-opacity=".9"/><stop offset=".6" stop-color="#ffd27a" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="cglow"><stop offset="0" stop-color="#3AD6FF" stop-opacity=".9"/><stop offset=".5" stop-color="#3B7BEA" stop-opacity=".35"/><stop offset="1" stop-color="#3B7BEA" stop-opacity="0"/></radialGradient>
<radialGradient id="vign" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B7BEA"/><stop offset=".55" stop-color="#3AD6FF"/><stop offset="1" stop-color="#8A4DFF"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#d98a25"/></linearGradient>
<filter id="bx" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="38 0"/></filter>
<filter id="by" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="0 38"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="sil"><feColorMatrix type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.02  0 0 0 0 0.06  0 0 0 1 0"/></filter>
<filter id="gray"><feColorMatrix type="saturate" values="0.15"/></filter>
<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".35"/></filter>
<pattern id="check" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#f4f7ff"/><rect width="18" height="18" fill="#3B7BEA" opacity=".55"/><rect x="18" y="18" width="18" height="18" fill="#3B7BEA" opacity=".55"/></pattern>
</defs>`;

// ---------- PERSON ----------
// feet at (0,0), height ~ 340. o: skin, shirt, pants, hair, hairC, mood, la/ra (arm angles deg: 0 down, 180 up), waiter, mous, blink, look(-1..1), sit
function person(x, y, s, o = {}) {
  const sk = o.skin || SK[0], sh = o.shirt || '#e9524f', pa = o.pants || '#2c3550', hc = o.hairC || '#2b1d16';
  const la = o.la != null ? o.la : 12, ra = o.ra != null ? o.ra : 12, L = 118;
  const lk = (o.look || 0) * 10;
  let g = '';
  if (!o.sit) g += `<ellipse cx="0" cy="4" rx="70" ry="13" fill="#000" opacity=".22"/>`;
  if (!o.sit) {
    const st = o.step || 0; // walking
    g += `<rect x="-36" y="${-128 + st * 6}" width="28" height="${126 - st * 6}" rx="13" fill="${pa}"/><rect x="8" y="${-128 - st * 6}" width="28" height="${126 + st * 6}" rx="13" fill="${pa}"/>`;
    g += `<ellipse cx="-24" cy="${-2 + st * 0}" rx="24" ry="11" fill="#1a1a24"/><ellipse cx="24" cy="-2" rx="24" ry="11" fill="#1a1a24"/>`;
  }
  const arm = (side, a) => {
    const sx = side * 50, sy = -228, rad = a * Math.PI / 180;
    const ex = sx + side * Math.sin(rad) * L, ey = sy + Math.cos(rad) * L;
    const mx = (sx + ex) / 2 + side * 8, my = (sy + ey) / 2 + 4;
    return `<path d="M${sx} ${sy} Q${R(mx)} ${R(my)} ${R(ex)} ${R(ey)}" stroke="${o.sleeve || sh}" stroke-width="27" stroke-linecap="round" fill="none"/><circle cx="${R(ex)}" cy="${R(ey)}" r="16" fill="${sk}"/>`;
  };
  // arms behind when down
  g += arm(-1, la) + arm(1, ra);
  g += `<rect x="-57" y="-258" width="114" height="150" rx="44" fill="${sh}"/>`;
  if (o.waiter) {
    g += `<path d="M-57 -220 L-20 -258 L-6 -170 Z" fill="#1d1d2b"/><path d="M57 -220 L20 -258 L6 -170 Z" fill="#1d1d2b"/>`;
    g += `<rect x="-57" y="-176" width="114" height="70" rx="20" fill="#1d1d2b"/>`;
    g += `<path d="M-16 -258 L0 -248 L16 -258 L16 -238 L0 -248 L-16 -238 Z" fill="#e23b4a"/>`;
    g += `<rect x="-46" y="-150" width="92" height="96" rx="14" fill="#f7f2e8" opacity=".97"/>`;
  }
  if (o.dress) g += `<path d="M-57 -170 L-80 -20 L80 -20 L57 -170Z" fill="${sh}"/>`;
  g += `<rect x="-14" y="-276" width="28" height="26" fill="${sk}"/>`;
  // head
  g += `<g transform="translate(${lk} 0)">`;
  if (o.hair === 'long') g += `<path d="M-70 -300 Q-74 -190 -40 -200 L40 -200 Q74 -190 70 -300 Z" fill="${hc}"/>`;
  g += `<circle cx="0" cy="-322" r="64" fill="${sk}"/>`;
  g += `<circle cx="-62" cy="-318" r="12" fill="${sk}"/><circle cx="62" cy="-318" r="12" fill="${sk}"/>`;
  if (o.hair !== 'bald') {
    if (o.hair === 'bun') g += `<circle cx="0" cy="-394" r="26" fill="${hc}"/>`;
    if (o.hair === 'curly') { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.112); g += `<circle cx="${R(Math.cos(a) * 58)}" cy="${R(-330 + Math.sin(a) * 58)}" r="22" fill="${hc}"/>`; } }
    else g += `<path d="M-66 -318 Q-70 -392 0 -392 Q70 -392 66 -318 Q50 -350 10 -352 Q-30 -352 -66 -318Z" fill="${hc}"/>`;
  } else g += `<path d="M-64 -318 Q-66 -300 -60 -290 L-56 -320Z" fill="${hc}"/><path d="M64 -318 Q66 -300 60 -290 L56 -320Z" fill="${hc}"/>`;
  const m = o.mood || 'neutral', bl = o.blink ? 1.5 : 9;
  const ex = lk * .4;
  if (m === 'shock') g += `<circle cx="${-23 + ex}" cy="-322" r="12" fill="#fff"/><circle cx="${23 + ex}" cy="-322" r="12" fill="#fff"/><circle cx="${-23 + ex}" cy="-322" r="6" fill="#1a1426"/><circle cx="${23 + ex}" cy="-322" r="6" fill="#1a1426"/>`;
  else if (m === 'happy' && !o.blink) g += `<path d="M${-33 + ex} -320 Q${-23 + ex} -333 ${-13 + ex} -320" stroke="#1a1426" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${13 + ex} -320 Q${23 + ex} -333 ${33 + ex} -320" stroke="#1a1426" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  else g += `<ellipse cx="${-23 + ex}" cy="-322" rx="7.5" ry="${bl}" fill="#1a1426"/><ellipse cx="${23 + ex}" cy="-322" rx="7.5" ry="${bl}" fill="#1a1426"/>`;
  // brows
  const bw = { angry: [8, -8], sad: [-8, 8], shock: [-4, -4], tired: [-6, 6], happy: [-2, -2], neutral: [0, 0] }[m] || [0, 0];
  g += `<path d="M${-36 + ex} ${-344 - (m === 'shock' ? 10 : 0)} L${-12 + ex} ${-344 + bw[0] - (m === 'shock' ? 10 : 0)}" stroke="${hc}" stroke-width="6" stroke-linecap="round"/><path d="M${12 + ex} ${-344 + bw[0] * -1 * -1 - (m === 'shock' ? 10 : 0) + (bw[1] - bw[0]) * 0}" stroke="none"/>`;
  g += `<path d="M${12 + ex} ${-344 + (m === 'angry' ? 8 : m === 'sad' || m === 'tired' ? 0 : 0) - (m === 'shock' ? 10 : 0)} L${36 + ex} ${-344 + (m === 'angry' ? -8 : m === 'sad' || m === 'tired' ? 8 : 0) - (m === 'shock' ? 10 : 0)}" stroke="${hc}" stroke-width="6" stroke-linecap="round"/>`;
  // nose
  g += `<ellipse cx="${ex}" cy="-302" rx="8" ry="6" fill="#000" opacity=".12"/>`;
  if (o.mous) g += `<path d="M${-28 + ex} -286 Q${-14 + ex} -300 ${ex} -290 Q${14 + ex} -300 ${28 + ex} -286 Q${14 + ex} -280 ${ex} -284 Q${-14 + ex} -280 ${-28 + ex} -286Z" fill="${hc}"/>`;
  if (o.glasses) g += `<circle cx="${-23 + ex}" cy="-322" r="17" stroke="#1a1426" stroke-width="5" fill="none"/><circle cx="${23 + ex}" cy="-322" r="17" stroke="#1a1426" stroke-width="5" fill="none"/><path d="M${-6 + ex} -322 L${6 + ex} -322" stroke="#1a1426" stroke-width="5"/>`;
  // mouth
  const my = o.mous ? -270 : -278;
  if (m === 'happy') g += `<path d="M${-20 + ex} ${my - 4} Q${ex} ${my + 20} ${20 + ex} ${my - 4} Z" fill="#7a1f2b"/><circle cx="${-40 + ex}" cy="-296" r="10" fill="#ff7a8a" opacity=".45"/><circle cx="${40 + ex}" cy="-296" r="10" fill="#ff7a8a" opacity=".45"/>`;
  else if (m === 'sad') g += `<path d="M${-16 + ex} ${my + 6} Q${ex} ${my - 8} ${16 + ex} ${my + 6}" stroke="#1a1426" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  else if (m === 'shock') g += `<ellipse cx="${ex}" cy="${my + 2}" rx="12" ry="16" fill="#5a1520"/>`;
  else if (m === 'angry') g += `<path d="M${-16 + ex} ${my + 4} Q${ex} ${my - 4} ${16 + ex} ${my + 4}" stroke="#1a1426" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  else if (m === 'tired') g += `<ellipse cx="${ex}" cy="${my + 2}" rx="15" ry="10" fill="#5a1520"/><path d="M${-8 + ex} ${my + 6} Q${ex} ${my + 14} ${8 + ex} ${my + 6}" fill="#ff7a8a"/>`;
  else g += `<path d="M${-14 + ex} ${my} L${14 + ex} ${my}" stroke="#1a1426" stroke-width="6" stroke-linecap="round"/>`;
  if (o.sweat) { for (let i = 0; i < 3; i++) { const ph = ((o.sweat * 1.7 + i * .33) % 1); g += `<path d="M${74 + i * 10} ${-360 + ph * 60} q8 14 0 22 q-8 -8 0 -22Z" fill="#8fe3ff" opacity="${R(1 - ph, 2)}"/>`; } }
  g += `</g>`;
  if (o.tray) { const tx = 50 + Math.sin(ra * Math.PI / 180) * L, ty = -228 + Math.cos(ra * Math.PI / 180) * L - 18; g += trayG(tx, ty, o.tray); }
  if (o.extra) g += o.extra;
  return G(g, tf(x, y, s) + (o.flip ? ' scale(-1 1)' : ''));
}
function trayG(x, y, n = 3) {
  let g = `<ellipse cx="${R(x)}" cy="${R(y)}" rx="86" ry="16" fill="#c9ced8"/><ellipse cx="${R(x)}" cy="${R(y - 4)}" rx="86" ry="14" fill="#e8ebf2"/>`;
  const it = [[-46, '#f7f2e8', '#f0a43a'], [0, '#f7f2e8', '#ff8f8f'], [44, '#f7f2e8', '#e7c94a']];
  for (let i = 0; i < Math.min(n, 3); i++) { const [dx, pl, fd] = it[i]; g += `<ellipse cx="${R(x + dx)}" cy="${R(y - 10)}" rx="30" ry="9" fill="${pl}"/><ellipse cx="${R(x + dx)}" cy="${R(y - 16)}" rx="20" ry="9" fill="${fd}"/>`; }
  if (n > 3) g += `<rect x="${R(x + 56)}" y="${R(y - 58)}" width="22" height="46" rx="6" fill="#ffe9a8" opacity=".9"/><rect x="${R(x + 56)}" y="${R(y - 58)}" width="22" height="10" rx="4" fill="#fff"/>`;
  return g;
}

// ---------- TABLE / CHAIR ----------
function chairBack(x, y, s, c = '#c9843f') {
  return G(`<rect x="-60" y="-300" width="120" height="150" rx="22" fill="${c}"/><rect x="-44" y="-284" width="88" height="10" rx="5" fill="#000" opacity=".15"/><rect x="-44" y="-256" width="88" height="10" rx="5" fill="#000" opacity=".15"/>`, tf(x, y, s));
}
function table(x, y, s, o = {}) {
  let g = `<ellipse cx="0" cy="150" rx="150" ry="20" fill="#000" opacity=".22"/>`;
  g += `<rect x="-10" y="40" width="20" height="110" fill="#5a3a26"/><ellipse cx="0" cy="150" rx="46" ry="10" fill="#3a2418"/>`;
  g += `<path d="M-150 0 L-140 70 Q-120 82 -100 70 Q-80 82 -60 70 Q-40 82 -20 70 Q0 82 20 70 Q40 82 60 70 Q80 82 100 70 Q120 82 140 70 L150 0Z" fill="url(#check)"/>`;
  g += `<ellipse cx="0" cy="0" rx="150" ry="34" fill="#f4f7ff"/><ellipse cx="0" cy="0" rx="150" ry="34" fill="url(#check)" opacity=".5"/>`;
  if (o.glasses !== false) g += `<path d="M-90 -40 L-82 0 L-62 0 L-54 -40Z" fill="#cfe9ff" opacity=".75"/><path d="M60 -40 L66 0 L86 0 L92 -40Z" fill="#ffe9a8" opacity=".85"/>`;
  if (o.plate) g += `<ellipse cx="0" cy="-4" rx="44" ry="12" fill="#fff"/><ellipse cx="0" cy="-10" rx="28" ry="10" fill="${o.plate}"/>`;
  if (o.num) g += `<rect x="-24" y="-88" width="48" height="56" rx="10" fill="#fff" filter="url(#sh)"/><rect x="-3" y="-32" width="6" height="24" fill="#888"/>` + txt(0, -45, o.num, 40, C.ink);
  if (o.tag) g += nfcTag(o.tagX || 20, -6, .34, o.tag, true);
  return G(g, tf(x, y, s));
}
// ---------- NFC TAG ----------
function nfcTag(x, y, s, glow = 0, flat = false) {
  let g = '';
  if (glow > 0) g += `<circle cx="0" cy="0" r="${R(200 + glow * 40)}" fill="url(#cglow)" opacity="${R(clamp(glow), 2)}"/>`;
  const sy = flat ? .32 : 1;
  g += `<g transform="scale(1 ${sy})"><circle cx="0" cy="${flat ? 16 : 10}" r="120" fill="#000" opacity=".3"/><circle cx="0" cy="0" r="120" fill="#101018"/><circle cx="0" cy="0" r="108" fill="none" stroke="url(#brand)" stroke-width="10"/>`;
  if (!flat) {
    for (let i = 0; i < 3; i++) g += `<path d="M${-18 + i * 26} ${-34 - i * 10} Q${10 + i * 34} 0 ${-18 + i * 26} ${34 + i * 10}" stroke="${C.cyan}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
    g += `<circle cx="-40" cy="0" r="11" fill="${C.cyan}"/>` + txt(0, 84, 'VISAX', 26, '#fff', { ls: 3 });
  } else {
    for (let i = 0; i < 3; i++) g += `<path d="M${-18 + i * 26} ${-34 - i * 10} Q${10 + i * 34} 0 ${-18 + i * 26} ${34 + i * 10}" stroke="${C.cyan}" stroke-width="13" fill="none" stroke-linecap="round"/>`;
  }
  g += `</g>`;
  return G(g, tf(x, y, s));
}

// ---------- TERRACE BACKGROUND ----------
function stringLights(t, y0, sag, n, x0 = -40, x1 = 1120, ph = 0) {
  let g = `<path d="M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 + sag * 2} ${x1} ${y0}" stroke="#1a1430" stroke-width="4" fill="none"/>`;
  for (let i = 1; i < n; i++) {
    const k = i / n, x = lerp(x0, x1, k), yy = y0 + sag * 4 * k * (1 - k) + 8;
    const fl = .8 + .2 * Math.sin(t * 6 + i * 2.1 + ph);
    g += `<circle cx="${R(x)}" cy="${R(yy + 16)}" r="${R(46 * fl)}" fill="url(#bulb)" opacity=".8"/><circle cx="${R(x)}" cy="${R(yy + 14)}" r="9" fill="#fff3c4"/>`;
  }
  return g;
}
function palm(x, y, s, t) {
  let g = `<path d="M0 0 Q-10 -200 20 -420" stroke="#1d1433" stroke-width="30" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) { const a = -160 + i * 50 + Math.sin(t * 1.2 + i) * 4; g += G(`<path d="M0 0 Q90 -40 190 20 Q90 -10 0 0Z" fill="#1d1433"/>`, `translate(20 -420) rotate(${R(a + 90)})`); }
  return G(g, tf(x, y, s));
}
function terraceBG(t, o = {}) {
  let g = `<rect x="-800" y="-400" width="2680" height="1500" fill="url(#sky)"/>`;
  for (let i = 0; i < 40; i++) g += `<circle cx="${R(hash(i) * 1080)}" cy="${R(hash(i + 50) * 600)}" r="${R(1.5 + hash(i + 9) * 2.5)}" fill="#fff" opacity="${R(.3 + .5 * Math.abs(Math.sin(t * 2 + i)), 2)}"/>`;
  g += `<circle cx="760" cy="905" r="120" fill="#ffb26b" opacity=".95"/><circle cx="760" cy="905" r="200" fill="#ffb26b" opacity=".18"/>`;
  g += `<path d="M-800 870 L0 880 L60 862 L120 872 L170 850 L240 868 L320 855 L400 870 L480 852 L560 866 L640 858 L720 872 L800 856 L880 868 L960 850 L1080 866 L1880 870 L1880 905 L-800 905Z" fill="#2a1d45"/>`;
  g += `<rect x="-800" y="900" width="2680" height="130" fill="url(#sea)"/>`;
  for (let i = 0; i < 9; i++) { const yy = 915 + i * 13, w = 120 - i * 8 + 30 * Math.sin(t * 2 + i); g += `<rect x="${R(760 - w / 2 + 20 * Math.sin(t + i))}" y="${yy}" width="${R(w)}" height="4" rx="2" fill="#ffd0a0" opacity="${R(.55 - i * .05, 2)}"/>`; }
  // lighthouse far
  g += `<rect x="150" y="820" width="22" height="60" fill="#e9e3ff"/><rect x="150" y="836" width="22" height="10" fill="#e23b4a"/><rect x="146" y="812" width="30" height="10" fill="#2a1d45"/>`;
  const beam = Math.sin(t * 1.4);
  g += `<path d="M161 816 L${R(161 + beam * 380)} 780 L${R(161 + beam * 380)} 850Z" fill="#fff6c8" opacity=".16"/>`;
  g += palm(60, 1060, 1.05, t) + palm(1040, 1080, .95, t + 1);
  // deck
  g += `<rect x="-800" y="1010" width="2680" height="1400" fill="url(#deck)"/>`;
  for (let i = -8; i <= 8; i++) g += `<path d="M${540 + i * 40} 1010 L${540 + i * 210} 1920" stroke="#3a2218" stroke-width="4" opacity=".55"/>`;
  for (let i = 0; i < 7; i++) { const yy = 1010 + Math.pow(i / 7, 1.6) * 910; g += `<path d="M-800 ${R(yy)} L1880 ${R(yy)}" stroke="#3a2218" stroke-width="3" opacity=".35"/>`; }
  // railing
  g += `<rect x="-800" y="985" width="2680" height="16" fill="#e7d3b5"/>`;
  for (let i = -20; i < 48; i++) g += `<rect x="${i * 40 + 10}" y="1000" width="9" height="40" fill="#e7d3b5" opacity=".85"/>`;
  g += `<rect x="-800" y="1036" width="2680" height="10" fill="#c9a27a"/>`;
  // sign
  if (o.sign !== false) g += G(`<rect x="-150" y="-50" width="300" height="100" rx="18" fill="#2a1a12" stroke="#ffd27a" stroke-width="5"/>${txt(0, 18, 'EL FARO', 54, '#ffd27a', { hand: 1, w: 400, ls: 3 })}<circle cx="-118" cy="0" r="8" fill="#ffd27a"/><circle cx="118" cy="0" r="8" fill="#ffd27a"/>`, tf(540, 560 + Math.sin(t * 2) * 3, 1, Math.sin(t * 1.5) * 1.5));
  g += stringLights(t, 470, 70, 9) + stringLights(t, 640, 60, 8, -60, 1140, 1);
  return g;
}

// ---------- BUBBLE ----------
function bubble(x, y, text, o = {}) {
  const k = o.k == null ? 1 : o.k;
  if (k <= 0) return '';
  const fs = o.fs || 50, lines = String(text).split('\n');
  const w = o.w || Math.max(...lines.map(l => l.length)) * fs * .56 + 70, h = lines.length * fs * 1.18 + 44;
  const tx = o.tail || 0; // tail x offset relative
  const bg = o.bg || '#fff', fg = o.fg || C.ink;
  let g = `<rect x="${R(-w / 2)}" y="${R(-h)}" width="${R(w)}" height="${R(h)}" rx="${R(Math.min(44, h / 2))}" fill="${bg}"/>`;
  g += `<path d="M${R(tx - 22)} -4 L${R(tx + (o.tdx || 10))} 44 L${R(tx + 26)} -4Z" fill="${bg}"/>`;
  lines.forEach((l, i) => g += txt(0, -h + 22 + fs * .95 + i * fs * 1.18, l, fs, fg, { w: 900 }));
  return G(G(g, '', 'filter="url(#sh)"'), tf(x, y, k));
}

// ---------- PHONE ----------
function phone(x, y, s, screen = '', r = 0, o = {}) {
  let g = `<rect x="-170" y="-340" width="340" height="680" rx="54" fill="#111219" filter="url(#sh)"/><rect x="-156" y="-326" width="312" height="652" rx="44" fill="${o.scr || '#fff'}"/>`;
  g += `<g clip-path="url(#phclip)">${screen}</g>`;
  g += `<rect x="-46" y="-316" width="92" height="22" rx="11" fill="#111219"/>`;
  return G(g, tf(x, y, s, r));
}
const PHCLIP = `<clipPath id="phclip"><rect x="-156" y="-326" width="312" height="652" rx="44"/></clipPath>`;
function hand(x, y, s, r = 0, sk = SK[1], sleeve = '#3B7BEA') {
  return G(`<rect x="-70" y="40" width="140" height="700" rx="60" fill="${sleeve}"/><rect x="-62" y="-60" width="124" height="160" rx="56" fill="${sk}"/><rect x="-92" y="-70" width="44" height="110" rx="22" fill="${sk}" transform="rotate(-25 -70 -20)"/>`, tf(x, y, s, r));
}

// ---------- WATCH (close-up) ----------
function watch(cx, cy, s, inner, o = {}) {
  const sk = o.skin || SK[1];
  let g = `<path d="M-900 520 Q-200 120 900 -320 L900 260 Q-200 640 -900 1140Z" fill="${sk}"/>`; // forearm diagonal
  g += `<path d="M-900 520 Q-200 120 900 -320" stroke="#000" stroke-opacity=".08" stroke-width="40" fill="none"/>`;
  g += `<path d="M900 140 L900 260 Q-200 640 -900 1140 L-900 1000Z" fill="#fff" opacity=".9"/>`; // white sleeve cuff
  g += `<g transform="rotate(-24)"><rect x="-120" y="-380" width="240" height="760" rx="40" fill="#1f2230"/>`;
  g += `<rect x="-230" y="-250" width="460" height="500" rx="110" fill="#2b2f40"/><rect x="-206" y="-226" width="412" height="452" rx="92" fill="#06070d"/>`;
  g += `<rect x="226" y="-60" width="26" height="90" rx="10" fill="#3a3f55"/>`;
  g += `<g>${inner}</g></g>`;
  return G(g, tf(cx, cy, s));
}

// ---------- CAPTIONS ----------
let TL = null;
const HLW = ['maratón', 'terraza', 'sábado', 'carta', 'wifi', 'instagram', 'ocho', 'diez', 'minutos', 'bar', 'nueve', 'pedir', 'siguiente', 'cree', 'ni', 'esto', 'móvil', 'fotos', 'pides', 'conectado', 'sigues', 'aviso', 'plato', 'paso', 'manolo', 'media', 'mano'];
function chunks(line) {
  const out = []; let cur = [];
  const raw = line.text.split(/\s+/);
  line.w.forEach((w, i) => {
    cur.push([w, i]);
    const rw = raw[i] || '';
    if (cur.length >= 3 || /[,.?!]$/.test(rw)) { out.push(cur); cur = []; }
  });
  if (cur.length) out.push(cur);
  return out;
}
function captions(t) {
  if (!TL) return '';
  for (const ln of TL.lines) {
    if (t < ln.s - .05 || t > ln.e + .25) continue;
    const ch = chunks(ln);
    let act = null;
    for (let i = 0; i < ch.length; i++) { const st = ch[i][0][0][1] - .05; const nx = i + 1 < ch.length ? ch[i + 1][0][0][1] - .05 : ln.e + .25; if (t >= st && t < nx) act = ch[i]; }
    if (!act) return '';
    const fs = 88;
    const k0 = pop(t, act[0][0][1] - .05, .2);
    const n = act.reduce((a, [w]) => a + w[0].length + 1, 0);
    const sc = Math.min(1, 15 / n);
    let sp = act.map(([w], i) => { const key = HLW.includes(w[0].toLowerCase()); const on = t >= w[1] - .05; return on ? `<tspan fill="${key ? C.yel : '#fff'}">${esc(w[0].toUpperCase())}</tspan>` : ''; }).filter(Boolean).join(' ');
    let g = `<text x="0" y="0" font-family="NunitoX" font-weight="900" font-size="${fs}" text-anchor="middle" stroke="#0b0a18" stroke-width="16" stroke-linejoin="round" paint-order="stroke">${sp}</text>`;
    g = G(g, `translate(540 400) scale(${R(sc * (.7 + .3 * k0), 3)})`);
    return g;
  }
  return '';
}
