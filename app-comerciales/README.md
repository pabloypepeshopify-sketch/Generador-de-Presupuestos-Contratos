# VISAX Equipo · app de comerciales

App web (se instala en el móvil como una app) para que los 3 comerciales y los 2 socios de VISAX NFC apunten cada llamada a bares y restaurantes y todos vean lo mismo al momento.

El objetivo de cada llamada es **conseguir ver al dueño en persona**. La app gira alrededor de eso.

## Qué hace

- **Apuntar llamada en tres toques**: local (busca si ya existe para no llamar dos veces al mismo), quién lo cogió (nadie / empleado / dueño) y cómo fue (cita con el dueño / volver a llamar / no interesa / compra ya).
- Datos que se sacan en la llamada: nombre del dueño, empleado que atendió, interés (poco / algo / mucho), productos del catálogo que le interesan, notas.
- **Cita con el dueño**: día, hora, quién va, dirección. Botón para añadirla a Google Calendar y para confirmarla por WhatsApp.
- **Apuntar visita al local** (con cita o a puerta fría): con quién hablaste (dueño / empleado / cerrado) y resultado (vendido con importe, se lo piensa, otra cita, no interesa). La base de datos enlaza sola cada visita con su cita y guarda quién consiguió esa cita.
- **Concurso de noviembre** (del 1 al 30; fechas y premio en `web/js/concurso.js`) entre comerciales: 1 punto por cita hecha (visita apuntada hablando con el dueño, para quien consiguió la cita) y 7 por venta (para quien la apunta; si es un socio, para el comercial de esa cita o local). Empate: más ventas. Las llamadas guardadas no se pueden editar ni antedatar.
- **Estados de cada local**: Por llamar · No lo cogen · Volver a llamar · Cita con dueño · Cliente · No interesa.
- **Agenda**: próximas visitas por día y lista de rellamadas (atrasadas, hoy, próximos días).
- **Equipo**: llamadas, % que lo cogen, contactos con el dueño, citas, conversión llamada→cita y ventas por persona (hoy, semana, mes, 90 días). Exportación a CSV para Excel.
- **Catálogo** con precios y precios por volumen de visaxnfc.es (los socios lo editan).
- **Importar listados** de bares pegando columnas desde Excel o Google Sheets (salta los repetidos).
- Tiempo real: lo que apunta un compañero aparece al instante en el resto de móviles.
- Gestión del equipo (solo socios): dar de alta, cambiar contraseña, renombrar, cambiar rol, quitar acceso.

## Cómo está hecho

- `web/`: HTML + JS sin paso de build (Preact + htm desde jsDelivr, supabase-js UMD). Se despliega tal cual en Vercel (proyecto `visax-equipo`).
- `supabase/migrations/`: esquema, RLS y trigger que actualiza la ficha del local con cada llamada. Proyecto Supabase `visax-comerciales` (separado del de facturación).
- `supabase/functions/equipo/`: función Edge para que los socios gestionen usuarios con la service role (nunca llega al navegador).

Los usuarios entran con **usuario + contraseña** (por debajo se guardan como `usuario@equipo.visaxnfc.es`, no se envía ningún correo).

### Permisos (RLS)

| | Comercial | Socio |
|---|---|---|
| Ver locales, llamadas, agenda, informes | ✔ | ✔ |
| Crear y editar locales, apuntar llamadas | ✔ | ✔ |
| Borrar locales | | ✔ |
| Editar catálogo | | ✔ |
| Gestionar el equipo | | ✔ |

## Desplegar cambios

Vercel: subir el contenido de `web/` al proyecto `visax-equipo` (equipo VISAX AI).
Base de datos: añadir una migración nueva en `supabase/migrations/` y aplicarla al proyecto `visax-comerciales`.
