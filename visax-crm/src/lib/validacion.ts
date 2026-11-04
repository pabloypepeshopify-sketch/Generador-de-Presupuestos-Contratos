import { z } from 'zod';
import { leerImporte } from '@/lib/dinero';

// Validación en el servidor de todo lo que llega de los formularios.
// La base de datos vuelve a comprobar tipos, referencias y permisos (RLS).

const vacioANull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const texto = (max: number) =>
  z.preprocess(vacioANull, z.string().trim().max(max, `Máximo ${max} caracteres`).nullable().optional()).transform((v) => v ?? null);

const uuid = z.string().uuid('Identificador no válido');
const uuidOpcional = z.preprocess(vacioANull, uuid.nullable().optional()).transform((v) => v ?? null);
const codigo = z.string().regex(/^[a-z_]{2,40}$/, 'Valor no válido');
const codigoOpcional = z.preprocess(vacioANull, codigo.nullable().optional()).transform((v) => v ?? null);
const fecha = z.preprocess(vacioANull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida').nullable().optional()).transform((v) => v ?? null);
const horaCampo = z.preprocess(vacioANull, z.string().regex(/^\d{2}:\d{2}$/, 'Hora no válida').nullable().optional()).transform((v) => v ?? null);
const casilla = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());

const email = z.preprocess(vacioANull, z.string().trim().email('Correo no válido').max(160).nullable().optional()).transform((v) => v ?? null);
const telefono = z.preprocess(
  vacioANull,
  z.string().trim().max(40).regex(/^[0-9+()\s.-]{6,40}$/, 'Teléfono no válido').nullable().optional(),
).transform((v) => v ?? null);

export const esquemaAltaRapida = z.object({
  nombre: z.string().trim().min(1, 'Pon el nombre del negocio').max(160, 'Máximo 160 caracteres'),
  sector: texto(80),
  direccion: texto(200),
  localidad: texto(80),
  telefono,
  responsable_id: uuid,
  contacto_nombre: texto(120),
  contacto_cargo: texto(80),
  servicios: z.array(codigo).max(10),
  nota: texto(2000),
  tarea_tipo: codigoOpcional,
  tarea_descripcion: texto(300),
  tarea_fecha: fecha,
  tarea_hora: horaCampo,
});

export const esquemaNegocio = z.object({
  nombre: z.string().trim().min(1, 'Pon el nombre del negocio').max(160),
  razon_social: texto(160),
  sector: texto(80),
  direccion: texto(200),
  localidad: texto(80),
  telefono,
  email,
  web: texto(200),
  redes: texto(300),
  responsable_id: uuidOpcional,
  potencial: z.preprocess(vacioANull, z.enum(['bajo', 'medio', 'alto']).nullable().optional()).transform((v) => v ?? null),
  presupuesto_estimado: z
    .preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/\./g, '').replace(',', '.')) : null), z.number().min(0, 'Debe ser positivo').max(10_000_000).nullable())
    .refine((v) => v === null || Number.isFinite(v), 'Importe no válido'),
  necesidades: texto(3000),
  problemas: texto(3000),
  objeciones: texto(3000),
  horario_contacto: texto(200),
  notas: texto(5000),
});

export const esquemaInteraccion = z
  .object({
    negocio_id: uuid,
    tipo: codigo,
    resultado: z.string({ required_error: 'Elige qué ha pasado' }).regex(/^[a-z_]{2,40}$/, 'Elige qué ha pasado'),
    fecha_local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Fecha y hora no válidas'),
    socio_id: uuid,
    persona: texto(120),
    servicios: z
      .string()
      .default('{}')
      .transform((s, ctx) => {
        try {
          const obj = JSON.parse(s) as Record<string, string | null>;
          const niveles = ['alto', 'medio', 'bajo', 'por_valorar', 'no'];
          for (const [k, v] of Object.entries(obj)) {
            if (!/^[a-z_]{2,40}$/.test(k) || (v !== null && !niveles.includes(v))) throw new Error();
          }
          return obj;
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Servicios no válidos' });
          return z.NEVER;
        }
      }),
    notas: texto(5000),
    crear_tarea: casilla,
    tarea_tipo: codigoOpcional,
    tarea_descripcion: texto(300),
    tarea_fecha: fecha,
    tarea_hora: horaCampo,
    tarea_responsable: uuidOpcional,
    nuevo_estado: codigoOpcional,
    horario_contacto: texto(200),
    completar_tarea: uuidOpcional,
  })
  .refine((d) => !d.crear_tarea || d.tarea_tipo, { message: 'Elige el tipo de la próxima acción', path: ['tarea_tipo'] });

export const esquemaTarea = z.object({
  negocio_id: uuid,
  tipo: codigo,
  descripcion: z.string().trim().min(1, 'Describe la acción').max(300),
  responsable_id: uuidOpcional,
  vence_fecha: fecha,
  vence_hora: horaCampo,
  notas: texto(2000),
});

export const esquemaReprogramar = z.object({
  id: uuid,
  vence_fecha: fecha,
  vence_hora: horaCampo,
});

export const esquemaContacto = z.object({
  negocio_id: uuid,
  nombre: z.string().trim().min(1, 'Pon el nombre').max(120),
  cargo: texto(80),
  telefono,
  email,
  es_principal: casilla,
});

export const esquemaServicio = z.object({
  negocio_id: uuid,
  servicio: codigo,
  nivel: z.enum(['alto', 'medio', 'bajo', 'por_valorar', 'no', 'quitar']),
  notas: texto(1000),
});

// ---------- Dinero ----------
const fechaObligatoria = (mensaje: string) => z.string({ required_error: mensaje }).regex(/^\d{4}-\d{2}-\d{2}$/, mensaje);
const importe = z.preprocess(
  (v) => (typeof v === 'string' ? leerImporte(v) : v),
  z.number({ invalid_type_error: 'Pon el importe', required_error: 'Pon el importe' }).positive('El importe debe ser mayor que 0').max(10_000_000, 'Importe demasiado alto'),
);
const importeOpcional = z.preprocess(
  (v) => (typeof v === 'string' ? leerImporte(v) : v ?? null),
  z.number().min(0, 'Debe ser positivo').max(10_000_000).nullable(),
);
const porcentaje = z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : v), z.number({ invalid_type_error: 'Porcentaje no válido' }).min(0).max(30));
const metodo = z.preprocess(vacioANull, z.enum(['transferencia', 'bizum', 'tarjeta', 'efectivo', 'domiciliacion', 'otro']).nullable().optional()).transform((v) => v ?? null);
export const RUTA_FACTURA = /^facturas\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/;
export const RUTA_JUSTIFICANTE = /^gastos\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;

export const esquemaContrato = z
  .object({
    id: uuidOpcional,
    negocio_id: uuid,
    concepto: z.string().trim().min(1, 'Pon qué servicio es').max(160),
    servicio: codigoOpcional,
    periodicidad: z.enum(['unico', 'mensual', 'trimestral', 'anual'], { errorMap: () => ({ message: 'Elige cómo se paga' }) }),
    importe_base: importe,
    iva_pct: porcentaje,
    irpf_pct: porcentaje,
    fecha_inicio: fechaObligatoria('Pon la fecha del primer cobro'),
    fecha_fin: fecha,
    notas: texto(1000),
  })
  .refine((d) => d.periodicidad === 'unico' || !d.fecha_fin || d.fecha_fin >= d.fecha_inicio, { message: 'La fecha de fin no puede ser anterior al inicio', path: ['fecha_fin'] });

export const esquemaCobro = z
  .object({
    id: uuidOpcional,
    negocio_id: uuid,
    concepto: z.string().trim().min(1, 'Pon el concepto').max(200),
    fecha_prevista: fechaObligatoria('Pon la fecha del cobro'),
    importe_base: importe,
    iva_pct: porcentaje,
    irpf_pct: porcentaje,
    ya_cobrado: casilla,
    fecha_cobro: fecha,
    metodo,
    notas: texto(1000),
  })
  .refine((d) => !d.ya_cobrado || d.fecha_cobro, { message: 'Pon el día en que se cobró', path: ['fecha_cobro'] });

export const esquemaMarcarCobrado = z.object({
  id: uuid,
  fecha_cobro: fechaObligatoria('Pon el día en que se cobró'),
  metodo,
});

export const esquemaFactura = z.object({
  negocio_id: uuid,
  cobro_id: uuidOpcional,
  numero: texto(40),
  fecha: fechaObligatoria('Pon la fecha de la factura'),
  importe_total: importeOpcional,
  notas: texto(1000),
  archivo_path: z.string().regex(RUTA_FACTURA, 'Archivo no válido'),
  archivo_nombre: z.string().trim().min(1).max(200),
  archivo_bytes: z.coerce.number().int().min(1).max(10 * 1024 * 1024),
  marcar_cobrado: casilla,
});

export const esquemaGasto = z.object({
  id: uuidOpcional,
  negocio_id: uuidOpcional,
  concepto: z.string().trim().min(1, 'Pon en qué se ha gastado').max(160),
  categoria: z.enum(['hosting', 'herramientas', 'ia_apis', 'publicidad', 'material', 'gestoria', 'desplazamientos', 'formacion', 'otros'], { errorMap: () => ({ message: 'Elige una categoría' }) }),
  fecha: fechaObligatoria('Pon la fecha del gasto'),
  importe_base: importe,
  iva_pct: porcentaje,
  notas: texto(1000),
  justificante_path: z.preprocess(vacioANull, z.string().regex(RUTA_JUSTIFICANTE, 'Archivo no válido').nullable().optional()).transform((v) => v ?? null),
  justificante_nombre: texto(200),
  quitar_justificante: casilla,
});

/** FormData → objeto plano. Los campos repetidos (checkbox múltiples) se devuelven como lista. */
export function datosFormulario(fd: FormData, listas: string[] = []) {
  const obj: Record<string, unknown> = {};
  for (const clave of new Set(fd.keys())) {
    obj[clave] = listas.includes(clave) ? fd.getAll(clave).map(String) : fd.get(clave);
  }
  for (const l of listas) if (!(l in obj)) obj[l] = [];
  return obj;
}

/** Errores de zod → { campo: mensaje } y un mensaje general */
export function erroresDe(error: z.ZodError) {
  const campos: Record<string, string> = {};
  for (const issue of error.issues) {
    const clave = String(issue.path[0] ?? 'general');
    if (!campos[clave]) campos[clave] = issue.message;
  }
  return { error: Object.values(campos)[0] ?? 'Revisa los datos', campos };
}
