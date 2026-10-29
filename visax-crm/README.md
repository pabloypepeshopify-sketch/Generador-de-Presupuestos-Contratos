# VISAX CRM

CRM comercial interno de VISAX AI para Pablo y Pepe: negocios, contactos, servicios de interés
(automatizaciones con IA, desarrollo de software, página web), visitas, llamadas y demás contactos,
tareas de seguimiento, estados comerciales, tabla con filtros, kanban, panel y agenda.

Es una aplicación independiente: base de datos, login y despliegue propios. No comparte nada con
la app de comerciales NFC (`app-comerciales/`).

## Tecnología

- **Next.js 15** (App Router, Server Actions) + React 19 + TypeScript + Tailwind CSS 4.
- **Supabase**: Postgres con RLS, funciones SQL para las operaciones que deben ser atómicas
  (crear negocio, registrar contacto + tarea + cambio de estado, panel), triggers para historial
  de estados y último contacto, y una función Edge (`acceso`) para activar cuentas.
- Zona horaria de negocio: **Europe/Madrid** (fechas guardadas en UTC, convertidas en la BD y en la app).

## Estructura

```
src/app/login, src/app/activar     Entrada y activación de cuenta (públicas)
src/app/(crm)/                     Todo lo demás (requiere sesión de socio)
  page.tsx                         Panel con métricas y próximas acciones
  negocios/                        Tabla + filtros, alta rápida, ficha, registro de contacto
  kanban/                          Tablero por estado (arrastrar o menú «Mover a…»)
  agenda/                          Hoy, atrasadas, próximos días, sin fecha, por localizar
  ajustes/                         Perfil, contraseña, códigos de acceso
src/acciones/                      Server Actions (validación con zod en el servidor)
src/lib/                           Sesión, fechas Madrid, filtros, validación, textos
supabase/migrations/               Esquema, RLS, funciones y triggers
supabase/functions/acceso/         Canje de códigos de acceso (usa service role en Supabase)
tests/escenarios.mjs               10 escenarios de aceptación con Playwright
```

## Variables de entorno

Copia `.env.example` a `.env.local`:

| Variable | Dónde sale |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → *publishable* |

Las dos son públicas por diseño. La app **no** usa la clave `service_role`; solo la función Edge
`acceso` la usa, y Supabase se la inyecta en su propio entorno (no hay que configurarla).

## Arrancar en local

```bash
cd visax-crm
npm install
cp .env.example .env.local   # y rellena los dos valores
npm run dev                  # http://localhost:3000
```

Otros comandos: `npm run typecheck`, `npm run build`, `npm start`.

## Base de datos (proyecto Supabase nuevo)

1. Crea un proyecto en Supabase (región UE recomendada).
2. Aplica las migraciones de `supabase/migrations/` en orden (SQL Editor o `supabase db push`).
3. Despliega la función Edge sin verificación JWT (valida el código ella misma):
   `supabase functions deploy acceso --no-verify-jwt`
4. En **Authentication → Sign In / Providers** desactiva **Allow new users to sign up**. Las cuentas
   solo se crean con un código de acceso; desactivar el registro público cierra cualquier otra vía.

## Cuentas de Pablo y Pepe

No hay contraseñas predeterminadas. Cada cuenta se activa con un **código de un solo uso**
(formato `XXXX-XXXX-XXXX`, caduca a las 48 h, se bloquea tras 5 intentos fallidos, se guarda cifrado).

**Primera vez** (SQL Editor de Supabase):

```sql
select privado.nuevo_codigo('pablo', 'Pablo', null);
select privado.nuevo_codigo('pepe',  'Pepe',  null);
```

Cada consulta devuelve un código. Entrégalo en persona o por un canal privado. Con él, cada socio
abre `/activar`, escribe su usuario, el código y su contraseña (mínimo 10 caracteres) y entra.

**Recuperar acceso**: desde **Ajustes → Códigos de acceso**, un socio genera un código nuevo para
sí mismo o para el otro. Un código nuevo anula los anteriores sin usar. Si nadie puede entrar,
usa la consulta SQL de arriba.

Internamente cada usuario es una cuenta de Supabase Auth con un correo técnico
(`usuario@crm.visaxai.es`) que nunca se usa para enviar nada.

## Seguridad

- Sin sesión, el middleware redirige a `/login`; las páginas del CRM además comprueban que el
  usuario esté en la tabla `socios`.
- RLS en todas las tablas: solo los socios leen y escriben; los catálogos son de solo lectura; el
  historial de estados solo lo escriben los triggers.
- Toda escritura pasa por Server Actions con validación zod y, en la BD, por restricciones `check`,
  claves foráneas y funciones SQL. `registrada_por` lo fija la BD con `auth.uid()`.
- Cabeceras de seguridad y `noindex` en `next.config.ts`.

## Métricas del panel

Cada tarjeta explica su definición en pantalla. Resumen:

- **Negocios registrados**: todas las fichas, en cualquier estado (y cuántas se crearon esta semana).
- **Contactos esta semana**: interacciones (visitas, llamadas, mensajes…) con fecha de lunes a hoy,
  hora de Madrid. Varias interacciones con el mismo negocio cuentan varias veces.
- **Oportunidades activas**: negocios en *Interesado*, *Preparando propuesta*, *Propuesta enviada*
  o *Decisión pendiente*.
- **Propuestas pendientes**: negocios en *Propuesta enviada* o *Decisión pendiente*.
- **Clientes ganados**: negocios en *Cliente ganado* (y cuántos pasaron a ese estado este mes).
- **Seguimientos pendientes / atrasados**: tareas sin completar; atrasadas = fecha anterior a hoy.
- **Responsable sin localizar**: negocios en *Pendiente de localizar al responsable*.

Con el filtro de socio: negocios de los que es responsable, contactos que ha hecho él y tareas
asignadas a él.

## Pruebas

`tests/escenarios.mjs` recorre los 10 escenarios de aceptación con Playwright en una instancia en
marcha, con negocios ficticios prefijados `[PRUEBA]` que borra al terminar. Necesita dos cuentas
activas y estas variables (no las guardes en el repositorio):

```bash
BASE_URL=http://localhost:3000 \
CRM_USUARIO_A=pablo CRM_CLAVE_A=… CRM_USUARIO_B=pepe CRM_CLAVE_B=… \
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… \
npm run test:e2e
```

Requiere Playwright con Chromium instalado (`npx playwright install chromium`).
