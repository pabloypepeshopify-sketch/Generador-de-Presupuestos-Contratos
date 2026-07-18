# 03 · Validación / confianza: "procesada OK" vs "revisión humana"

El objetivo del producto: **nunca contabilizar en automático una factura dudosa**. Ante la duda, se marca
para revisión y se avisa. Hay **dos redes de seguridad**.

## Red 1 — la IA (módulo 4)
El *system prompt* obliga a devolver `estado = OK` **solo si**:
1. Están todos los campos críticos: `proveedor_nombre`, `numero_factura`, `fecha_factura`,
   `base_imponible`, `cuota_iva`, `total`.
2. La aritmética cuadra: `base_imponible + cuota_iva = total` (tolerancia 0,02 €).
3. `confianza ≥ 0.85`.

En cualquier otro caso devuelve `estado = REVISION` con `motivo_revision` y `campos_faltantes`.

## Red 2 — Make recalcula (módulo 7, Set Variables)
No nos fiamos solo de que la IA se autoevalúe. En el módulo 7 se calculan dos banderas **con datos ya
parseados**:

| Variable | Fórmula | Sirve para |
|----------|---------|------------|
| `dup` | `{{if(6.exist; "SI"; "NO")}}` | ¿Ya estaba registrada? (dedup) |
| `descuadre` | `{{if(abs((5.base_imponible + 5.cuota_iva) - 5.total) > 0.02; "SI"; "NO")}}` | Recomprobar la suma en Make, no solo en la IA |

## El Router (módulo 8) — 3 rutas con filtro

### Ruta OK → contabiliza (módulos 9 + 10)
Se dispara **solo si se cumplen las 4 condiciones (AND):**
```
{{7.dup}}        = NO
{{5.estado}}     = OK
{{5.confianza}}  ≥ 0.85
{{7.descuadre}}  = NO
```
→ Añade fila `PROCESADA` en Sheets **y** marca la factura en el Data Store.

### Ruta REVISIÓN → marca + avisa (módulos 11 + 12)
Se dispara si **no es duplicada** y se cumple **cualquiera** de estos (OR):
```
( {{7.dup}}=NO  Y  {{5.estado}}=REVISION )
( {{7.dup}}=NO  Y  {{5.confianza}} < 0.85 )
( {{7.dup}}=NO  Y  {{7.descuadre}}=SI )
```
→ Añade fila `REVISION_MANUAL` con el motivo **y** envía email de aviso. **No** toca el Data Store.

### Ruta DUPLICADA → traza sin contabilizar (módulo 13)
```
{{7.dup}} = SI
```
→ Añade fila `DUPLICADA` (auditoría). No vuelve a contar el gasto ni reenvía nada.

## Tabla de decisión

| exist | estado IA | confianza | descuadre | Resultado |
|:-----:|:---------:|:---------:|:---------:|-----------|
| sí | — | — | — | **DUPLICADA** |
| no | OK | ≥0.85 | no | **PROCESADA** ✅ |
| no | OK | <0.85 | no | REVISIÓN (confianza baja) |
| no | OK | ≥0.85 | sí | REVISIÓN (no cuadra la suma) |
| no | REVISION | — | — | REVISIÓN (lo dijo la IA) |

## Cómo ajustar el umbral
- Subir el listón (menos automático, más seguro): cambiar `0.85` por `0.90` en los filtros de las rutas
  OK y REVISIÓN, y en la regla 8 del *system prompt*.
- Bajarlo para clientes con facturas muy limpias: `0.80`.
- Endurecer la aritmética: bajar la tolerancia de `0.02` en la variable `descuadre` (módulo 7) y en la
  regla 5 del prompt.
