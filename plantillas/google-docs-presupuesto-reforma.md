# Plantilla Google Docs — Presupuesto de Reforma

> Crea un documento en Google Docs con este contenido. Los textos entre **`{{ }}`** son los
> placeholders que el módulo *Google Docs → Create a Document from a Template* sustituye.
> **Importante:** en Make, el módulo hace una **copia** de esta plantilla por cada ejecución y
> reemplaza los `{{placeholder}}`. La plantilla NUNCA se modifica.
>
> El módulo del blueprint mapea estos placeholders → valores del JSON de la IA (módulo 4).
> Los placeholders deben escribirse **idénticos** (mismas llaves y nombre) en el Doc.
>
> **Convención de llaves:** en el **Google Doc** la etiqueta se escribe **con llaves**
> (`{{cliente_nombre}}`). En el módulo de Make *Create a Document from a Template*, el campo *Tags*
> se escribe **sin llaves** (`cliente_nombre`): el propio módulo añade las `{{ }}` al buscar. Así
> está configurado el blueprint (`requests[].text = "cliente_nombre"`).

---

## Estructura sugerida del documento

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO DE LA EMPRESA]                                        │
│                                                             │
│  {{nombre_empresa}}                                         │
│  {{direccion_empresa}} · {{cif_empresa}}                    │
│  {{telefono_empresa}} · {{email_empresa}}                   │
└─────────────────────────────────────────────────────────────┘

PRESUPUESTO Nº {{id_solicitud}}
Fecha: {{fecha_documento}}          Validez: {{validez_dias}} días

DATOS DEL CLIENTE
Nombre:     {{cliente_nombre}}
Dirección:  {{cliente_direccion}}
Teléfono:   {{cliente_telefono}}
Email:      {{cliente_email}}

PROYECTO: {{proyecto_titulo}}

{{cuerpo_documento}}

─────────────────────────────────────────────────────────────
RESUMEN ECONÓMICO
Base imponible ......... {{base_imponible}} €
IVA ({{iva_porcentaje}} %) .......... {{iva_importe}} €
TOTAL .................. {{total}} €
─────────────────────────────────────────────────────────────

CONDICIONES DE PAGO
{{condiciones_pago}}

PLAZO DE EJECUCIÓN
{{plazo_ejecucion}}

CLÁUSULAS
{{clausulas_texto}}

Firma del cliente (conformidad):


_______________________          Fecha: ____________
```

---

## Lista de placeholders (deben existir en el Doc)

| Placeholder            | Origen (JSON IA / variable Make)        | Obligatorio |
|------------------------|-----------------------------------------|:-----------:|
| `{{nombre_empresa}}`   | Constante tuya (o Data Store)           | Sí          |
| `{{direccion_empresa}}`| Constante tuya                          | Sí          |
| `{{cif_empresa}}`      | Constante tuya                          | Sí          |
| `{{telefono_empresa}}` | Constante tuya                          | Sí          |
| `{{email_empresa}}`    | Constante tuya                          | Sí          |
| `{{id_solicitud}}`     | `{{2.id_solicitud}}`                    | Sí          |
| `{{fecha_documento}}`  | `4.fecha_documento`                     | Sí          |
| `{{validez_dias}}`     | `4.validez_dias`                        | Sí          |
| `{{cliente_nombre}}`   | `4.cliente_nombre`                      | Sí          |
| `{{cliente_direccion}}`| `4.cliente_direccion`                   | Sí          |
| `{{cliente_telefono}}` | `4.cliente_telefono`                    | No          |
| `{{cliente_email}}`    | `4.cliente_email`                       | Sí          |
| `{{proyecto_titulo}}`  | `4.proyecto_titulo`                     | Sí          |
| `{{cuerpo_documento}}` | `4.cuerpo_documento`                    | Sí          |
| `{{base_imponible}}`   | `4.base_imponible`                      | Sí          |
| `{{iva_porcentaje}}`   | `4.iva_porcentaje`                      | Sí          |
| `{{iva_importe}}`      | `4.iva_importe`                         | Sí          |
| `{{total}}`            | `4.total`                               | Sí          |
| `{{condiciones_pago}}` | `4.condiciones_pago`                    | Sí          |
| `{{plazo_ejecucion}}`  | `4.plazo_ejecucion`                     | Sí          |
| `{{clausulas_texto}}`  | Concat de `4.clausulas[]` (ver nota)    | Sí          |

### Nota sobre `{{clausulas_texto}}` y `{{cuerpo_documento}}`
- La forma más simple y robusta es apoyarse en **`{{cuerpo_documento}}`**, que ya trae todo el
  texto redactado por la IA (descripción + partidas + totales + condiciones + cláusulas). Con eso
  puedes tener una plantilla mínima: cabecera + `{{cuerpo_documento}}` + firma.
- Si prefieres una plantilla "maquetada" con cada bloque en su sitio (como arriba), mapea cada
  placeholder por separado. Para `{{clausulas_texto}}`, en el módulo Google Docs usa una función
  de Make para unir el array: `{{join(map(4.clausulas; "titulo") ...)}}` o, más simple, pide en el
  prompt un campo adicional `clausulas_texto` ya concatenado en texto plano.
- **Formateo de importes:** si quieres el formato español (12.500,00 €) directamente en el Doc,
  aplica en el mapeo del módulo `{{formatNumber(4.total; 2; ","; ".")}}`.

### Formato de tabla de partidas (opcional, avanzado)
Google Docs *Create from Template* no rellena tablas fila a fila de forma nativa desde un array.
Opciones:
1. **Recomendado (MVP):** dejar la tabla como texto dentro de `{{cuerpo_documento}}`.
2. **Avanzado:** usar el módulo *Google Docs → Insert a Paragraph/Table* tras crear el doc, o el
   patrón "tabla con fila plantilla + Insert Table Row" iterando el array `partidas`.
