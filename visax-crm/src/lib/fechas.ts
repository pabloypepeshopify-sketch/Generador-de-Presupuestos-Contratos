// Todas las fechas se muestran y se interpretan en hora de España peninsular.
// En la base de datos los instantes son timestamptz (UTC) y las fechas de tareas son date + time.

export const ZONA = 'Europe/Madrid';

const partesEn = (fecha: Date) => {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(fecha);
  const m = Object.fromEntries(partes.map((p) => [p.type, p.value]));
  return { y: +m.year, mo: +m.month, d: +m.day, h: +m.hour, mi: +m.minute, s: +m.second };
};

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha de hoy en España, 'YYYY-MM-DD' */
export function hoy(): string {
  const p = partesEn(new Date());
  return `${p.y}-${dos(p.mo)}-${dos(p.d)}`;
}

/** Ahora en España para un <input type="datetime-local">, 'YYYY-MM-DDTHH:MM' */
export function ahoraLocal(): string {
  const p = partesEn(new Date());
  return `${p.y}-${dos(p.mo)}-${dos(p.d)}T${dos(p.h)}:${dos(p.mi)}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}`;
}

/** Lunes y domingo de la semana actual (España) */
export function semanaActual(): { inicio: string; fin: string } {
  const h = hoy();
  const [y, m, d] = h.split('-').map(Number);
  const diaSemana = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  const inicio = sumarDias(h, -diaSemana);
  return { inicio, fin: sumarDias(inicio, 6) };
}

function desfaseMinutos(instante: Date): number {
  const p = partesEn(instante);
  return (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(instante.getTime() / 1000) * 1000) / 60000;
}

/** Convierte una fecha (y hora) de España al instante UTC correspondiente (tiene en cuenta el horario de verano) */
export function madridAUtc(fecha: string, hora = '00:00'): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  const supuesto = Date.UTC(y, m - 1, d, h, mi);
  const desfase1 = desfaseMinutos(new Date(supuesto));
  let t = supuesto - desfase1 * 60000;
  const desfase2 = desfaseMinutos(new Date(t));
  if (desfase2 !== desfase1) t = supuesto - desfase2 * 60000;
  return new Date(t);
}

/** Día (España) de un instante guardado en la base de datos */
export function diaDe(instante: string): string {
  const p = partesEn(new Date(instante));
  return `${p.y}-${dos(p.mo)}-${dos(p.d)}`;
}

const fmt = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, ...opciones });
const fmtFecha = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const fmtFechaCorta = fmt({ day: 'numeric', month: 'short' });
const fmtDiaSemana = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const fmtDiaLargo = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fmtHora = fmt({ hour: '2-digit', minute: '2-digit' });

const limpiar = (s: string) => s.replace(/\./g, '');

export const hora = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

/** «29 oct 2026 · 17:30» */
export function fechaHora(instante: string): string {
  const d = new Date(instante);
  return `${limpiar(fmtFecha.format(d))} · ${fmtHora.format(d)}`;
}

/** «hoy 17:30», «ayer 10:05», «lun 26 oct 09:00» */
export function fechaHoraRelativa(instante: string): string {
  const d = new Date(instante);
  const dia = diaDe(instante);
  const h = hoy();
  const hh = fmtHora.format(d);
  if (dia === h) return `hoy ${hh}`;
  if (dia === sumarDias(h, -1)) return `ayer ${hh}`;
  const anio = dia.slice(0, 4) === h.slice(0, 4);
  return `${limpiar((anio ? fmtDiaSemana : fmtFecha).format(d))} ${hh}`;
}

/** «hace 3 días», «hoy», «hace 2 meses» */
export function haceTiempo(instante: string | null): string {
  if (!instante) return 'Nunca';
  const dias = Math.round((madridAUtc(hoy()).getTime() - madridAUtc(diaDe(instante)).getTime()) / 864e5);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? 'Hace 1 mes' : `Hace ${meses} meses`;
}

const fechaDeDia = (dia: string) => madridAUtc(dia, '12:00');

/** Para fechas 'YYYY-MM-DD' de tareas: «Hoy», «Mañana», «Ayer», «jue 30 oct» */
export function diaRelativo(dia: string | null): string {
  if (!dia) return 'Sin fecha';
  const h = hoy();
  if (dia === h) return 'Hoy';
  if (dia === sumarDias(h, 1)) return 'Mañana';
  if (dia === sumarDias(h, -1)) return 'Ayer';
  const mismoAnio = dia.slice(0, 4) === h.slice(0, 4);
  const texto = limpiar((mismoAnio ? fmtDiaSemana : fmtFecha).format(fechaDeDia(dia)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function diaLargo(dia: string): string {
  const t = fmtDiaLargo.format(fechaDeDia(dia));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function fechaCorta(dia: string): string {
  return limpiar(fmtFechaCorta.format(fechaDeDia(dia)));
}

export type EstadoVencimiento = 'atrasada' | 'hoy' | 'proxima' | 'sin_fecha';
export function vencimiento(fecha: string | null): EstadoVencimiento {
  if (!fecha) return 'sin_fecha';
  const h = hoy();
  if (fecha < h) return 'atrasada';
  if (fecha === h) return 'hoy';
  return 'proxima';
}
