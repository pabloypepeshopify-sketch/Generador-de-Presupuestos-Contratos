# Plantilla de Google Docs — Informe de auditoría de contrato

Crea un Google Doc (será la **plantilla** del módulo *Create a Document from a Template*, paso 14) y
copia su ID de la URL (`docs.google.com/document/d/<TEMPLATE_INFORME_ID>/edit`). Las etiquetas van
**con llaves** en el Doc (`{{semaforo}}`); en el módulo de Make se escriben **sin llaves**
(`semaforo`) — Make añade las llaves.

> **El bloque de descargo legal es TEXTO FIJO de la plantilla, no una etiqueta.** Así la IA no puede
> omitirlo ni alterarlo. Ver `docs/06-descargo-legal.md`.

---

## Contenido de la plantilla (copia/pega en el Doc y da formato)

```
──────────────────────────────────────────────────────────────
INFORME DE AUDITORÍA DE CONTRATO
Detección automática de cláusulas de riesgo
──────────────────────────────────────────────────────────────

Nº de auditoría:  {{id_auditoria}}
Fecha de análisis: {{fecha_analisis}}
Documento:         {{nombre_archivo}}
Recibido de:       {{remitente}}
Tipo de contrato:  {{tipo_contrato}}

──────────────────────────────────────────────────────────────
SEMÁFORO GLOBAL:  {{semaforo}}   —   {{semaforo_texto}}
──────────────────────────────────────────────────────────────
  🟢 VERDE  · Sin riesgos relevantes detectados.
  🟡 ÁMBAR  · Revisar antes de firmar.
  🔴 ROJO   · Riesgo alto. No firmar sin asesoría legal.
(El recuadro anterior es una leyenda; el resultado de este contrato es el indicado arriba.)

RESUMEN EJECUTIVO
{{resumen_ejecutivo}}

──────────────────────────────────────────────────────────────
ANÁLISIS PUNTO POR PUNTO
──────────────────────────────────────────────────────────────
{{informe_cuerpo}}

──────────────────────────────────────────────────────────────
⚠️  AVISO IMPORTANTE — ESTO NO ES ASESORAMIENTO JURÍDICO
──────────────────────────────────────────────────────────────
Este informe es una PRIMERA CAPA AUTOMÁTICA de detección de posibles cláusulas de
riesgo, generada por inteligencia artificial a partir del texto del contrato aportado.
NO constituye un dictamen jurídico ni sustituye la revisión por un abogado colegiado.
El sistema NO decide ni recomienda firmar o no firmar: la decisión es siempre del
responsable. La IA puede omitir cláusulas, malinterpretar el texto o no detectar
riesgos. Antes de firmar cualquier contrato con semáforo ÁMBAR o ROJO, consulte con un
profesional del Derecho. La cita textual de cada punto se ofrece para su verificación
directa contra el contrato original, que se adjunta a este envío.

{{nombre_empresa}} · Informe generado automáticamente · No responder a este correo.
```

---

## Etiquetas → mapeo en el módulo 14 (*Create a Document from a Template*)

| Etiqueta (Tag, sin llaves) | Replaced Value (mapeo Make) |
|----------------------------|-----------------------------|
| `id_auditoria` | `{{4.id_auditoria}}` |
| `fecha_analisis` | `{{4.fecha_analisis}}` |
| `nombre_archivo` | `{{4.nombre_archivo}}` |
| `remitente` | `{{4.remitente}}` |
| `tipo_contrato` | `{{9.tipo_contrato_detectado}}` |
| `semaforo` | `{{10.semaforo}}` |
| `semaforo_texto` | `{{10.semaforo_texto}}` |
| `resumen_ejecutivo` | `{{9.resumen_ejecutivo}}` |
| `informe_cuerpo` | `{{9.informe_cuerpo}}` |
| `nombre_empresa` | `REEMPLAZAR_NOMBRE_EMPRESA` |

> **Ya creada en tu Drive:** plantilla `Plantilla Informe Auditoria de Contrato`
> (ID `1AqZ6dcTLWwDFHgCG5OAdO5tVd6BzzCCduJQp-_pvrXw`), dentro de la carpeta
> `Informes Auditoria de Contratos` (ID `1ugUnyqwYW7yL3OBqBV1Tr9XomiLMVTm-`).

> Da formato en el Doc (colores del semáforo, negritas, tabla si quieres). El módulo solo
> **sustituye texto**; el estilo lo pones tú una vez en la plantilla.
