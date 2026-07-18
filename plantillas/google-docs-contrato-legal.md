# Plantilla Google Docs — Contrato / Hoja de Encargo (Despacho legal)

> Misma mecánica que la plantilla de presupuesto: crea un Google Doc con estos placeholders.
> Puedes tener **una sola plantilla** con un `{{cuerpo_documento}}` que la IA rellena según el
> tipo de caso, o **plantillas separadas** por tipo (recomendado si los formatos difieren mucho).
> Para elegir plantilla según sector, añade en el escenario un **Router** por `{{4.tipo_documento}}`
> o `{{1.sector}}` y un módulo *Create from Template* distinto en cada rama.

---

## Estructura sugerida — Hoja de encargo profesional

```
{{nombre_empresa}} — Abogados
{{direccion_empresa}} · {{cif_empresa}} · Nº Colegiado: {{num_colegiado}}

HOJA DE ENCARGO PROFESIONAL
Ref.: {{id_solicitud}}          Fecha: {{fecha_documento}}

REUNIDOS
De una parte, {{nombre_empresa}}, con CIF {{cif_empresa}} ("el Despacho").
De otra parte, {{cliente_nombre}}, con domicilio en {{cliente_direccion}}
y email {{cliente_email}} ("el Cliente").

{{cuerpo_documento}}

HONORARIOS
Base imponible ......... {{base_imponible}} €
IVA ({{iva_porcentaje}} %) .......... {{iva_importe}} €
TOTAL .................. {{total}} €
Provisión de fondos: {{condiciones_pago}}

PROTECCIÓN DE DATOS
{{clausula_rgpd}}

En prueba de conformidad, ambas partes firman el presente documento.

El Despacho                         El Cliente

____________________               ____________________
```

---

## Placeholders específicos legales

| Placeholder            | Origen                                  | Obligatorio |
|------------------------|-----------------------------------------|:-----------:|
| `{{num_colegiado}}`    | Constante tuya                          | Sí          |
| `{{cuerpo_documento}}` | `4.cuerpo_documento` (objeto del encargo, alcance, límites, honorarios, confidencialidad, jurisdicción) | Sí |
| `{{clausula_rgpd}}`    | Constante tuya (texto RGPD fijo del despacho) | Sí     |

El resto de placeholders (`{{cliente_nombre}}`, `{{fecha_documento}}`, importes, etc.) son
comunes con la plantilla de presupuesto.

> ⚠️ **Aviso legal:** el texto generado por IA es un **borrador** que SIEMPRE debe revisar y
> validar un profesional colegiado antes de enviarse o firmarse. La cláusula de aprobación humana
> del escenario (ver `docs/05-aprobacion-humana.md`) es obligatoria para el sector legal.
