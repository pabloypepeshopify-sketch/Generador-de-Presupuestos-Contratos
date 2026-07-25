# 03 · Semáforo global y su implementación con Router

El semáforo global (**VERDE / ÁMBAR / ROJO**) **no lo decide la IA**: la IA aporta los `contadores`
por punto y **Make lo calcula de forma determinista**. Así la clasificación es auditable,
reproducible y no depende del "criterio" del modelo en cada ejecución.

## Reglas de decisión (orden de prioridad)

```
1.  estado_analisis = NO_ANALIZABLE ............................► (no hay semáforo) → REVISIÓN MANUAL
2.  contadores.riesgo_alto      >= 1 ...........................► ROJO
3.  contadores.riesgo_medio     >= 1  OR  faltan_criticos >= 1 .► ÁMBAR
4.  en cualquier otro caso .....................................► VERDE
```

| Semáforo | Significado (aparece en el informe) | Acción del sistema |
|:--------:|-------------------------------------|--------------------|
| 🟢 **VERDE** | Sin riesgos relevantes detectados. | Informe al responsable. |
| 🟡 **ÁMBAR** | Revisar antes de firmar: hay puntos medios o faltan cláusulas críticas. | Informe al responsable. |
| 🔴 **ROJO** | Riesgo alto: no firmar sin asesoría legal. | Informe al responsable **+ CC al asesor legal**. |

> En **todos** los casos analizables se envía el informe a un humano. El semáforo **nunca** aprueba
> ni rechaza: solo colorea, prioriza y (en rojo) añade al asesor legal en copia.

## Implementación en Make (numeración del blueprint validado)

### Paso 10 — Calcular `semaforo` (Tools → Set variable)
Una sola variable con `if()` anidado sobre los `contadores` del *Parse JSON* (módulo 9). Es la
**fuente única de verdad** que consumen el informe (paso 14), la hoja (paso 16) y el Router 17:

```
Nombre:  semaforo
Valor:   {{if(9.estado_analisis = "NO_ANALIZABLE"; "MANUAL";
           if(9.contadores.riesgo_alto > 0; "ROJO";
           if(9.contadores.riesgo_medio > 0; "AMBAR";
           if(9.contadores.faltan_criticos > 0; "AMBAR"; "VERDE"))))}}
```

En el mismo módulo se fija también `semaforo_texto` (el literal que se imprime en el informe), con la
misma lógica de `if()` anidado sobre `{{9.contadores...}}` (VERDE→"SIN RIESGOS RELEVANTES",
AMBAR→"REVISAR ANTES DE FIRMAR", ROJO→"RIESGO ALTO - NO FIRMAR SIN ASESORIA LEGAL",
MANUAL→"REVISION MANUAL"). *(Se usa `if()` en lugar de auto-referenciar la variable `semaforo` dentro
del mismo módulo, para no depender del orden de evaluación.)*

### Paso 11 — Router "Resultado del análisis" (2 rutas)
Filtra por `estado_analisis` (no por el semáforo todavía):

| Ruta | Filtro | Qué hace |
|------|--------|----------|
| NO_ANALIZABLE | `{{9.estado_analisis}}` **text:equal** `NO_ANALIZABLE` | Email de revisión manual + Sheets `NO_ANALIZABLE_IA`. **No genera informe.** |
| ANALIZADO | `{{9.estado_analisis}}` **text:equal** `ANALIZADO` | Genera Doc → PDF → Sheets → Router 17. |

### Paso 17 — Router "Semáforo" (3 rutas)
Dentro de la ruta ANALIZADO, **después** de generar el informe y registrar la fila (para no
duplicar módulos pesados), este Router solo diferencia la **notificación**. Filtra por la variable
`{{10.semaforo}}`:

| Ruta | Filtro | Notificación |
|------|--------|--------------|
| VERDE | `{{10.semaforo}}` **text:equal** `VERDE` | Email verde: "sin riesgos relevantes". |
| ÁMBAR | `{{10.semaforo}}` **text:equal** `AMBAR` | Email ámbar: "revisar antes de firmar". |
| ROJO  | `{{10.semaforo}}` **text:equal** `ROJO`  | Email rojo: "riesgo alto" **+ CC al asesor legal**. |

> Como la variable `semaforo` nunca vale `VERDE/AMBAR/ROJO` cuando el análisis es `NO_ANALIZABLE`
> (vale `MANUAL`, y esa rama ni siquiera llega al Router 17), las tres rutas cubren todos los casos
> analizables sin solapamiento.

## Por qué determinista y no "que lo diga la IA"
- **Reproducible:** el mismo contrato da siempre el mismo semáforo.
- **Auditable:** la regla vive en Make, a la vista, no en un texto generado.
- **Ajustable por negocio:** cambiar el umbral (p. ej. "faltar 2 críticos = ROJO") es editar el
  `if()`, no reentrenar ni re-prompt-ear nada.
- La IA solo se encarga de lo que hace bien: leer el texto, clasificar cada punto y contar.
