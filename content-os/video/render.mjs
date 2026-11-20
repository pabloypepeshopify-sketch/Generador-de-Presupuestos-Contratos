// Renderiza un vídeo 3D de VISAX: node video/render.mjs <id> [--fps 30] [--muestras 0.5,3,8]
// Necesita: voces/<id>.mp3 + voces/<id>.json (python video/alinear.py), salvo vídeos sin voz (redes).
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, access, rename } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const DIR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = args[0];
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FPS = Number(opt('--fps', 30));
const muestras = opt('--muestras', null);
const SALIDA = path.join(DIR, '..', 'salida', 'videos');
const existe = async p => access(p).then(() => true, () => false);

// three.js local (se descarga una vez)
const three = path.join(DIR, 'vendor', 'three.module.js');
if (!(await existe(three))) {
  await mkdir(path.dirname(three), { recursive: true });
  execFileSync('curl', ['-sSfL', '-o', three, 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js']);
}
for (const f of ['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js', 'geometries/RoundedBoxGeometry.js']) {
  const d = path.join(DIR, 'vendor', 'addons', f);
  if (!(await existe(d))) { await mkdir(path.dirname(d), { recursive: true }); execFileSync('curl', ['-sSfL', '-o', d, `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/${f}`]); }
}

// efectos de sonido generados con ffmpeg (sin licencias)
const SFX = {
  tap: ['aevalsrc=0.7*sin(2*PI*1500*t)*exp(-70*t):d=0.12'],
  pop: ['aevalsrc=0.55*sin(2*PI*(500+1400*t)*t)*exp(-22*t):d=0.25'],
  ding: ['aevalsrc=0.32*(sin(2*PI*1320*t)+0.5*sin(2*PI*1980*t)+0.25*sin(2*PI*2640*t))*exp(-5*t):d=0.9'],
  whoosh: ['anoisesrc=c=pink:d=0.55:a=0.5', 'bandpass=f=1800:w=1600,afade=t=in:d=0.28,afade=t=out:st=0.28:d=0.27,volume=0.45'],
  tick: ['aevalsrc=0.5*sin(2*PI*2600*t)*exp(-120*t):d=0.06'],
  buzz: ['aevalsrc=0.45*sin(2*PI*160*t)*(0.5+0.5*sgn(sin(2*PI*9*t))):d=0.9', 'afade=t=out:st=0.7:d=0.2'],
  hit: ['aevalsrc=0.9*sin(2*PI*(42+90*exp(-14*t))*t)*exp(-4.5*t):d=0.9'],
  riser: ['anoisesrc=c=white:d=1.0:a=0.35', 'highpass=f=600,afade=t=in:d=0.95:curve=exp,afade=t=out:st=0.95:d=0.05,volume=0.6'],
};
const dirSfx = path.join(DIR, '.sfx'); await mkdir(dirSfx, { recursive: true });
for (const [n, [src, filtro]] of Object.entries(SFX)) {
  const f = path.join(dirSfx, `${n}.wav`);
  if (!(await existe(f))) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', src, ...(filtro ? ['-af', filtro] : []), '-ar', '44100', '-ac', '2', f]);
}

// servidor estático para el motor
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = createServer(async (req, res) => {
  try { const p = path.join(DIR, decodeURIComponent(req.url.split('?')[0])); res.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const puerto = srv.address().port;

const voz = path.join(DIR, 'voces', `${id}.mp3`);
const conVoz = await existe(voz);
const palabras = conVoz ? JSON.parse(await readFile(path.join(DIR, 'voces', `${id}.json`), 'utf8')) : [];
const durVoz = conVoz ? Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voz]).toString()) : 0;

const navegador = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pag = await navegador.newPage();
pag.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[motor]', m.text()); });
pag.on('pageerror', e => console.error('[motor]', e.message));
await pag.goto(`http://127.0.0.1:${puerto}/motor.html?escala=${opt('--escala', '0.667')}&estilo=${opt('--estilo', '')}`);
await pag.waitForFunction(() => window.listo === true, null, { timeout: 120000 });
const info = await pag.evaluate(([i, p, d]) => window.init(i, p, d), [id, palabras, durVoz ? durVoz + 0.8 : 0]);
const dur = info.duracion;
await mkdir(SALIDA, { recursive: true });

if (muestras) {
  for (const t of muestras.split(',').map(Number)) {
    const url = await pag.evaluate(tt => window.frame(tt), t);
    const f = path.join(SALIDA, `${id}_t${t}.jpg`); await writeFile(f, Buffer.from(url.split(',')[1], 'base64')); console.log(f);
  }
  await navegador.close(); srv.close(); process.exit(0);
}

// audio: voz + música (baja cuando habla la voz) + efectos colocados en su segundo, todo normalizado a -14 LUFS
// entrada 0 = fotogramas; 1 = voz (o silencio); 2 = música (si hay); luego efectos
const entradas = conVoz ? ['-i', voz] : ['-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=44100:cl=stereo'];
const filtros = ['[1:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[voz][vozsc]'];
const etiquetas = ['[voz]']; let idx = 2;
const musica = info.musica ? path.join(DIR, 'musica', `${info.musica}.mp3`) : null;
if (musica && await existe(musica)) {
  entradas.push('-stream_loop', '-1', '-t', String(dur), '-i', musica);
  filtros.push(`[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${info.volMusica ?? 0.5},afade=t=in:d=0.2,afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2[mus0]`,
    '[mus0][vozsc]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350[mus]');
  etiquetas.push('[mus]'); idx = 3;
} else filtros[0] = '[1:a]aformat=sample_rates=44100:channel_layouts=stereo[voz]';
// ambiente de fondo (sala, gente) en bucle, constante y bajo
const ambiente = info.ambiente ? path.join(DIR, 'musica', `${info.ambiente}.mp3`) : null;
if (ambiente && await existe(ambiente)) {
  entradas.push('-stream_loop', '-1', '-t', String(dur), '-i', ambiente);
  filtros.push(`[${idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${info.volAmbiente ?? 0.3},afade=t=in:d=0.3,afade=t=out:st=${(dur - 1.0).toFixed(2)}:d=1.0[amb]`); etiquetas.push('[amb]'); idx++;
}
info.efectos.forEach(([n, t], i) => {
  if (!(t >= 0 && t < dur)) return;
  entradas.push('-i', path.join(dirSfx, `${n}.wav`)); const ms = Math.round(t * 1000);
  filtros.push(`[${idx}:a]adelay=${ms}|${ms}[s${i}]`); etiquetas.push(`[s${i}]`); idx++;
});
filtros.push(`${etiquetas.join('')}amix=inputs=${etiquetas.length}:normalize=0:duration=first,apad,atrim=0:${dur},loudnorm=I=-14:TP=-1.5:LRA=11[a]`);

const mp4 = path.join(SALIDA, `${id}.parcial.mp4`); // se renombra al terminar
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...entradas, '-filter_complex', filtros.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(dur), mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
ff.stdin.on('error', () => {});

const total = Math.ceil(dur * FPS); const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const url = await pag.evaluate(tt => window.frame(tt), f / FPS);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) process.stderr.write(`\r${id}: ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await navegador.close(); srv.close();
const final = path.join(SALIDA, `${id}.mp4`); await rename(mp4, final);
console.error(`\n→ ${final}`);
