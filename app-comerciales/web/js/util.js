// Constantes del negocio y utilidades de fechas, teléfonos y textos.

export const ESTADOS = {
  cita: { txt: 'Cita con dueño', color: 'var(--st-cita)' },
  rellamar: { txt: 'Volver a llamar', color: 'var(--st-rellamar)' },
  no_contesta: { txt: 'No lo cogen', color: 'var(--st-nocontesta)' },
  pendiente: { txt: 'Por llamar', color: 'var(--st-pendiente)' },
  cliente: { txt: 'Cliente', color: 'var(--st-cliente)' },
  no_interesa: { txt: 'No interesa', color: 'var(--st-nointeresa)' },
};
export const ORDEN_ESTADOS = Object.keys(ESTADOS);

export const CONTACTOS = {
  nadie: 'No lo cogen',
  empleado: 'Un empleado',
  dueno: 'El dueño',
};

export const RESULTADOS = {
  no_contesta: 'No lo cogieron',
  rellamar: 'Volver a llamar',
  cita: 'Cita con el dueño',
  no_interesa: 'No le interesa',
  vendido: 'Vendido',
};

// En una visita algunos resultados se leen distinto
const RESULTADOS_VISITA = { no_contesta: 'Estaba cerrado', rellamar: 'Se lo piensa', cita: 'Otra cita' };
export const textoResultado = (ll) => (ll.tipo === 'visita' && RESULTADOS_VISITA[ll.resultado]) || RESULTADOS[ll.resultado];

export const INTERES = { 1: 'Poco', 2: 'Algo', 3: 'Mucho' };

export const TIPOS_LOCAL = ['Bar', 'Restaurante', 'Cafetería', 'Hotel', 'Chiringuito', 'Pub / copas', 'Otro'];

export const COLORES = ['#7C5CFF', '#33C6F4', '#22C55E', '#F5A524', '#F25F5C', '#EC4899', '#3F7DFB', '#14B8A6'];

// ---------- Fechas (siempre en hora local del móvil) ----------
const dos = (n) => String(n).padStart(2, '0');

export function isoLocal(d) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}
export const hoyISO = () => isoLocal(new Date());

export function aFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function sumarDias(iso, n) {
  const d = aFecha(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}
export const diaDe = (ts) => isoLocal(new Date(ts));

export const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function fechaCorta(iso) {
  if (!iso) return '';
  return aFecha(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}
export function fechaLarga(iso) {
  if (!iso) return '';
  return aFecha(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function fechaRelativa(iso) {
  if (!iso) return '';
  const h = hoyISO();
  if (iso === h) return 'Hoy';
  if (iso === sumarDias(h, 1)) return 'Mañana';
  if (iso === sumarDias(h, -1)) return 'Ayer';
  return capital(fechaCorta(iso));
}
export const hora = (t) => (t ? t.slice(0, 5) : '');

const horaDe = (d) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
export function haceCuanto(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const seg = (Date.now() - d.getTime()) / 1000;
  if (seg < 60) return 'ahora mismo';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  const dia = isoLocal(d);
  if (dia === hoyISO()) return `hoy ${horaDe(d)}`;
  if (dia === sumarDias(hoyISO(), -1)) return `ayer ${horaDe(d)}`;
  return `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '')} ${horaDe(d)}`;
}

export function inicioPeriodo(p) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (p === 'mes') d.setDate(1);
  if (p === '90') d.setDate(d.getDate() - 90);
  return d;
}

// Ordena citas por día y hora (sin hora al final del día).
export const porCita = (a, b) =>
  (a.cita_fecha || '').localeCompare(b.cita_fecha || '') || (a.cita_hora || '99').localeCompare(b.cita_hora || '99');

// ---------- Teléfonos ----------
export function normTel(t) {
  let d = String(t || '').replace(/\D/g, '').replace(/^00/, '');
  if (d.length === 11 && d.startsWith('34')) d = d.slice(2);
  return d;
}
export function telHref(t) {
  const d = normTel(t);
  return d.length === 9 ? `tel:+34${d}` : `tel:${String(t || '').replace(/[^\d+]/g, '')}`;
}
export function whatsappHref(t, texto) {
  const d = normTel(t);
  if (d.length !== 9 || !/^[67]/.test(d)) return null;
  return `https://wa.me/34${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}
export function mapsHref(l) {
  const q = [l.nombre, l.direccion, l.zona].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function gcalHref(l, quien) {
  const f = l.cita_fecha.replaceAll('-', '');
  let dates;
  if (l.cita_hora) {
    const [h, m] = l.cita_hora.split(':').map(Number);
    const fin = new Date(2000, 0, 1, h, m + 45);
    dates = `${f}T${dos(h)}${dos(m)}00/${f}T${dos(fin.getHours())}${dos(fin.getMinutes())}00`;
  } else {
    dates = `${f}/${sumarDias(l.cita_fecha, 1).replaceAll('-', '')}`;
  }
  const detalles = [
    l.dueno_nombre && `Dueño: ${l.dueno_nombre}`,
    (l.dueno_telefono || l.telefono) && `Teléfono: ${l.dueno_telefono || l.telefono}`,
    quien && `Va: ${quien}`,
    l.notas && `Notas: ${l.notas}`,
  ].filter(Boolean).join('\n');
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Visita VISAX · ${l.nombre}`,
    dates,
    ctz: 'Europe/Madrid',
    details: detalles,
    location: [l.direccion, l.zona].filter(Boolean).join(', ') || l.nombre,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

// ---------- Textos ----------
export const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();

export function iniciales(nombre) {
  const p = String(nombre || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

const fmtEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const euros = (n) => (n == null || n === '' ? '' : fmtEuros.format(Number(n)));

export const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');

export function mensajeError(e) {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) return 'Usuario o contraseña incorrectos.';
  if (/banned/i.test(m)) return 'Tu cuenta está desactivada. Habla con Pablo o Pepe.';
  if (/failed to fetch|network|load failed/i.test(m)) return 'Sin conexión. Revisa internet y vuelve a intentarlo.';
  if (/jwt|session|token/i.test(m)) return 'Tu sesión ha caducado. Vuelve a entrar.';
  if (/password should be|at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  return m || 'Algo ha fallado. Inténtalo otra vez.';
}

export function contrasenaAleatoria() {
  const palabras = ['Mesa', 'Carta', 'Tapa', 'Barra', 'Plato', 'Vino', 'Cafe', 'Menu', 'Terraza', 'Cana', 'Salsa', 'Sol', 'Luna', 'Mar'];
  const r = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  return `${palabras[r(palabras.length)]}-${1000 + r(9000)}-${palabras[r(palabras.length)].toLowerCase()}`;
}

export function descargarCSV(nombreArchivo, filas) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const bom = String.fromCharCode(0xfeff); // para que Excel lea bien las tildes
  const blob = new Blob([bom + filas.map((f) => f.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
