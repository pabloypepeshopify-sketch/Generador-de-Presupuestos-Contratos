# 04 · Qué hacer si la IA no tiene datos suficientes (no inventar)

El sistema tiene **dos capas de defensa** para garantizar que nunca se genera un documento con
datos inventados.

## Capa 1 — Instrucción en el prompt (la IA se autolimita)
El *system prompt* obliga a la IA a:
- No inventar, suponer ni rellenar por defecto ningún dato ausente.
- Si falta un dato obligatorio o es ambiguo:
  - añadirlo a `campos_faltantes`,
  - poner `estado = "FALTAN_DATOS"`,
  - **no** generar `cuerpo_documento`, `partidas` ni totales.
- Solo poner `estado = "COMPLETO"` cuando dispone de todos los datos y reglas necesarias.

Ejemplo de salida en este caso: `prompts/ejemplo-salida-faltan-datos.json`.

## Capa 2 — Router en Make (el flujo se bloquea)
El **Router** (módulo 5 del escenario 1) enruta por `estado`:

```
estado = FALTAN_DATOS ──► NO se genera Doc/PDF, NO se contacta al cliente
                          └─► Email interno con lista de campos_faltantes
                          └─► Sheets: estado PENDIENTE_DATOS
estado = COMPLETO ───────► Continúa a Google Docs → PDF → aprobación
```

Filtro de cada ruta (ya configurado en el blueprint):
- Ruta "faltan datos": `{{4.estado}}` **Text: Equal to** `FALTAN_DATOS`
- Ruta "completo": `{{4.estado}}` **Text: Equal to** `COMPLETO`

## Capa 3 (opcional recomendada) — Validación previa en Make
Antes incluso de llamar a OpenAI puedes poner un **Filter** tras el webhook que compruebe que los
campos mínimos llegan informados, para ahorrar llamadas a la API:

```
Continuar solo si:
  cliente_email  existe  AND
  tipo_documento existe  AND
  (sector = reformas  →  tipo_reforma existe AND metros_cuadrados existe)
  (sector = legal     →  tipo_caso existe)
```
Si no se cumple, un módulo previo devuelve al formulario/usuario la petición de completar datos.

## Qué recibe el equipo cuando faltan datos
El email interno (módulo 6) incluye:
- La lista exacta de `campos_faltantes`.
- Las `notas_internas` de la IA (por qué no pudo continuar).
- El JSON original recibido, para poder pedir al cliente solo lo que falta.

## Flujo de recuperación
1. El equipo contacta al cliente y consigue el dato que falta.
2. Se vuelve a enviar el formulario / se reenvía el webhook con los datos completos.
3. Como `id_solicitud` se regenera, se crea una nueva fila; puedes marcar la antigua
   `PENDIENTE_DATOS` como resuelta manualmente, o (mejora) usar *Update Row* buscando por email.

## Principio
> **Mejor pedir un dato que inventar uno.** Un presupuesto con un m² inventado o una cláusula
> legal supuesta genera más daño (y responsabilidad) que un pequeño retraso para confirmar el dato.
