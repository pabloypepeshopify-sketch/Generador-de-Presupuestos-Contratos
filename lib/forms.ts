/**
 * Validación compartida (navegador y servidor) de los formularios de la web:
 * solicitud de diagnóstico y reserva de visita.
 */
import { sectores } from '@/content/sectores';

export const SECTOR_OPTIONS = [...sectores.map((s) => s.name), 'Otro'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

export type Errors<T> = Partial<Record<keyof T, string>>;

const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/* ── Diagnóstico ── */
export type Diagnostico = {
  nombre: string;
  empresa: string;
  sector: string;
  email: string;
  telefono: string;
  mejorar: string;
  adicional: string;
  privacidad: boolean;
};

export function limpiarDiagnostico(raw: Record<string, unknown>): Diagnostico {
  return {
    nombre: txt(raw.nombre, 120),
    empresa: txt(raw.empresa, 160),
    sector: txt(raw.sector, 80),
    email: txt(raw.email, 160).toLowerCase(),
    telefono: txt(raw.telefono, 30),
    mejorar: txt(raw.mejorar, 3000),
    adicional: txt(raw.adicional, 3000),
    privacidad: raw.privacidad === true || raw.privacidad === 'true' || raw.privacidad === 'on',
  };
}

export function validarDiagnostico(d: Diagnostico): Errors<Diagnostico> {
  const e: Errors<Diagnostico> = {};
  if (!d.nombre) e.nombre = 'Dinos tu nombre';
  if (!d.empresa) e.empresa = 'Dinos el nombre de tu empresa';
  if (!EMAIL.test(d.email)) e.email = 'Revisa el email';
  if (d.telefono && d.telefono.replace(/\D/g, '').length < 9) e.telefono = 'Revisa el teléfono';
  if (!d.mejorar) e.mejorar = 'Cuéntanos qué te gustaría mejorar';
  if (!d.privacidad) e.privacidad = 'Necesitamos que aceptes la política de privacidad';
  return e;
}

/* ── Visita ── */
export type Visita = {
  nombre: string;
  empresa: string;
  sector: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  mensaje: string;
  fecha: string;
  hora: string;
  privacidad: boolean;
};

export function limpiarVisita(raw: Record<string, unknown>): Visita {
  return {
    nombre: txt(raw.nombre, 120),
    empresa: txt(raw.empresa, 160),
    sector: txt(raw.sector, 80),
    email: txt(raw.email, 160).toLowerCase(),
    telefono: txt(raw.telefono, 30),
    direccion: txt(raw.direccion, 200),
    localidad: txt(raw.localidad, 120),
    mensaje: txt(raw.mensaje, 2000),
    fecha: txt(raw.fecha, 10),
    hora: txt(raw.hora, 5),
    privacidad: raw.privacidad === true || raw.privacidad === 'true' || raw.privacidad === 'on',
  };
}

export function validarVisita(d: Visita): Errors<Visita> {
  const e: Errors<Visita> = {};
  if (!d.nombre) e.nombre = 'Dinos tu nombre';
  if (!d.empresa) e.empresa = 'Dinos el nombre de tu empresa';
  if (!EMAIL.test(d.email)) e.email = 'Revisa el email';
  if (d.telefono.replace(/\D/g, '').length < 9) e.telefono = 'Necesitamos un teléfono para confirmar la visita';
  if (!d.direccion) e.direccion = '¿Dónde está tu negocio?';
  if (!d.localidad) e.localidad = '¿En qué localidad?';
  if (!FECHA.test(d.fecha) || !HORA.test(d.hora)) e.hora = 'Elige día y hora';
  if (!d.privacidad) e.privacidad = 'Necesitamos que aceptes la política de privacidad';
  return e;
}

export const esFecha = (v: unknown) => typeof v === 'string' && FECHA.test(v);

/**
 * Antispam sin captcha: un campo trampa que una persona no ve («web») y un
 * tiempo mínimo de relleno (ms desde que se pintó el formulario).
 */
export const ANTISPAM_MIN_MS = 2500;
export function pareceSpam(raw: Record<string, unknown>) {
  const trampa = String(raw.web ?? '').trim() !== '';
  const ms = Number(raw.t);
  return trampa || !Number.isFinite(ms) || ms < ANTISPAM_MIN_MS;
}
