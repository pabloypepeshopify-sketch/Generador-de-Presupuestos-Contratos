# 04 · Informe final y hoja de trazabilidad

## A · Informe que recibe el cliente
Estructura completa en [`plantillas/google-docs-informe-riesgos.md`](../plantillas/google-docs-informe-riesgos.md).
Resumen de secciones:

1. **Cabecera** — nº de auditoría, fecha, nombre del archivo, remitente, tipo de contrato.
2. **Semáforo global** — `{{semaforo}}` + su significado, con la leyenda verde/ámbar/rojo.
3. **Resumen ejecutivo** — 2–3 frases en lenguaje llano.
4. **Análisis punto por punto** (`{{informe_cuerpo}}`) — por cada punto de la checklist:
   `NOMBRE — [ESTADO · nivel]`, la **cita textual** del contrato y la **explicación en lenguaje
   llano**.
5. **Descargo legal fijo** — texto no editable de la plantilla (ver `06-descargo-legal.md`).
6. **Pie** — nombre de empresa, aviso de correo automático.

El informe se genera como Google Doc (paso 14) y se exporta a **PDF** (paso 15). El email (pasos
18/19/20) adjunta **el informe PDF + el contrato original** para que el responsable verifique cada
cita contra la fuente.

---

## B · Hoja de trazabilidad (Google Sheets)
Crea un Google Sheet **`Auditorias - Contratos`** con la pestaña (`sheetId`) **`Auditorias`**. Fila 1
= cabeceras (`includesHeaders = true`, mapeo por nombre de columna).

| Col | Cabecera | Contenido | Escrito por |
|:---:|----------|-----------|-------------|
| A | `id_auditoria` | Clave única (fecha+archivo). | pasos 7/13/16 |
| B | `fecha_analisis` | Fecha/hora del análisis. | paso 4 |
| C | `remitente` | Email de quien envió el contrato. | paso 4 |
| D | `asunto` | Asunto del correo entrante. | paso 4 |
| E | `nombre_archivo` | Nombre del adjunto analizado. | paso 4 |
| F | `tipo_contrato` | `alquiler`/`proveedor`/`laboral`/`otro` (detectado). | IA (paso 9) |
| G | `semaforo` | `VERDE`/`AMBAR`/`ROJO` (o vacío si ilegible). | paso 10 |
| H | `n_riesgo_alto` | Nº de puntos con riesgo alto. | IA (paso 9) |
| I | `n_riesgo_medio` | Nº de puntos con riesgo medio. | IA (paso 9) |
| J | `n_faltan_criticos` | Nº de puntos críticos ausentes. | IA (paso 9) |
| K | `enlace_informe` | URL del informe (Doc) en Drive. | paso 14 |
| L | `estado` | Ciclo de vida (ver abajo). | pasos 7/13/16 |
| M | `motivo` | Motivo si ilegible/no analizable. | pasos 4/9 |
| N | `revisado_por_humano` | Casilla que marca el responsable al revisar. | manual |

> **Ya creada en tu Drive:** hoja `Auditorias - Contratos`
> (ID `135y-0zqrnJcbJgJdUD0gZwgLWau9h_soIRrfymOo74w`), pestaña **`Untitled`** con las 14 cabeceras.
> En el blueprint el campo `sheetId` = `Untitled` (así nombra la API de Google la 1.ª pestaña de una
> hoja creada por programa). Si creas la hoja a mano en la UI, la pestaña será `Hoja 1`/`Sheet1`:
> ajusta `sheetId` a ese nombre.

### Fila de cabeceras lista para pegar (fila 1)
```
id_auditoria	fecha_analisis	remitente	asunto	nombre_archivo	tipo_contrato	semaforo	n_riesgo_alto	n_riesgo_medio	n_faltan_criticos	enlace_informe	estado	motivo	revisado_por_humano
```
> (separadas por TAB — pégalas en A1 y se reparten en A1:N1)

### Ciclo de estados (columna L)
```
RECIBIDO
   ├─► ILEGIBLE_REVISION_MANUAL   (gate de legibilidad: no se llamó a la IA)
   ├─► NO_ANALIZABLE_IA           (la IA se autodeclaró no analizable)
   └─► INFORME_ENVIADO            (informe generado y enviado; ver columna G para el semáforo)
```

| Estado | Significado |
|--------|-------------|
| `ILEGIBLE_REVISION_MANUAL` | El texto extraído no superó el mínimo de caracteres. Sin IA, sin informe. |
| `NO_ANALIZABLE_IA` | La IA no pudo analizar con fiabilidad. Sin informe. |
| `INFORME_ENVIADO` | Informe generado y enviado; el semáforo va en la columna G. |

### Índices de columna en el blueprint
Los módulos *Add Row* mapean por **índice base 0**: `0`=A … `13`=N. Si reordenas columnas, ajusta el
mapeo `values`.

---

## C · Alternativa Airtable
Misma información, una tabla **`Auditorias`** con estos campos (tipos recomendados):

| Campo | Tipo Airtable |
|-------|---------------|
| `id_auditoria` | Single line text (primary) |
| `fecha_analisis` | Date (with time) |
| `remitente` | Email |
| `asunto` | Single line text |
| `nombre_archivo` | Single line text |
| `tipo_contrato` | Single select (`alquiler`/`proveedor`/`laboral`/`otro`) |
| `semaforo` | Single select (`VERDE`/`AMBAR`/`ROJO`) |
| `n_riesgo_alto` / `n_riesgo_medio` / `n_faltan_criticos` | Number |
| `enlace_informe` | URL |
| `estado` | Single select (los 3 estados de arriba) |
| `motivo` | Long text |
| `revisado_por_humano` | Checkbox |

Sustituye en el blueprint los módulos `google-sheets:addRow` por `airtable:createRecord` (app
`airtable`), reasigna la conexión de Airtable y mapea `base`/`table`. El resto del flujo no cambia.
El `Single select` de Airtable exige que las opciones existan previamente (créalas con los valores
exactos de arriba).
