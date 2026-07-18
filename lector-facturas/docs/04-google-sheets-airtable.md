# 04 · Estructura de la hoja de registro (Google Sheets / Airtable)

## Google Sheets (opción por defecto)
Crea un Google Sheet y **una pestaña llamada exactamente `Facturas`**. Primera fila = cabeceras,
**en el mismo orden** (los módulos escriben por posición de columna A→S, rango `A1:S1`):

| Col | Cabecera | Contenido | Origen |
|-----|----------|-----------|--------|
| A | `id_registro` | ID único del registro | `{{7.id_registro}}` |
| B | `fecha_proceso` | Cuándo se procesó | `{{7.fecha_proceso}}` |
| C | `estado` | `PROCESADA` / `REVISION_MANUAL` / `DUPLICADA` | literal por ruta |
| D | `proveedor` | Nombre del proveedor | `{{5.proveedor_nombre}}` |
| E | `nif_cif` | NIF/CIF del emisor | `{{5.proveedor_nif}}` |
| F | `numero_factura` | Nº de factura | `{{5.numero_factura}}` |
| G | `fecha_factura` | Fecha de la factura (YYYY-MM-DD) | `{{5.fecha_factura}}` |
| H | `concepto` | Descripción breve | `{{5.concepto}}` |
| I | `base_imponible` | Base | `{{5.base_imponible}}` |
| J | `tipo_iva` | % IVA | `{{5.tipo_iva}}` |
| K | `cuota_iva` | Importe IVA | `{{5.cuota_iva}}` |
| L | `total` | Total factura | `{{5.total}}` |
| M | `moneda` | EUR | `{{5.moneda}}` |
| N | `categoria_gasto` | Categoría (lista cerrada) | `{{5.categoria_gasto}}` |
| O | `confianza` | 0–1 de la IA | `{{5.confianza}}` |
| P | `motivo_revision` | Por qué necesita revisión (vacío si OK) | `{{5.motivo_revision}}` / faltantes |
| Q | `email_origen` | Remitente del email | `{{1.fromEmail}}` |
| R | `fichero` | Nombre del PDF | `{{2.fileName}}` |
| S | `clave_factura` | Clave antiduplicados (`nif|numero`) | `{{7.clave_factura}}` |

**Cabeceras listas para pegar en A1:**
```
id_registro	fecha_proceso	estado	proveedor	nif_cif	numero_factura	fecha_factura	concepto	base_imponible	tipo_iva	cuota_iva	total	moneda	categoria_gasto	confianza	motivo_revision	email_origen	fichero	clave_factura
```

### Trucos útiles en la hoja
- **Formato condicional** por `estado`: verde = PROCESADA, ámbar = REVISION_MANUAL, gris = DUPLICADA.
- **Tabla dinámica** por `categoria_gasto` + `mes(fecha_factura)` → informe de gasto por tipo.
- **Filtro guardado** `estado = REVISION_MANUAL` → bandeja de trabajo del administrativo.

## Alternativa: Airtable
Si el cliente prefiere Airtable, sustituye los 3 módulos `Google Sheets → Add a Row` (9, 11, 13) por
`Airtable → Create a Record` apuntando a una tabla `Facturas` con estos campos (tipos recomendados):

| Campo | Tipo Airtable |
|-------|---------------|
| id_registro | Single line text (o Autonumber) |
| fecha_proceso | Date/time |
| estado | Single select (PROCESADA / REVISION_MANUAL / DUPLICADA) |
| proveedor | Single line text |
| nif_cif | Single line text |
| numero_factura | Single line text |
| fecha_factura | Date |
| concepto | Long text |
| base_imponible / cuota_iva / total | Currency (EUR) |
| tipo_iva | Number (percent/integer) |
| moneda | Single line text |
| categoria_gasto | Single select (las 11 categorías del prompt) |
| confianza | Number (decimal) |
| motivo_revision | Long text |
| email_origen | Email |
| fichero | Single line text |
| clave_factura | Single line text (marcar **unique**) |

> El mapeo IA→campos es idéntico; solo cambia el conector de destino. Todo lo demás (OCR, IA, dedup,
> Router) se queda igual.

## Export a software contable (ampliación)
Para volcar directamente a Contasol / A3 / Sage, añade tras la ruta OK un módulo **HTTP** que llame a la
API del software contable con el mismo JSON del módulo 5. La hoja de Sheets se mantiene como registro y
respaldo.
