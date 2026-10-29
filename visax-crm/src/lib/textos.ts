import type { Catalogos, NivelInteres } from '@/lib/tipos';

export const NIVELES: { v: NivelInteres; txt: string; corto: string; color: string }[] = [
  { v: 'alto', txt: 'Mucho interés', corto: 'Alto', color: '#22C55E' },
  { v: 'medio', txt: 'Interés', corto: 'Medio', color: '#7C5CFF' },
  { v: 'bajo', txt: 'Poco interés', corto: 'Bajo', color: '#F5A524' },
  { v: 'por_valorar', txt: 'Por valorar', corto: 'Por valorar', color: '#8A90A6' },
  { v: 'no', txt: 'Sin interés actual', corto: 'No', color: '#F25F5C' },
];
export const nivelDe = (v: string) => NIVELES.find((n) => n.v === v) ?? NIVELES[3];

export const POTENCIALES = [
  { v: 'alto', txt: 'Alto' },
  { v: 'medio', txt: 'Medio' },
  { v: 'bajo', txt: 'Bajo' },
] as const;

export const GRUPOS_RESULTADO: Record<string, string> = {
  localizar: 'No hemos podido hablar con el responsable',
  sin_interes: 'Sin interés',
  interes: 'Interés',
  decision: 'Propuesta y decisión',
  otro: 'Otro',
};

/** Nombre corto de un servicio para etiquetas */
export const SERVICIO_CORTO: Record<string, string> = {
  automatizaciones: 'Automatización IA',
  software: 'Software',
  web: 'Web',
  varios: 'Varios',
  por_identificar: 'Por identificar',
};

export function nombres(c: Catalogos) {
  const mapa = <T extends { codigo: string; nombre: string }>(l: T[]) => Object.fromEntries(l.map((x) => [x.codigo, x.nombre]));
  return {
    estado: mapa(c.estados),
    servicio: mapa(c.servicios),
    tipoInteraccion: mapa(c.tiposInteraccion),
    tipoTarea: mapa(c.tiposTarea),
    resultado: mapa(c.resultados),
    socio: Object.fromEntries(c.socios.map((s) => [s.id, s.nombre])) as Record<string, string>,
  };
}

/** Normaliza un texto de búsqueda igual que la base de datos (minúsculas, sin tildes) */
export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const telHref = (t: string) => {
  const d = t.replace(/[^\d+]/g, '');
  return `tel:${/^\d{9}$/.test(d) ? `+34${d}` : d}`;
};

export const mensajeErrorBD = (m: string | undefined) => {
  if (!m) return 'Algo ha fallado. Inténtalo otra vez.';
  if (/JWT|session|not authenticated/i.test(m)) return 'Tu sesión ha caducado. Vuelve a entrar.';
  if (/No autorizado|permission denied|row-level security/i.test(m)) return 'No tienes permiso para hacer esto.';
  if (/fecha del contacto no puede ser futura/i.test(m)) return 'La fecha del contacto no puede ser futura.';
  if (/violates foreign key/i.test(m)) return 'Algún dato elegido ya no existe. Recarga la página.';
  if (/violates check constraint/i.test(m)) return 'Algún dato no es válido.';
  if (/fetch failed|network/i.test(m)) return 'Sin conexión con la base de datos. Inténtalo de nuevo.';
  return m;
};
