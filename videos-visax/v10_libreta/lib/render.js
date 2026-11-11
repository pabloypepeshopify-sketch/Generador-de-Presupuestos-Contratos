// node lib/render.js DIR shots t1,t2 | dump | render N
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { spawn } = require('child_process');
const [D, mode, arg] = process.argv.slice(2); const FPS = 30;
const TL = JSON.parse(fs.readFileSync(path.join(D, 'tl.json')));
async function page(b) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(D, 'scene.html'));
  await p.evaluate(tl => window.setTL(tl), TL);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { render(0.5); }); await p.waitForTimeout(300);
  return p;
}
(async () => {
  const b = await chromium.launch();
  if (mode === 'shots') {
    const p = await page(b); const dir = path.join(D, process.env.SH || 'shots'); fs.mkdirSync(dir, { recursive: true });
    for (const t of arg.split(',').map(Number)) { await p.evaluate(t => render(t), t); await p.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 80 }); }
  } else if (mode === 'dump') {
    const p = await page(b); fs.writeFileSync(path.join(D, 'sfx.json'), JSON.stringify(await p.evaluate(() => sfxList())));
  } else {
    const N = +arg || 4, total = Math.ceil(TL.dur * FPS), per = Math.ceil(total / N); fs.mkdirSync(path.join(D, 'out'), { recursive: true });
    const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
    await Promise.all([...Array(N).keys()].filter(i => !only || only.includes(i)).map(async i => {
      const out = path.join(D, 'out', `c${i}.mp4`); if (fs.existsSync(out)) return;
      const p = await page(b);
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out]);
      for (let f = i * per; f < Math.min(total, (i + 1) * per); f++) {
        await p.evaluate(t => render(t), f / FPS);
        const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % 60 === 0) console.log('chunk', i, 'frame', f);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
    }));
  }
  await b.close();
})();
