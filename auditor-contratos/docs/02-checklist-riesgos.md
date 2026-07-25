# 02 · Checklist de riesgos que evalúa la IA (lista cerrada)

La IA **no analiza en abierto**: recorre una **lista cerrada de puntos** y, por cada uno, decide
`cubierto` / `falta` / `riesgo` con nivel de riesgo, cita textual y explicación llana. La lista se
compone de un **bloque BASE (común a todo contrato)** + una **extensión según el tipo** (alquiler /
proveedor / laboral). El `id` de cada punto es la clave que viaja en el JSON y en el informe.

> **Regla de oro:** si un punto **no aparece** en el contrato, la IA lo marca `falta` (no lo
> "supone"). Si aparece pero es desfavorable/abusivo, lo marca `riesgo`. Nunca inventa la cita.

## Puntos CRÍTICOS
Marcados con 🔴 abajo. Si **falta** uno crítico, eso ya empuja el semáforo al menos a **ÁMBAR** (ver
`03-semaforo-y-router.md`). Un `riesgo` de nivel `alto` en cualquier punto lleva a **ROJO**.

---

## A · Bloque BASE (todo contrato)

| id | Punto | Qué comprueba | Crítico |
|----|-------|----------------|:------:|
| `renovacion_automatica` | Renovación automática / tácita reconducción | ¿Se renueva solo? ¿Con qué preaviso para no renovar? Renovaciones automáticas con preavisos largos o permanencia encadenada. | 🔴 |
| `duracion_permanencia` | Duración y plazo de permanencia | Duración total, permanencia mínima obligatoria, penalización por salir antes. Permanencias desproporcionadas. | 🔴 |
| `penalizaciones` | Penalizaciones e indemnizaciones | Existencia y **proporcionalidad** de penalizaciones por incumplimiento/retraso/baja anticipada. Cláusulas penales desproporcionadas. | 🔴 |
| `resolucion` | Cláusula de resolución / desistimiento | ¿Cómo y por quién se puede terminar el contrato? Ausencia de vía de salida = riesgo. Resolución unilateral solo a favor de una parte. | 🔴 |
| `forma_pago` | Forma y condiciones de pago | Plazos de pago, intereses de demora, revisión/actualización de precios, anticipos. Condiciones leoninas (plazos >60 días, intereses abusivos). | 🔴 |
| `garantias` | Garantías, fianzas y avales | Fianzas, avales, retenciones, garantías personales exigidas. Garantías desproporcionadas a la obligación. | |
| `responsabilidad` | Responsabilidad y limitación de responsabilidad | Reparto de responsabilidad, límites/exclusiones, indemnidad. Exención total de responsabilidad de la otra parte. | |
| `confidencialidad_rgpd` | Confidencialidad y protección de datos | Deber de confidencialidad, tratamiento de datos, cumplimiento RGPD/LOPDGDD, encargado de tratamiento. | |
| `modificacion_unilateral` | Modificación unilateral de condiciones | ¿Puede una parte cambiar precio/condiciones sola? Modificación unilateral sin consentimiento = riesgo. | |
| `cesion_subcontratacion` | Cesión y subcontratación | ¿Pueden cederte a un tercero o subcontratar sin tu consentimiento? | |
| `jurisdiccion` | Jurisdicción y ley aplicable | Fuero/tribunal competente y ley aplicable. Sumisión a fuero lejano o extranjero desfavorable. | 🔴 |

---

## B · Extensión por tipo de contrato
La extensión se **añade** al bloque BASE. El `tipo_contrato` llega en el prompt (deducido del asunto
del email o `auto`; si es `auto`, la IA detecta el tipo y aplica la extensión correspondiente).

### B.1 · Alquiler (vivienda / local — LAU)
| id | Punto | Qué comprueba | Crítico |
|----|-------|----------------|:------:|
| `alq_duracion_prorroga` | Duración y prórroga (LAU) | Duración mínima legal, prórrogas obligatorias, preaviso de no renovación. | 🔴 |
| `alq_actualizacion_renta` | Actualización de renta | Índice de actualización (IPC/IRAV), límites legales vigentes, subidas fuera de índice. | 🔴 |
| `alq_fianza_garantias` | Fianza y garantías adicionales | Fianza legal (1–2 mensualidades) vs garantías adicionales exigidas por encima de lo permitido. | 🔴 |
| `alq_gastos_suministros` | Gastos y suministros | Reparto de IBI, comunidad, suministros; repercusiones no pactadas. | |
| `alq_obras_conservacion` | Obras y conservación | Quién asume reparaciones/obras; traslado indebido al arrendatario. | |
| `alq_desistimiento` | Desistimiento anticipado | Derecho a desistir y penalización asociada; proporcionalidad. | 🔴 |
| `alq_subarriendo` | Subarriendo y cesión | Prohibición o condiciones de subarriendo/cesión. | |

### B.2 · Proveedor / servicios
| id | Punto | Qué comprueba | Crítico |
|----|-------|----------------|:------:|
| `prov_precio_revision` | Precio y revisión de precios | Precio cerrado vs revisable; fórmulas de subida unilateral. | 🔴 |
| `prov_plazos_entrega` | Plazos de entrega y penalización por retraso | SLA/plazos y penalizaciones; su proporcionalidad y reciprocidad. | 🔴 |
| `prov_morosidad` | Pago y morosidad (Ley 3/2004) | Plazo de pago (máx. legal 60 días), intereses de demora, calendarios de pago leoninos. | 🔴 |
| `prov_garantia_sla` | Garantía / nivel de servicio | Garantía del producto/servicio, SLA, soporte, remedios ante fallo. | |
| `prov_exclusividad` | Exclusividad y no competencia | Cláusulas de exclusividad o no competencia que aten al cliente. | |
| `prov_propiedad_intelectual` | Propiedad intelectual y entregables | Titularidad de entregables, licencias, uso de la marca. | |
| `prov_duracion_prorroga` | Duración y prórroga automática | Renovación tácita con preavisos largos o permanencia encadenada. | 🔴 |

### B.3 · Laboral
| id | Punto | Qué comprueba | Crítico |
|----|-------|----------------|:------:|
| `lab_tipo_duracion` | Tipo de contrato y duración | Indefinido/temporal, causa de temporalidad, encadenamiento de contratos. | 🔴 |
| `lab_periodo_prueba` | Periodo de prueba | Duración del periodo de prueba frente a los límites del Estatuto de los Trabajadores/convenio. | 🔴 |
| `lab_jornada` | Jornada, horario y horas complementarias | Jornada, distribución irregular, horas complementarias en contratos a tiempo parcial. | |
| `lab_salario` | Salario y complementos | Salario vs convenio/SMI, complementos, cláusulas de "salario global" que absorban horas extra. | 🔴 |
| `lab_no_competencia` | Pacto de no competencia post-contractual | Validez: **compensación económica** adecuada y límites de duración (2 años técnicos/6 meses resto). Sin compensación = riesgo. | 🔴 |
| `lab_permanencia` | Pacto de permanencia | Permanencia por formación: proporcionalidad de la indemnización y duración (máx. 2 años). | 🔴 |
| `lab_exclusividad` | Plena dedicación / exclusividad | Exclusividad y su compensación; renuncia a pluriempleo. | |
| `lab_extincion_preaviso` | Extinción y preaviso | Causas de extinción, preavisos, cláusulas penales por baja voluntaria. | 🔴 |

---

## Cómo se pasa la checklist a la IA
La lista completa (con `id`, `nombre` y `critico`) va **incrustada en el mensaje de usuario** del
módulo OpenAI (ver `prompts/user-prompt-template.md`). Para editarla sin tocar el prompt puedes
externalizarla a un **Data Store de Make** o a una pestaña de la propia hoja y leerla con un módulo
*Search Rows* antes del paso 9 — pero para empezar, va en el prompt.

> Mantén la lista **cerrada**: añadir/quitar puntos es una decisión de negocio (y afecta a qué se
> considera "crítico" para el semáforo), no algo que decida la IA en cada ejecución.
