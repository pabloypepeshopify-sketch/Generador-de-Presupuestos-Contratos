# 03 · Lógica del Router y cálculo de días de impago

## 1) Cálculo de `dias_impago` (módulo Set Variables)

Se calcula **una vez por fila**, justo después de *Search Rows*:

```
dias_impago = {{floor((now - parseDate(1.`4`; "YYYY-MM-DD")) / 86400000)}}
hoy         = {{formatDate(now; "YYYY-MM-DD")}}
```

- `parseDate(1.`4`; "YYYY-MM-DD")` convierte `fecha_emision` (columna E) en fecha.
- `now - fecha` da la diferencia en **milisegundos**; `/ 86400000` la pasa a días; `floor()` la
  redondea hacia abajo → entero de días de retraso.
- `hoy` se usa para sellar `fecha_ultimo_recordatorio` y como guardia anti-duplicado.

## 2) Umbrales (configurables)

| Fase | Umbral por defecto |
|------|--------------------|
| AMABLE (recordatorio 1) | `dias_impago ≥ 7` |
| FIRME (recordatorio 2) | `dias_impago ≥ 15` |
| ESCALADO interno | `dias_impago ≥ 30` |

> Cambiar el umbral = editar el `b` de la condición `number:greaterorequal` en el filtro de la ruta.

## 3) Ramas del Router (filtros)

Cada ruta combina **antigüedad + nivel de escalado + email + guardia diaria**. Como el `nivel_escalado`
avanza 0→1→2→3, **solo una ruta encaja por fila y ejecución**, y cada fase se envía **una sola vez**.

| Ruta | Condiciones (todas AND) | Acción |
|------|--------------------------|--------|
| **Sin email** | `` {{1.`2`}} `` (email) `=` vacío | Aviso interno + `estado_pago = REVISION_MANUAL` |
| **AMABLE** | email ≠ vacío · `` `9` ``(nivel)`=0` · `dias ≥ 7` · `` `8` ``(últ. recordatorio)`≠ hoy` | IA amable → cliente · `nivel = 1` |
| **FIRME** | email ≠ vacío · `nivel = 1` · `dias ≥ 15` · `últ. recordatorio ≠ hoy` | IA firme → cliente · `nivel = 2` |
| **ESCALADO** | `nivel = 2` · `dias ≥ 30` · `últ. recordatorio ≠ hoy` | IA nota interna → responsable · `nivel = 3` |

Traducido a la interpretación **0–15 / 15–30 / +30 días** del enunciado: como la progresión está
**cerrada por `nivel_escalado`**, una factura recibe primero el amable, al día siguiente que cumpla
`≥15` el firme, y al cumplir `≥30` el escalado. Nunca salta de fase ni retrocede.

## 4) Evitar enviar el mismo recordatorio dos veces (el mismo día o cualquier día)

Doble barrera:

1. **`nivel_escalado`**: al enviar una fase se sube el nivel (1/2/3). El filtro de esa fase exige un
   nivel concreto (`=0`, `=1`, `=2`), así que **no puede repetirse**. Un impago solo avanza de fase.
2. **Guardia diaria `fecha_ultimo_recordatorio ≠ hoy`**: aunque el escenario se ejecute varias veces
   el mismo día (p. ej. una ejecución manual + el cron), como el primer envío sella
   `fecha_ultimo_recordatorio = hoy`, ningún otro envío se dispara para esa fila ese día.

Resultado combinado: **máximo un recordatorio por factura y día**, y **máximo un envío por fase** en
toda la vida de la factura.

## 5) Comportamiento verificado (prueba real en Make)

Con una factura de 35–37 días de antigüedad, en ejecuciones de días consecutivos:

- Día 1 → **AMABLE** (`nivel 0→1`, `fecha_ultimo_recordatorio` = ese día).
- Día 2 → **FIRME** (`nivel 1→2`). El amable **no** se repitió (guardia de nivel + fecha).
- Día 3 → **ESCALADO** interno (`nivel 2→3`).
- Día 4+ → **nada** (`nivel = 3` no encaja en ninguna ruta): secuencia detenida.
