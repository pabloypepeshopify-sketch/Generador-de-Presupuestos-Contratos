// Servidor local de desarrollo/pruebas:
//  - sirve web/ con las mismas reescrituras que Netlify (/m/* y /r/* -> index.html)
//  - imita POST /rest/v1/rpc/<fn> de Supabase (PostgREST) ejecutando como rol anon
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(DIR, '../web');
const PORT = Number(process.env.PORT || 8787);
const pool = new pg.Pool({
  host: process.env.PGHOST || '/tmp', port: Number(process.env.PGPORT || 54329),
  user: 'postgres', database: process.env.PGDATABASE || 'carta_test',
});
pool.on('error', () => {}); // la BD se recrea entre pruebas: el pool reconecta solo
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const firmas = new Map();

async function firma(fn) {
  if (!firmas.has(fn)) {
    const { rows } = await pool.query(
      `select p.proargnames as nombres, array(select format_type(t, null) from unnest(p.proargtypes) t) as tipos
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1`, [fn]);
    if (!rows.length) return null;
    firmas.set(fn, rows[0]);
  }
  return firmas.get(fn);
}

async function rpc(fn, body) {
  const f = await firma(fn);
  if (!f) return [404, { code: 'PGRST202', message: 'function not found' }];
  const valores = [], partes = [];
  f.nombres.forEach((n, i) => {
    if (!(n in body)) return;
    const v = body[n];
    valores.push(v === null ? null : f.tipos[i] === 'jsonb' ? JSON.stringify(v) : v);
    partes.push(`${n} := $${valores.length}::${f.tipos[i]}`);
  });
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query('set local role anon');
    const { rows } = await c.query(`select public.${fn}(${partes.join(', ')}) as r`, valores);
    await c.query('commit');
    return [200, rows[0].r];
  } catch (e) {
    await c.query('rollback').catch(() => {});
    return [400, { code: e.code, message: e.message, details: null, hint: null }];
  } finally {
    c.release();
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/rest\/v1\/rpc\/(carta_[a-z_]+)$/);
  if (m && req.method === 'POST') {
    let raw = '';
    for await (const ch of req) raw += ch;
    const [status, data] = await rpc(m[1], raw ? JSON.parse(raw) : {});
    res.writeHead(status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }
  if (url.pathname === '/assets/config.js') {
    res.writeHead(200, { 'Content-Type': TIPOS['.js'] });
    return res.end(`window.CARTA_CONFIG = { supabaseUrl: location.origin, supabaseKey: 'sb_publishable_local' };`);
  }
  let rel = /^\/(m|r)\/[^/]+\/?$/.test(url.pathname) || url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.join(WEB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('404');
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Carta NFC local: http://localhost:${PORT}`));
