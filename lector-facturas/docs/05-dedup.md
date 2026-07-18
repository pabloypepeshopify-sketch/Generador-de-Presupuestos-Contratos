# 05 · Evitar facturas duplicadas

Las facturas se reenvían: el proveedor la manda dos veces, alguien la reenvía a otra dirección, se
recibe copia por CC. Sin control, la misma factura entraría dos veces en la contabilidad.

## Clave de duplicado
Una factura es la misma si coinciden **proveedor + número de factura**. La clave se construye así
(módulos 6 y 7):

```
clave = lower( NIF_o_nombre_del_proveedor ) | lower( numero_factura )
```

En Make: `{{lower(ifempty(5.proveedor_nif; 5.proveedor_nombre))}}|{{lower(5.numero_factura)}}`

- Se usa el **NIF** como identificador preferente (es único e inequívoco). Si el OCR no pudo leer el NIF,
  se cae al **nombre** del proveedor.
- `lower()` normaliza mayúsculas/minúsculas para que `FA-2025-01` y `fa-2025-01` sean la misma.

## Mecanismo (Data Store `Lector Facturas · Dedup`)
1. **Módulo 6 — Check existence** (`datastore:ExistRecord`): consulta si esa `clave` ya existe.
   Devuelve `{{6.exist}}` = `true`/`false`. Es una búsqueda directa por clave (O(1)), no relee la hoja.
2. **Router:**
   - Si `exist = true` → ruta **DUPLICADA**: deja traza en Sheets y **no** contabiliza.
   - Si `exist = false` y la factura es válida → ruta **OK**, y el **módulo 10** hace
     `Add a record` con esa `clave`. A partir de ahí, cualquier reenvío se detecta.
3. Las facturas que van a **REVISIÓN no se guardan** en el Data Store: no están confirmadas, así que si se
   corrigen y se reenvían, se vuelven a evaluar.

## Estructura del Data Store (ya creada en la cuenta)
Data structure `Facturas procesadas (dedup)` → Data store `Lector Facturas · Dedup`:

| Campo | Tipo |
|-------|------|
| (key) | clave `nif|numero` |
| proveedor_nombre | text |
| proveedor_nif | text |
| numero_factura | text |
| fecha_factura | text |
| total | number |
| fecha_proceso | text |
| email_origen | text |

## Doble barrera (opcional, recomendable)
El `id_registro` de Sheets y el `mark as read` del trigger Gmail ya reducen reprocesos. El Data Store es
la barrera **fuerte y semántica**: aunque el mismo PDF llegue desde otra cuenta o meses después, si es el
mismo proveedor + número, se marca duplicado.

> Si un proveedor reutiliza numeración cada año (p. ej. `001/2024` y `001/2025`), asegúrate de que el
> número que emite incluye el año, o añade `{{year(5.fecha_factura)}}` a la clave en los módulos 6, 7 y 10.
