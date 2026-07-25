# Prompt de usuario — Módulo OpenAI (auditoría de contratos)

> Pega este texto como mensaje **User** del mismo módulo OpenAI. Sustituye los `[[...]]` por
> mapeos de Make. `{{4.tipo_contrato}}` y `{{4.texto_contrato}}` vienen del *Set Variables* (paso 5).
> La **checklist** va incrustada aquí; si quieres editarla sin tocar el prompt, externalízala a un
> Data Store (ver `docs/02-checklist-riesgos.md`).

---

## USER

```
TIPO DE CONTRATO: {{4.tipo_contrato}}
(Si es "auto", detecta el tipo entre: alquiler | proveedor | laboral | otro, y aplica la extensión
que corresponda. Deja constancia del tipo detectado en "tipo_contrato_detectado".)

═══════════════════════════════════════════════════════════════════
CHECKLIST CERRADA A EVALUAR
═══════════════════════════════════════════════════════════════════
Evalúa SIEMPRE estos puntos BASE (critico=true son críticos):

- {id: renovacion_automatica, nombre: "Renovación automática / tácita reconducción", critico: true}
- {id: duracion_permanencia,  nombre: "Duración y plazo de permanencia", critico: true}
- {id: penalizaciones,        nombre: "Penalizaciones e indemnizaciones", critico: true}
- {id: resolucion,            nombre: "Cláusula de resolución / desistimiento", critico: true}
- {id: forma_pago,            nombre: "Forma y condiciones de pago", critico: true}
- {id: garantias,             nombre: "Garantías, fianzas y avales", critico: false}
- {id: responsabilidad,       nombre: "Responsabilidad y limitación de responsabilidad", critico: false}
- {id: confidencialidad_rgpd, nombre: "Confidencialidad y protección de datos (RGPD)", critico: false}
- {id: modificacion_unilateral, nombre: "Modificación unilateral de condiciones", critico: false}
- {id: cesion_subcontratacion, nombre: "Cesión y subcontratación", critico: false}
- {id: jurisdiccion,          nombre: "Jurisdicción y ley aplicable", critico: true}

Y AÑADE los puntos de la extensión según el tipo:

· ALQUILER:
- {id: alq_duracion_prorroga,  nombre: "Duración y prórroga (LAU)", critico: true}
- {id: alq_actualizacion_renta, nombre: "Actualización de renta", critico: true}
- {id: alq_fianza_garantias,   nombre: "Fianza y garantías adicionales", critico: true}
- {id: alq_gastos_suministros, nombre: "Gastos y suministros", critico: false}
- {id: alq_obras_conservacion, nombre: "Obras y conservación", critico: false}
- {id: alq_desistimiento,      nombre: "Desistimiento anticipado", critico: true}
- {id: alq_subarriendo,        nombre: "Subarriendo y cesión", critico: false}

· PROVEEDOR:
- {id: prov_precio_revision,   nombre: "Precio y revisión de precios", critico: true}
- {id: prov_plazos_entrega,    nombre: "Plazos de entrega y penalización por retraso", critico: true}
- {id: prov_morosidad,         nombre: "Pago y morosidad (Ley 3/2004)", critico: true}
- {id: prov_garantia_sla,      nombre: "Garantía / nivel de servicio (SLA)", critico: false}
- {id: prov_exclusividad,      nombre: "Exclusividad y no competencia", critico: false}
- {id: prov_propiedad_intelectual, nombre: "Propiedad intelectual y entregables", critico: false}
- {id: prov_duracion_prorroga, nombre: "Duración y prórroga automática", critico: true}

· LABORAL:
- {id: lab_tipo_duracion,      nombre: "Tipo de contrato y duración", critico: true}
- {id: lab_periodo_prueba,     nombre: "Periodo de prueba", critico: true}
- {id: lab_jornada,            nombre: "Jornada, horario y horas complementarias", critico: false}
- {id: lab_salario,            nombre: "Salario y complementos", critico: true}
- {id: lab_no_competencia,     nombre: "Pacto de no competencia post-contractual", critico: true}
- {id: lab_permanencia,        nombre: "Pacto de permanencia", critico: true}
- {id: lab_exclusividad,       nombre: "Plena dedicación / exclusividad", critico: false}
- {id: lab_extincion_preaviso, nombre: "Extinción y preaviso", critico: true}

(Si el tipo es "otro", evalúa solo el bloque BASE.)

═══════════════════════════════════════════════════════════════════
TEXTO DEL CONTRATO A AUDITAR
═══════════════════════════════════════════════════════════════════
<<<INICIO_CONTRATO>>>
{{4.texto_contrato}}
<<<FIN_CONTRATO>>>

═══════════════════════════════════════════════════════════════════
ESQUEMA JSON DE SALIDA (usa EXACTAMENTE estas claves)
═══════════════════════════════════════════════════════════════════
{
  "estado_analisis": "ANALIZADO" | "NO_ANALIZABLE",
  "motivo_no_analizable": "",
  "tipo_contrato_detectado": "alquiler" | "proveedor" | "laboral" | "otro",
  "resumen_ejecutivo": "2-3 frases en lenguaje llano: qué es el contrato y los riesgos principales.",
  "puntos": [
    {
      "id": "renovacion_automatica",
      "nombre": "Renovación automática / tácita reconducción",
      "critico": true,
      "estado": "cubierto" | "falta" | "riesgo",
      "nivel_riesgo": "ninguno" | "bajo" | "medio" | "alto",
      "cita_textual": "fragmento copiado literal del contrato, o cadena vacía si falta",
      "explicacion_llana": "explicación en lenguaje corriente, sin jerga"
    }
  ],
  "contadores": {
    "riesgo_alto": 0,
    "riesgo_medio": 0,
    "riesgo_bajo": 0,
    "faltan_criticos": 0,
    "faltan_no_criticos": 0,
    "cubiertos": 0
  },
  "semaforo_sugerido": "VERDE" | "AMBAR" | "ROJO",
  "informe_cuerpo": "texto del informe punto por punto (vacío si NO_ANALIZABLE)"
}

Devuelve SOLO ese JSON.
```

---

## Mapeos de Make usados aquí
- `{{4.tipo_contrato}}` — variable del paso 4 (deducida del asunto o `auto`).
- `{{4.texto_contrato}}` — texto del contrato extraído por OCR (Mistral, paso 3) y fijado en el paso 4.

> El campo `puntos[]` debe tener **una entrada por cada punto** de la checklist aplicable (BASE +
> extensión). El ejemplo del esquema muestra solo una entrada por brevedad.
