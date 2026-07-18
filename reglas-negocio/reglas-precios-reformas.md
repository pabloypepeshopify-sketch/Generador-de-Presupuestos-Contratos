# Reglas de negocio — Precios y cláusulas (ejemplo editable)

> Estas reglas son las que la IA aplica para calcular las partidas. **Personalízalas con tus
> precios reales.** Tienes dos formas de inyectarlas en el escenario:
>
> 1. **Pegadas en el prompt de usuario** (rápido, MVP). Ver `prompts/user-prompt-template.md`.
> 2. **En un Data Store de Make o pestaña "Reglas" de Google Sheets** (recomendado a medio plazo):
>    así editas precios sin abrir el escenario. Añade un módulo *Data Store → Get a record* o
>    *Google Sheets → Get a Cell/Search Rows* antes de OpenAI y mapea su salida al prompt.

---

## 1. Reformas / construcción

### Partidas por m² o por unidad
| Concepto                                   | Precio        | Unidad |
|--------------------------------------------|---------------|--------|
| Reforma integral vivienda (estándar)       | 450,00        | €/m²   |
| Reforma integral vivienda (premium)        | 650,00        | €/m²   |
| Reforma de baño completo (hasta 5 m²)      | 4.800,00      | € fijo |
| Baño — m² adicional sobre 5 m²             | 180,00        | €/m²   |
| Reforma de cocina completa (hasta 8 m²)    | 6.200,00      | € fijo |
| Cocina — m² adicional sobre 8 m²           | 210,00        | €/m²   |
| Alicatado / solado                         | 38,00         | €/m²   |
| Pintura                                    | 9,00          | €/m²   |
| Punto de fontanería                        | 95,00         | €/ud   |
| Punto eléctrico                            | 45,00         | €/ud   |

### Partidas porcentuales
| Concepto                            | Regla                                  |
|-------------------------------------|----------------------------------------|
| Gestión de proyecto / dirección     | 6 % sobre base imponible (partida aparte) |
| Gestión de licencias municipales    | Excluida por defecto (se presupuesta aparte) |

### IVA
- **21 %** general.
- **10 %** en obras de rehabilitación/renovación de vivienda de particular con antigüedad > 2 años
  (art. 91.Uno.2.10º LIVA). La IA solo lo aplica si el dato consta; si no, aplica 21 % y lo anota
  en `notas_internas`.

### Condiciones comerciales por defecto
- **Pago:** 40 % a la firma · 30 % a mitad de obra · 30 % a la entrega.
- **Validez de la oferta:** 30 días naturales.
- **Garantía:** 1 año sobre mano de obra.
- **Exclusiones estándar:** elementos ocultos, imprevistos estructurales, licencias.

---

## 2. Legal (honorarios por tipo de caso)

| Tipo de caso                        | Honorarios base | Provisión de fondos |
|-------------------------------------|-----------------|---------------------|
| Reclamación de cantidad             | 900,00 €        | 40 %                |
| Despido                             | 1.200,00 €      | 40 %                |
| Divorcio de mutuo acuerdo           | 1.100,00 €      | 40 %                |
| Arrendamientos (desahucio/reclamación) | 800,00 €     | 40 %                |
| Consulta / dictamen puntual         | 150,00 €        | 100 % anticipado    |

- **IVA legal:** 21 %.
- Cláusulas obligatorias: objeto del encargo, alcance y límites, confidencialidad, RGPD/LOPDGDD,
  jurisdicción, desistimiento.

---

## 3. Reglas de "no invención"
- Si una partida solicitada **no figura** en esta tabla → la IA la marca como **campo faltante**,
  no la estima.
- Si faltan m², tipo de acabado o tipo de caso → **FALTAN_DATOS**.
- El revisor humano puede añadir partidas manualmente en el Google Doc antes de aprobar.
