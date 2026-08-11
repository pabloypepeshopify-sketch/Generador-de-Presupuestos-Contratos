# Lector Automático de Facturas (Make.com + OCR + IA)

Producto de automatización para **gestorías, talleres y constructoras en España**. Vigila una bandeja de
correo, lee las **facturas PDF** de proveedores con **OCR**, las **estructura con IA** (proveedor, base,
IVA, total, fecha, nº de factura), las **valida** y las vuelca en **Google Sheets/Airtable** como registro
contable. Lo que no puede leer con seguridad **no lo inventa**: lo marca para **revisión humana** y avisa.

Todo **100 % en Make.com** (sin app propia). Fase de pruebas por **Gmail**; disparador ampliable a
**Google Drive** sin tocar el resto del flujo.

> Elimina la tarea administrativa más odiada y con más errores (importes mal transcritos, IVA mal
> aplicado). Ahorro típico: **6–10 h/semana**.

---

## ✅ Estado: YA DESPLEGADO y CABLEADO en Make
Escenario creado en la cuenta (EU) con conexiones (Gmail, OpenAI, Google) y prompts cableados, **Data
Store** de antiduplicados, **hoja de Google Sheets ya creada y conectada** (escritura probada) y **email
de avisos puesto**. Falta **1 solo dato** para activarlo: la **API key de Mistral** (el OCR). Detalle en
[`docs/06-despliegue-en-make.md`](docs/06-despliegue-en-make.md).

| Recurso | ID |
|---------|----|
| Escenario · *Lector Automatico de Facturas · OCR + IA* | **6613926** |
| Data Store · *Lector Facturas · Dedup* | **149074** |
| Google Sheet de destino (pestaña `Untitled`) | `1qtZNixNsExhuDdXBVP3FcnNHu-xfyu4hul97ot2CFUE` |
| Carpeta · *Lector de Facturas* | 370160 |

---

## 🧭 Flujo en una imagen
```
Email con PDF (Gmail)
   │  Watch → List adjuntos → OCR(Mistral) → OpenAI(¿es factura? + JSON) → Parse
   ▼
¿Es factura? ─NO→ se descarta (no se registra nada)
   │ SI
¿Duplicada? (Data Store) → Set banderas → ROUTER
   ├── OK        → Sheets: PROCESADA        + marca en Data Store
   ├── REVISIÓN  → Sheets: REVISION_MANUAL  + email de aviso
   └── DUPLICADA → Sheets: DUPLICADA        (traza, no recontabiliza)
```

---

## 📦 Contenido
```
blueprints/
  lector-facturas.blueprint.json     Escenario completo (plantilla, para reimportar en otra cuenta)
prompts/
  system-prompt.md                   Prompt de sistema exacto (no inventa, JSON estricto)
  user-prompt-template.md            Prompt de usuario + mapeos
  ejemplo-salida-ok.json             Salida IA de ejemplo (OK)
  ejemplo-salida-revision.json       Salida IA de ejemplo (REVISIÓN)
docs/
  01-arquitectura.md                 Módulo por módulo
  02-ocr-comparativa.md              Mistral vs Google Vision vs otros + cómo conectar el OCR
  03-validacion-confianza.md         OK vs revisión: lógica del Router (doble red)
  04-google-sheets-airtable.md       Columnas de la hoja / tabla de destino
  05-dedup.md                        Antiduplicados con Data Store
  06-despliegue-en-make.md           Lo ya creado + activación + ampliación a Drive
  07-checklist-post-importacion.md   Todo lo que se configura a mano (activar / revender)
ejemplos/
  factura-demo.md                    Factura de prueba para la demo
```

## ✅ Respuesta a los 8 puntos pedidos
| # | Pedido | Dónde |
|---|--------|-------|
| 1 | Arquitectura completa módulo por módulo | [`docs/01-arquitectura.md`](docs/01-arquitectura.md) |
| 2 | Qué OCR usar + comparativa + cómo conectarlo | [`docs/02-ocr-comparativa.md`](docs/02-ocr-comparativa.md) |
| 3 | Prompt de sistema exacto + esquema JSON | [`prompts/system-prompt.md`](prompts/system-prompt.md) |
| 4 | Lógica de validación/confianza con Router | [`docs/03-validacion-confianza.md`](docs/03-validacion-confianza.md) |
| 5 | Estructura de columnas Sheets/Airtable | [`docs/04-google-sheets-airtable.md`](docs/04-google-sheets-airtable.md) |
| 6 | Evitar duplicados (proveedor + nº factura) | [`docs/05-dedup.md`](docs/05-dedup.md) |
| 7 | JSON del blueprint (con partes a completar señaladas) | [`blueprints/`](blueprints/) |
| 8 | Checklist de configuración manual | [`docs/07-checklist-post-importacion.md`](docs/07-checklist-post-importacion.md) |

---

## ✅ Verificado en ejecución real
El "cerebro" del escenario (IA → validación → deduplicación → Router) se probó de extremo a extremo con
un escenario de pruebas gemelo, inyectando el texto OCR de facturas reales. Resultados confirmados leyendo
los Data Stores:

| Caso de prueba | Ruta esperada | Resultado |
|----------------|---------------|-----------|
| Factura limpia (base+IVA=total) | OK / PROCESADA | ✅ registrada + marcada en dedup |
| Misma factura reenviada (×varias) | DUPLICADA | ✅ no se recontabiliza (dedup queda en 1 registro) |
| Factura con descuadre (base+IVA≠total) | REVISIÓN | ✅ marcada para revisión |
| Factura con total ilegible | REVISIÓN | ✅ marcada para revisión |

La IA extrajo correctamente NIF, nº de factura, base/IVA/total y categoría; la clave de deduplicación
(`nif|numero`) se construyó bien y las 3 rutas del Router se dispararon como se diseñó.

**Probado de extremo a extremo con una factura PDF real** (PDF → Mistral OCR → IA → Google Sheets):
la fila entró como `PROCESADA` con extracción 100% correcta — proveedor, CIF `B12345678`,
nº `FA-2025-04821`, base **842,50**, IVA **176,93**, total **1019,43**, categoría `Suministros`.

Durante las pruebas se detectaron y corrigieron **varias incompatibilidades del entorno Make** (todas ya
aplicadas en el escenario y en el blueprint):
- Módulo OpenAI: envía `temperature`/`max_tokens` como texto → la API los rechaza. Solución: `gpt-4o-mini`
  y esos campos vacíos.
- Módulo Google Sheets: `valueInputOption` (`USER_ENTERED`) es obligatorio.
- Respuesta del OCR: hay que leer el texto con `join(map(3.data.pages; "markdown"); " ")` — la notación
  `pages[].markdown` dentro de `join()` devuelve vacío.
- La IA a veces envuelve el JSON en ```` ```json ````; el módulo *Parse JSON* limpia esas comillas antes
  de parsear.
- La API key de Mistral debe llevar el prefijo **`Bearer `** en el header `Authorization`.
- **El trigger *Watch emails* de Gmail NO entrega el binario del adjunto** (solo `hasAttachment`). Hay que
  añadir el módulo ***List email attachments and media*** (`Return file data = Yes`) para descargar el PDF —
  verificado en real (`mimeType = application/pdf`, datos presentes).

## 🧠 Qué hace la IA (y qué NO)
- **Filtra los que NO son facturas** (`es_factura`): Gmail trae cualquier PDF adjunto (presupuestos,
  albaranes, avisos de pago, publicidad…). La IA decide primero si el documento es una **factura de verdad**;
  si no lo es, se **descarta sin registrarse**. Es permisivo: una factura real con campos faltantes sí pasa
  (va a REVISIÓN). Así la hoja deja de llenarse de `REVISION_MANUAL` con importes a 0 de PDFs que ni eran facturas.
- **Estructura** el texto del OCR en campos limpios y normalizados (formato español → decimal con punto).
- **Clasifica** el gasto en una categoría cerrada (para sumar por tipo).
- **Detecta anomalías**: descuadre `base + IVA ≠ total`, campos ilegibles, confianza baja.
- **No inventa**: si no lee un dato con seguridad, lo deja vacío y manda la factura a revisión.

## 🔒 Responsabilidad
Las facturas dudosas **nunca** se contabilizan en automático: se marcan `REVISION_MANUAL` y se avisa por
email. El objetivo es reducir errores contables (pagos de más, problemas con Hacienda), no sustituir el
criterio del gestor.

## 🔮 Ampliaciones futuras
- Disparador por **Google Drive** además de Gmail.
- **Export directo** a Contasol / A3 / Sage vía HTTP tras la ruta OK.
- **Conciliación** con extractos bancarios y **alertas de gasto anómalo** por proveedor.
- **Resumen diario** agregado (Aggregator) de facturas procesadas / pendientes de revisión.

## 💶 Datos comerciales (orientativos)
Instalación 800–1.500 € · Cuota 150–250 €/mes · Dificultad 6/10 · Construcción 10–14 h.
