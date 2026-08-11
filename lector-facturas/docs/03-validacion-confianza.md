# 03 · Validación / confianza: "procesada OK" vs "revisión humana"

El objetivo del producto: **nunca contabilizar en automático una factura dudosa**. Ante la duda, se marca
para revisión y se avisa. Hay **tres redes de seguridad**.

## Red 0 — ¿es siquiera una factura? (`es_factura`, módulo 4)
Gmail entrega **cualquier** PDF adjunto: presupuestos, albaranes, avisos de pago, publicidad, etc. Antes de
validar nada, la IA decide `es_factura` (`true/false`). El módulo 7 lo traduce a la bandera `es_fac`
(`SI/NO`) y **las 3 rutas del Router exigen `es_fac = SI`**. Si el documento no es una factura, **no coincide
con ninguna ruta y se descarta sin registrarse** en la hoja.

Es un filtro **permisivo a propósito**: si el documento tiene nº de factura y algún importe, la IA lo deja
pasar aunque le falten campos (irá a REVISIÓN, no se pierde). Solo se descartan los documentos que **no son
factura de verdad**. Así se evita el problema de que la hoja se llene de `REVISION_MANUAL` con importes a 0
procedentes de PDFs que ni siquiera eran facturas.

## Red 1 — la IA (módulo 4)
El *system prompt* obliga a devolver `estado = OK` **solo si**:
1. Están todos los campos críticos: `proveedor_nombre`, `numero_factura`, `fecha_factura`,
   `base_imponible`, `cuota_iva`, `total`.
2. La aritmética cuadra: `base_imponible + cuota_iva = total` (tolerancia 0,02 €).
3. `confianza ≥ 0.85`.

En cualquier otro caso devuelve `estado = REVISION` con `motivo_revision` y `campos_faltantes`.

## Red 2 — Make recalcula (módulo 7, Set Variables)
No nos fiamos solo de que la IA se autoevalúe. En el módulo 7 se calculan las banderas **con datos ya
parseados**:

| Variable | Fórmula | Sirve para |
|----------|---------|------------|
| `es_fac` | `{{if(5.es_factura; "SI"; "NO")}}` | ¿El documento es una factura? (si no, se descarta) |
| `dup` | `{{if(6.exist; "SI"; "NO")}}` | ¿Ya estaba registrada? (dedup) |
| `descuadre` | `{{if(abs((5.base_imponible + 5.cuota_iva) - 5.total) > 0.02; "SI"; "NO")}}` | Recomprobar la suma en Make, no solo en la IA |

## El Router (módulo 8) — 3 rutas con filtro

> **Todas las rutas empiezan por `{{7.es_fac}} = SI`.** Si el documento no es una factura, ninguna ruta
> hace match y el flujo termina sin escribir nada.

### Ruta OK → contabiliza (módulos 9 + 10)
Se dispara **solo si se cumplen las 5 condiciones (AND):**
```
{{7.es_fac}}     = SI
{{7.dup}}        = NO
{{5.estado}}     = OK
{{5.confianza}}  ≥ 0.85
{{7.descuadre}}  = NO
```
→ Añade fila `PROCESADA` en Sheets **y** marca la factura en el Data Store.

### Ruta REVISIÓN → marca + avisa (módulos 11 + 12)
Se dispara si **es factura**, **no es duplicada** y se cumple **cualquiera** de estos (OR):
```
( {{7.es_fac}}=SI  Y  {{7.dup}}=NO  Y  {{5.estado}}=REVISION )
( {{7.es_fac}}=SI  Y  {{7.dup}}=NO  Y  {{5.confianza}} < 0.85 )
( {{7.es_fac}}=SI  Y  {{7.dup}}=NO  Y  {{7.descuadre}}=SI )
```
→ Añade fila `REVISION_MANUAL` con el motivo **y** envía email de aviso. **No** toca el Data Store.

### Ruta DUPLICADA → traza sin contabilizar (módulo 13)
```
{{7.es_fac}} = SI  Y  {{7.dup}} = SI
```
→ Añade fila `DUPLICADA` (auditoría). No vuelve a contar el gasto ni reenvía nada.

## Tabla de decisión

| es_factura | exist | estado IA | confianza | descuadre | Resultado |
|:----------:|:-----:|:---------:|:---------:|:---------:|-----------|
| **no** | — | — | — | — | **DESCARTADA** (no se registra) |
| sí | sí | — | — | — | **DUPLICADA** |
| sí | no | OK | ≥0.85 | no | **PROCESADA** ✅ |
| sí | no | OK | <0.85 | no | REVISIÓN (confianza baja) |
| sí | no | OK | ≥0.85 | sí | REVISIÓN (no cuadra la suma) |
| sí | no | REVISION | — | — | REVISIÓN (lo dijo la IA) |

## Cómo ajustar el umbral
- Subir el listón (menos automático, más seguro): cambiar `0.85` por `0.90` en los filtros de las rutas
  OK y REVISIÓN, y en la regla 8 del *system prompt*.
- Bajarlo para clientes con facturas muy limpias: `0.80`.
- Endurecer la aritmética: bajar la tolerancia de `0.02` en la variable `descuadre` (módulo 7) y en la
  regla 5 del prompt.
