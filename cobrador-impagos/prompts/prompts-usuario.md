# Prompts de usuario por ruta (Escenario 1)

El **system prompt** es el mismo en las 3 rutas. El **prompt de usuario** cambia la `FASE` y mapea
las columnas de la hoja por **índice base-0** (ver nota técnica al final).

> ⚠️ **Referencias por índice, no por nombre.** El módulo *Search Rows* creado por API/blueprint
> expone las columnas como `` {{1.`0`}} ``, `` {{1.`1`}} ``, … (índice base-0 entre backticks),
> **no** por nombre de cabecera (`{{1.cliente_email}}` devuelve vacío). Mapa de columnas:
> `` `0` ``=id_factura · `` `1` ``=cliente_nombre · `` `2` ``=cliente_email · `` `3` ``=cliente_telefono ·
> `` `4` ``=fecha_emision · `` `5` ``=importe · `` `6` ``=concepto · `` `7` ``=estado_pago ·
> `` `8` ``=fecha_ultimo_recordatorio · `` `9` ``=nivel_escalado · `` `10` ``=enlace_pago · `` `11` ``=notas.
> El número de fila para actualizar es `{{1.__ROW_NUMBER__}}`.

---

## Ruta AMABLE (módulo 6)

```text
FASE: AMABLE

Datos:
- Empresa que reclama (firma): REEMPLAZAR_NOMBRE_EMPRESA
- Cliente: {{1.`1`}}
- Nº de factura: {{1.`0`}}
- Concepto del servicio prestado: {{1.`6`}}
- Importe pendiente: {{formatNumber(1.`5`; 2; ","; ".")}} €
- Fecha de emisión: {{1.`4`}}
- Días de retraso: {{2.dias_impago}}
- Enlace de pago (vacío si no hay): {{1.`10`}}

Redacta el cuerpo HTML del email siguiendo la FASE.
```

## Ruta FIRME (módulo 9)

Idéntico al anterior cambiando la primera línea a:

```text
FASE: FIRME
```

## Ruta ESCALADO_INTERNO (módulo 12)

```text
FASE: ESCALADO_INTERNO

Este mensaje es INTERNO, para el responsable del negocio (no para el cliente).

Datos del caso:
- Cliente: {{1.`1`}} ({{1.`2`}} · {{1.`3`}})
- Nº de factura: {{1.`0`}}
- Concepto: {{1.`6`}}
- Importe pendiente: {{formatNumber(1.`5`; 2; ","; ".")}} €
- Fecha de emisión: {{1.`4`}}
- Días de retraso: {{2.dias_impago}}
- Recordatorios ya enviados automáticamente: amable y firme.

Redacta la nota interna de escalado siguiendo la FASE.
```
