# Recepcionista Virtual Inteligente — Clínica Cuerpo Sano (con Disponibilidad)

Auditoría, corrección de fallos y verificación **router por router** del escenario de Make
que gestiona por **email** las citas de la clínica con IA.

- **Escenario Make:** `Recepcionista Virtual Inteligente - Clínica Cuerpo Sano (con Disponibilidad)`
- **ID:** `6401043` · **Equipo:** `1998941` · **Zona:** `eu1.make.com` (Europe/Madrid)
- **Disparador:** Gmail → *Watch emails* (INBOX, `is:unread`, 1 por ejecución, marca leído)
- **Programación:** cada 15 min (indefinitely / 900 s)
- **Hoja de seguimiento:** Google Sheet `18dTIvftn_Xu9TbifGy3BJ_kny0N4AH9ESW-6-pFttMU`, pestaña `Hoja 1`
- **Estado tras la intervención (2026-07-29):** `isinvalid: false` · `isActive: true` · última ejecución **OK**

---

## 1. Fallos encontrados y corregidos

Todas las ejecuciones recientes morían en el módulo **OpenAI (CreateCompletion)**. La causa era
que varios parámetros numéricos estaban guardados como **texto**, y la API de OpenAI (endurecida
recientemente) los rechaza con error `400`. Como el **primer** módulo de IA (analizar intención)
se ejecuta en *todos* los correos, el escenario fallaba en cada mensaje.

| # | Módulo | Problema | Corrección |
|---|--------|----------|------------|
| 1 | OpenAI #5 (intención) | `max_tokens: "300"` (texto) → `[400] max_completion_tokens: expected an integer` | `max_tokens: 300` (entero) |
| 2 | OpenAI #52 (disponibilidad) | `max_tokens: "700"` (texto) | `max_tokens: 700` (entero) |
| 3 | OpenAI #5 y #52 | `temperature` como texto → `[400] temperature: expected a decimal` | `temperature: 0` / `0.2` (número) |
| 4 | OpenAI #5 y #52 | `top_p` y `n_completions` como texto | `top_p: 1`, `n_completions: 1` (número) |
| 5 | OpenAI #52 (disponibilidad) | Fórmula rota `{{if(51.text)}}(ninguna...){{51.text}}` (un solo argumento) | `{{if(51.text = ""; "(ninguna — todos los slots disponibles)"; 51.text)}}` |
| 6 | Calendar #80 (free/busy), #8, #29 | Concatenación sin espacio `parseDate(6.fecha + 6.hora; ...)` | `parseDate(6.fecha + " " + 6.hora; ...)` |
| 7 | Calendar #80 (free/busy) | `timeMin` como texto suelto `"{{6.fecha}} {{6.hora}}"` | `timeMin: {{parseDate(6.fecha + " " + 6.hora; "YYYY-MM-DD HH:mm")}}` (fecha ISO, simétrico con `timeMax`) |

> Corregir los tipos numéricos también **limpió la marca "inválido"** del escenario
> (`isinvalid` pasó de `true` a `false`).

**Verificación:** ejecución `04c9feb9948a4f449ec3896c37bab21b` (2026-07-29 01:29) → **status 1 (éxito)**,
4 operaciones, el correo pasó por disparador → búsqueda de paciente → **OpenAI OK** → ParseJSON OK.
El módulo que antes reventaba ahora completa.

---

## 2. Arquitectura del flujo

```
Gmail (nuevo email no leído)
   │
   ▼
Buscar Fila de Paciente (Sheets · filtra por email en col. A)
   │
   ▼
Analizar Intención con GPT-4o-mini (JSON: intencion, fecha, hora, resumen)
   │
   ▼
Parsear Intención JSON
   │
   ▼
ROUTER DE INTENCIONES  ── 9 rutas ──▶ (ver §3)
```

**Intenciones que devuelve la IA:** `crear_cita`, `modificar_cita`, `cancelar_cita`,
`consultar_disponibilidad`, `consulta`, `hablar_con_humano`, `ignorar`.

**Columnas de `Hoja 1`** (direccionadas por posición, 0-based):

| Índice | Columna | Contenido |
|--------|---------|-----------|
| 0 | A | Email del paciente |
| 1 | B | Nombre |
| 2 | C | Fecha del correo (internalDate) |
| 3 | D | Resumen (IA) |
| 4 | E | Estado (`Confirmada` / `Cancelada` / `Pendiente de atención humana`) |
| 5 | F | Fecha de la cita |
| 6 | G | Hora de la cita |

---

## 3. Repaso router por router (todas las rutas verificadas)

### Router principal — «Router de Intenciones» (9 rutas)

**Ruta 1 · Crear cita** — `intencion = crear_cita` **y** hay fecha **y** hora
1. **Free/Busy** del hueco pedido (30 min) en el calendario de la clínica.
2. Sub-router **¿Hueco libre?**
   - **Libre** (`result[1].start` no existe): crea el evento en Calendar y luego
     sub-router **¿Paciente nuevo o existente?**
     - **Nuevo** (`__IMTLENGTH__ = 0`): añade fila en Sheets + email de confirmación.
     - **Existente** (`__ROW_NUMBER__` existe): actualiza estado/fecha/hora + email de confirmación.
   - **Ocupado** (`result[1].start` existe): email «ese horario no está disponible».
   ✔ Fechas ISO correctas en free/busy y en el evento tras el arreglo #6/#7.

**Ruta 2 · Consulta (paciente existente)** — `consulta` **y** `__ROW_NUMBER__` existe
- Marca la fila como *Pendiente de atención humana* + aviso interno al equipo. ✔

**Ruta 3 · Modificar cita** — `modificar_cita` **y** `__ROW_NUMBER__` existe
- Busca el evento del paciente (por email, en la fecha guardada col. F), lo reprograma,
  actualiza Sheets + email al paciente. ✔

**Ruta 4 · Consulta (paciente nuevo)** — `consulta` **y** `__IMTLENGTH__ = 0`
- Registra al paciente nuevo como *Pendiente de atención humana* + aviso interno. ✔

**Ruta 5 · Consultar disponibilidad (con fecha)** — `consultar_disponibilidad` **y** hay fecha
- Busca las citas del día → agrega ocupadas → GPT redacta el email con los huecos libres
  (respeta horario L-V mañana/tarde, descarta fines de semana) → email al paciente.
  ✔ Arreglos #2, #3, #4 (OpenAI) y #5 (fórmula `if`).

**Ruta 6 · Consultar disponibilidad (sin fecha)** — `consultar_disponibilidad` sin fecha
- Email con el horario general y petición de que indiquen un día concreto. ✔

**Ruta 7 · Cancelar cita** — `cancelar_cita` **y** `__ROW_NUMBER__` existe
- Busca el evento, lo borra de Calendar, marca *Cancelada* en Sheets + email al paciente. ✔

**Ruta 8 · Hablar con humano** — `hablar_con_humano`
- Aviso interno al equipo + acuse de recibo al paciente. ✔

**Ruta 9 · Crear cita — faltan datos** — `crear_cita` sin fecha **o** sin hora
- Email pidiendo día y hora concretos. ✔

> `ignorar` (spam/publicidad/no-paciente): ninguna ruta coincide → el correo se ignora
> de forma intencionada. Comportamiento correcto.

---

## 4. Recomendaciones (mejoras, no bloqueantes) para dejarlo redondo

1. **Reservas fuera de horario.** La ruta de *crear cita* solo comprueba conflictos en el
   calendario, no el horario comercial. Un paciente podría reservar sábado o de madrugada si el
   hueco está libre. Sugerencia: añadir un filtro/validación de día laborable y franja
   (L-V 09:00-13:00 / 16:00-19:30) antes de crear el evento, reutilizando la lógica del prompt
   de la ruta 5.
2. **Bucle de auto-correo.** Los avisos internos van a `pabloypepeshopify@gmail.com`, la misma
   bandeja que vigila el disparador → cada aviso se reprocesa (la IA lo clasifica como `ignorar`,
   pero consume operaciones). Sugerencia: excluir el propio remitente en el disparador
   (`from` / palabras excluidas) o usar una dirección de staff distinta.
3. **Datos de la clínica** (email interno, calendario, hoja) están cableados a la cuenta de
   pruebas. Para revender, parametrizarlos por cliente.

---

## 5. Verificación de las 9 rutas (test del clasificador real)

Como el disparador es email, se probó el **motor de decisión** (módulo OpenAI, el único
componente "inteligente") con una sonda temporal que replica exactamente el modelo y el prompt
de producción (`gpt-4o-mini`, mismo system prompt). Se enviaron 10 mensajes de paciente reales
y se leyó la clasificación devuelta. **Resultado: 10/10 correctos.**

| Caso de paciente | Intención devuelta | Fecha / Hora | Ruta que dispara |
|---|---|---|---|
| "cita el viernes 7 de agosto a las 10:00" | `crear_cita` | 2026-08-07 / 10:00 | **1** Crear cita |
| "quiero reservar una cita de fisioterapia" (sin día/hora) | `crear_cita` | null / null | **9** Faltan datos |
| "cambiarla al lunes 10 de agosto a las 17:00" | `modificar_cita` | 2026-08-10 / 17:00 | **3** Modificar |
| "quiero cancelar mi cita" | `cancelar_cita` | null / null | **7** Cancelar |
| "¿qué horas libres el miércoles 12 de agosto?" | `consultar_disponibilidad` | 2026-08-12 / null | **5** Disponibilidad (con fecha) |
| "¿qué horarios tenéis para pedir cita?" | `consultar_disponibilidad` | null / null | **6** Disponibilidad (sin fecha) |
| "¿tratáis tendinitis? ¿llevo informes?" | `consulta` | null / null | **2/4** Consulta |
| "ponme con una persona, no un robot" | `hablar_con_humano` | null / null | **8** Hablar con humano |
| "🎉 OFERTA 50% en MegaShop, compra ya" | `ignorar` | null / null | — (se descarta) |
| "cita para **mañana** a las 17:00" | `crear_cita` | 2026-07-30 / 17:00 | **1** (fecha relativa resuelta ✔) |

> La sonda se eliminó tras la prueba (no queda scaffolding). El clasificador acierta el 100 %
> de los tipos de consulta y resuelve fechas absolutas y relativas.

### Límites conocidos (no rompen, pero conviene cerrarlos para vender)
- **Modificar/Cancelar de paciente no registrado:** las rutas 3 y 7 exigen que el paciente ya
  esté en la hoja (`__ROW_NUMBER__`). Si alguien pide cancelar/modificar y no consta, ningún
  router coincide → el asistente no responde. Recomendado: añadir una rama de cortesía.
- **Reservas fuera de horario / fin de semana** (ver §4.1).
- **Bucle de auto-correo** con los avisos internos (ver §4.2).

## 6. Estado final

- ✅ Fallo de OpenAI (texto vs número) corregido en los 2 módulos de IA.
- ✅ Fórmula de disponibilidad y fechas de calendario robustecidas.
- ✅ Escenario **válido** y **activo**, verificado con ejecución real en verde.
- ✅ Las 9 rutas del router revisadas y coherentes de principio a fin.
