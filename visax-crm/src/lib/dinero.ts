// Utilidades de dinero compartidas por servidor y navegador.
// Importes en euros; las ganancias se calculan sin IVA y el IRPF retenido no cuenta como gasto.
import { hoy, sumarDias } from '@/lib/fechas';
import type { Cobro, EstadoCobro, Periodicidad } from '@/lib/tipos';

export const IVA_DEFECTO = 21;
export const IRPF_DEFECTO = 7;
export const IVA_OPCIONES = [21, 10, 4, 0];
export const IRPF_OPCIONES = [7, 15, 0];

export const PERIODICIDADES: { v: Periodicidad; txt: string; sufijo: string }[] = [
  { v: 'unico', txt: 'Pago único', sufijo: '' },
  { v: 'mensual', txt: 'Mensual', sufijo: '/mes' },
  { v: 'trimestral', txt: 'Trimestral', sufijo: '/trimestre' },
  { v: 'anual', txt: 'Anual', sufijo: '/año' },
];
export const periodicidadDe = (v: string) => PERIODICIDADES.find((p) => p.v === v) ?? PERIODICIDADES[0];

export const CATEGORIAS_GASTO: { v: string; txt: string }[] = [
  { v: 'hosting', txt: 'Hosting y dominios' },
  { v: 'herramientas', txt: 'Software y herramientas' },
  { v: 'ia_apis', txt: 'IA y APIs' },
  { v: 'publicidad', txt: 'Publicidad' },
  { v: 'material', txt: 'Material y equipos' },
  { v: 'gestoria', txt: 'Gestoría y cuotas' },
  { v: 'desplazamientos', txt: 'Desplazamientos' },
  { v: 'formacion', txt: 'Formación' },
  { v: 'otros', txt: 'Otros' },
];
export const categoriaDe = (v: string) => CATEGORIAS_GASTO.find((c) => c.v === v)?.txt ?? v;

export const METODOS_COBRO: { v: string; txt: string }[] = [
  { v: 'transferencia', txt: 'Transferencia' },
  { v: 'bizum', txt: 'Bizum' },
  { v: 'tarjeta', txt: 'Tarjeta' },
  { v: 'domiciliacion', txt: 'Domiciliación' },
  { v: 'efectivo', txt: 'Efectivo' },
  { v: 'otro', txt: 'Otro' },
];
export const metodoDe = (v: string | null) => METODOS_COBRO.find((m) => m.v === v)?.txt ?? '';

const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoEurosRedondo = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** «1.234,56 €» */
export const euros = (n: number | string | null | undefined) => formatoEuros.format(Number(n ?? 0));
/** «1.235 €» para cifras grandes de los indicadores */
export const eurosRedondo = (n: number | string | null | undefined) => formatoEurosRedondo.format(Number(n ?? 0));

const centimos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Igual que en la base de datos: IVA e IRPF se redondean a céntimos por separado */
export function calcularImporte(base: number, ivaPct: number, irpfPct: number) {
  const iva = centimos((base * ivaPct) / 100);
  const irpf = centimos((base * irpfPct) / 100);
  return { base: centimos(base), iva, irpf, total: centimos(base + iva - irpf) };
}

/** «1.234,56», «1234.56», «50» → número (o null si no es un importe) */
export function leerImporte(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = String(texto).trim().replace(/\s|€/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type EstadoVisibleCobro = 'atrasado' | 'pendiente' | 'proximo' | 'cobrado' | 'anulado';

/** Atrasado: fecha prevista pasada; pendiente: vence hoy; próximo: aún no ha llegado */
export function estadoVisible(c: Pick<Cobro, 'estado' | 'fecha_prevista'>, h = hoy()): EstadoVisibleCobro {
  if (c.estado === 'cobrado' || c.estado === 'anulado') return c.estado;
  if (c.fecha_prevista < h) return 'atrasado';
  if (c.fecha_prevista === h) return 'pendiente';
  return 'proximo';
}

export const ESTADO_COBRO: Record<EstadoVisibleCobro, { txt: string; color: string }> = {
  atrasado: { txt: 'Atrasado', color: '#F25F5C' },
  pendiente: { txt: 'Vence hoy', color: '#F5A524' },
  proximo: { txt: 'Próximo', color: '#3F7DFB' },
  cobrado: { txt: 'Cobrado', color: '#22C55E' },
  anulado: { txt: 'Anulado', color: '#6B7280' },
};

export const ESTADOS_COBRO: EstadoCobro[] = ['pendiente', 'cobrado', 'anulado'];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Mes actual en España, 'YYYY-MM' */
export const mesActual = () => hoy().slice(0, 7);

/** Primer y último día de un mes 'YYYY-MM' */
export function rangoMes(mes: string) {
  const [y, m] = mes.split('-').map(Number);
  const desde = `${y}-${String(m).padStart(2, '0')}-01`;
  const siguiente = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { desde, hasta: sumarDias(siguiente, -1) };
}

export const rangoAnio = (anio: number) => ({ desde: `${anio}-01-01`, hasta: `${anio}-12-31` });

export function moverMes(mes: string, n: number) {
  const [y, m] = mes.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

/** «noviembre 2026» */
export function nombreMes(mes: string) {
  const [y, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${y}`;
}

export const mesValido = (v: unknown) => (typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null);

export function tamanoArchivo(bytes: number | null | undefined) {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export const MAX_ARCHIVO = 10 * 1024 * 1024;
