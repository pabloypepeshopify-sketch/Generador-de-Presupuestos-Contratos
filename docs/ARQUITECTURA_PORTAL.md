# Arquitectura del portal de clientes y del panel interno

> Documento de propuesta. Hoy no hay nada de esto instalado: la web pública solo deja preparadas la estructura de rutas y el sistema visual.

## 1. Objetivo

VISAX AI trabaja como **socio tecnológico por suscripción**. La plataforma privada sirve para que:

- **cada cliente** vea en su espacio lo que tiene en marcha, abra incidencias, pida mejoras o visitas, y consulte informes, historial y facturas;
- **el equipo de VISAX** gestione empresas, servicios, incidencias, trabajo hecho e informes desde un panel interno.

Principios: cada cliente solo ve sus datos (lo garantiza la base de datos, no solo la interfaz), poco software propio que mantener y el mismo sistema visual que la web.

## 2. Stack propuesto

| Pieza | Elección | Para qué |
|---|---|---|
| Aplicación | Next.js (App Router) en Vercel, el mismo repo que la web | Web pública, portal y panel con layouts separados |
| Autenticación | Supabase Auth (email con enlace mágico o contraseña; MFA para admins) | Sesiones, recuperación de contraseña |
| Base de datos | Supabase Postgres con **Row Level Security (RLS)** | Datos de empresas, servicios, incidencias… |
| Archivos | Supabase Storage (bucket privado) | Informes en PDF y adjuntos |
| Tiempo real | Supabase Realtime (opcional) | Notificaciones y mensajes sin recargar |
| Automatizaciones | n8n (ya en uso) | Correos, avisos al equipo, Google Calendar |
| Facturación | Stripe Billing (tarjeta y adeudo SEPA) | Cobro de las cuotas mensuales |
| Conexión Next ↔ Supabase | `@supabase/ssr` | Sesión en cookies, componentes de servidor y middleware |

**Proyecto de Supabase:** se recomienda uno **nuevo y en región UE** (por ejemplo `visax-portal`), separado de `visax-comerciales` (VISAX Equipo). Así los datos de clientes no se mezclan con los del equipo comercial y los permisos son más sencillos.

## 3. Rutas

```
app/
  (marketing)/          web pública (hecho)
  (portal)/
    acceso/             hoy: página «Próximamente». Mañana: inicio de sesión real
    portal/             espacio del cliente (rol client)
      page.tsx          resumen
      servicios/  incidencias/  mejoras/  visitas/  informes/  mensajes/  facturas/
  (admin)/
    admin/              panel interno (rol admin)
      empresas/  suscripciones/  servicios/  incidencias/  solicitudes/  informes/  ajustes/
  api/
    stripe/webhook/     eventos de Stripe
```

Un `middleware.ts` comprueba la sesión: sin sesión, `/portal/*` y `/admin/*` redirigen a `/acceso`; un `client` que entra en `/admin` recibe 404. **La protección de verdad está en RLS**: aunque alguien se salte la interfaz, la base de datos no le devuelve datos ajenos.

## 4. Roles

| Rol | Quién | Puede |
|---|---|---|
| `client` | Usuarios de una empresa cliente | Ver los datos de **su** empresa; crear incidencias, solicitudes de mejora y de visita, y mensajes |
| `admin` | Equipo de VISAX | Todo: crear empresas y usuarios, gestionar servicios, incidencias, informes, planes y suscripciones |

El rol vive en `perfiles.rol`. Más adelante se puede añadir un rol de solo lectura para el equipo (`staff`) sin cambiar el modelo.

## 5. Modelo de datos

Todas las tablas llevan `id uuid`, `creado_en` y `actualizado_en`. Las que pertenecen a un cliente llevan `empresa_id` (es la columna que usan las políticas RLS).

### Núcleo

- **empresas**: `nombre`, `cif`, `sector`, `direccion`, `localidad`, `telefono`, `email`, `notas_internas`, `stripe_customer_id`.
- **perfiles** (uno por usuario de `auth.users`): `id` (= `auth.users.id`), `empresa_id` (null para admins), `nombre`, `email`, `telefono`, `rol` (`client` | `admin`), `activo`.
- **planes**: `codigo` (`esencial` | `profesional` | `premium`), `nombre`, `precio_mensual` (null = a medida), `cuota_alta` (null = consultar), `activo`, `stripe_price_id`. Es el equivalente en base de datos de `config/plans.ts`; cuando exista, la web puede leer de aquí.
- **suscripciones**: `empresa_id`, `plan_id`, `estado` (`prueba` | `activa` | `pausada` | `impagada` | `cancelada`), `inicio`, `fin`, `proxima_renovacion`, `stripe_subscription_id`, `precio_pactado` (si se negocia).

### Trabajo y seguimiento

- **servicios** (servicios activos): `empresa_id`, `nombre`, `descripcion`, `area` (`procesos` | `ia` | `digital` | `mejora_continua`), `estado` (`propuesto` | `en_desarrollo` | `activo` | `pausado` | `retirado`), `fecha_inicio`, `ultima_revision`.
- **incidencias**: `empresa_id`, `servicio_id` (opcional), `titulo`, `descripcion`, `prioridad` (`baja` | `media` | `alta` | `urgente`), `estado` (`abierta` | `en_curso` | `esperando_cliente` | `resuelta` | `cerrada`), `creada_por`, `asignada_a`, `resuelta_en`.
- **incidencia_eventos** (historial): `incidencia_id`, `autor_id`, `tipo` (`comentario` | `cambio_estado` | `asignacion`), `estado_anterior`, `estado_nuevo`, `mensaje`, `visible_cliente`. Un trigger añade un evento cada vez que cambia el estado.
- **solicitudes_visita**: `empresa_id` (null si viene de la web y aún no es cliente), datos de contacto, `direccion`, `localidad`, `fecha_hora`, `estado` (`pendiente` | `confirmada` | `realizada` | `cancelada`), `origen` (`web` | `portal`), `google_event_id`.
- **solicitudes_mejora**: `empresa_id`, `titulo`, `descripcion`, `estado` (`recibida` | `en_estudio` | `aprobada` | `planificada` | `hecha` | `descartada`), `prioridad`.
- **historial_trabajo**: `empresa_id`, `servicio_id` (opcional), `fecha`, `tipo` (`implementacion` | `mantenimiento` | `revision` | `reunion` | `visita`), `titulo`, `descripcion`, `visible_cliente`.
- **informes**: `empresa_id`, `periodo` (p. ej. `2027-01`), `titulo`, `resumen`, `archivo_path` (Storage), `publicado_en` (null = borrador, el cliente no lo ve).
- **recomendaciones**: `empresa_id`, `titulo`, `descripcion`, `impacto_esperado` (texto), `estado` (`propuesta` | `aceptada` | `rechazada` | `implementada`).
- **hilos** y **mensajes**: `hilos(empresa_id, asunto, estado)` y `mensajes(hilo_id, autor_id, cuerpo, adjuntos, leido_en)`.

### Avisos, web y facturas

- **notificaciones**: `usuario_id`, `tipo`, `titulo`, `cuerpo`, `enlace`, `leida_en`.
- **solicitudes_web**: diagnósticos que llegan desde visaxai.es. Hoy se guardan en la Data Table de n8n `visaxai_solicitudes_web`; en la fase 2 se pasan aquí para poder convertirlas en empresa con un clic.
- **facturas** (copia de Stripe): `empresa_id`, `stripe_invoice_id`, `numero`, `importe`, `estado`, `pdf_url`, `emitida_en`.

### Ejemplo de RLS

```sql
-- Funciones auxiliares (security definer, en un esquema privado)
create function privado.es_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin' and activo)
$$;

create function privado.mi_empresa() returns uuid
  language sql stable security definer set search_path = '' as $$
  select empresa_id from public.perfiles where id = auth.uid() and activo
$$;

alter table public.incidencias enable row level security;

-- El cliente ve y crea incidencias de SU empresa; el admin, todas
create policy "ver incidencias" on public.incidencias for select
  using (privado.es_admin() or empresa_id = privado.mi_empresa());

create policy "crear incidencia" on public.incidencias for insert
  with check (empresa_id = privado.mi_empresa() and creada_por = auth.uid());

create policy "gestionar incidencias" on public.incidencias for update
  using (privado.es_admin());
```

Las tablas con `visible_cliente` o `publicado_en` añaden esa condición a la política del cliente. La clave `service_role` de Supabase solo se usa en el servidor (rutas de API y webhooks), nunca en el navegador.

### Storage

Bucket privado `informes` con rutas `{empresa_id}/{informe_id}.pdf`. Política de lectura: admin, o `(storage.foldername(name))[1] = privado.mi_empresa()::text`. Las descargas se hacen con URLs firmadas de corta duración.

## 6. Notificaciones

1. **Dentro del portal**: tabla `notificaciones` y una campana con contador (Realtime opcional).
2. **Por correo al cliente**: un trigger de Postgres llama a un webhook de n8n (como ya hace la web) y n8n envía el email: incidencia actualizada, informe publicado, visita confirmada, factura emitida.
3. **Al equipo**: los mismos eventos avisan a VISAX por Gmail y, si se quiere, por ntfy en el móvil (el mismo sistema que ya usa VISAX Equipo).

Cada usuario podrá elegir qué avisos recibe por correo (`preferencias_notificacion`).

## 7. Facturación

**Recomendado: Stripe Billing.**

- Un producto por plan y un precio mensual (`stripe_price_id` en `planes`); los planes «a medida» se crean como precio propio del cliente.
- Alta con Stripe Checkout (tarjeta o **adeudo SEPA**, habitual en B2B en España) y Customer Portal de Stripe para que el cliente cambie su método de pago y descargue facturas.
- Webhook `/api/stripe/webhook` (verificando la firma): actualiza `suscripciones` y `facturas` y lanza las notificaciones.

**Alternativas:** domiciliación con vuestro banco más un programa de facturación español (Holded, Quaderno, Facturadirecta…), o facturar fuera de la plataforma y solo mostrar el PDF. **Antes de elegir, revisad con vuestra asesoría los requisitos de facturación electrónica (Verifactu)**: puede que la factura legal tenga que salir de un programa homologado aunque el cobro lo haga Stripe.

## 8. Seguridad y RGPD

- RLS en **todas** las tablas con datos de clientes; pruebas automáticas que comprueben que un cliente no puede leer otra empresa.
- MFA obligatorio para admins; sesiones cortas en el panel.
- Registro de auditoría (`auditoria`: quién cambió qué y cuándo) en tablas sensibles.
- Supabase en región UE, contratos de encargado de tratamiento (DPA) con Supabase, Stripe, Vercel y n8n, y actualizar la política de privacidad.
- Copias de seguridad diarias (incluidas en Supabase de pago) y un procedimiento para borrar o exportar los datos de un cliente.

## 9. Sistema visual compartido

- Tokens en `styles/tokens.css` (colores, radios, sombras, tipografías), leídos por Tailwind en `tailwind.config.ts`.
- Componentes base en `components/ui/` (`Button`, `Field`, `SectionHeading`, `Logo`, `Reveal`).
- Logotipo en `lib/brand.ts`.
- El portal y el panel usarán estos mismos componentes; para pantallas densas (tablas, filtros) se añadirán componentes nuevos en `components/ui/`, siempre con los tokens.

## 10. Fases recomendadas

1. **Web pública (hecho).** Nuevo modelo de suscripción, diagnóstico y visitas por n8n, rutas preparadas.
2. **Panel interno (admin).** Es lo primero porque sin datos dentro el portal estaría vacío.
   - Supabase, autenticación, roles y RLS.
   - CRUD de empresas, usuarios, planes y suscripciones (sin Stripe todavía).
   - Servicios activos, incidencias con historial, historial de trabajo e informes (subida de PDF).
   - Bandeja de solicitudes de la web (diagnósticos y visitas), con migración desde la Data Table de n8n.
3. **Portal del cliente.**
   - 3a. Solo lectura: resumen, servicios, historial, informes.
   - 3b. Interacción: incidencias, solicitudes de mejora y de visita, mensajes, notificaciones por correo.
   - 3c. Facturación con Stripe y facturas descargables.

Cada fase se publica por separado y no rompe la anterior: la web pública sigue funcionando igual mientras se construyen el panel y el portal.
