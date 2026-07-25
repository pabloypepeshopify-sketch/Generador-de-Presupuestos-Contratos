# Auditor de Contratos — Detector de Cláusulas de Riesgo (Make.com + OpenAI)

Producto de automatización para **gestorías, inmobiliarias, constructoras y pymes** que firman
contratos de **alquiler, con proveedores o laborales** en España. Antes de firmar, un contrato llega
por email (fase pruebas: Gmail), se **extrae su texto (OCR si es escaneado)**, una **IA lo analiza
contra una checklist cerrada de riesgos**, se clasifica con un **semáforo (verde/ámbar/rojo)** y se
envía un **informe en PDF** al responsable junto con el contrato original.

**El sistema nunca decide ni aconseja firmar o no firmar: solo informa y señala riesgos para que
decida un humano.** Todo se construye **100 % en Make.com** (sin app propia), zona **EU
(eu1.make.com)**. La salida (Gmail) está aislada en un módulo para migrar a **WhatsApp/Twilio**.

> Es una **primera capa de detección automática, NO un dictamen jurídico**. Ver `docs/06-descargo-legal.md`.

---

## 🧭 Flujo en una imagen

```
Correo con contrato adjunto (Gmail)
        │
        ▼
[Watch] → [Iterator adjuntos] → [Drive Upload+OCR] → [Docs Export texto] → [Set vars: n_chars]
        │
        ▼
  ROUTER · GATE LEGIBILIDAD
    ├─ n_chars < 400 ─► ILEGIBLE → email "revisar a mano" + Sheets   (NUNCA llama a la IA)
    └─ n_chars ≥ 400 ─► [OpenAI checklist→JSON] → [Parse] → [Set semáforo]
                              │
                              ▼
                        ROUTER · RESULTADO
                          ├─ NO_ANALIZABLE ─► email "revisar" + Sheets   (sin informe)
                          └─ ANALIZADO ─► [Docs informe] → [PDF] → [Sheets] →
                                              ROUTER · SEMÁFORO
                                                ├─ 🟢 VERDE ─► email informe
                                                ├─ 🟡 ÁMBAR ─► email informe
                                                └─ 🔴 ROJO  ─► email informe + CC asesor legal
```

---

## 📦 Contenido

```
auditor-contratos/
  blueprints/
    auditor-contratos.blueprint.json     Escenario completo (importar en Make EU)
  prompts/
    system-prompt.md                     Prompt de sistema exacto del módulo OpenAI
    user-prompt-template.md              Prompt de usuario + checklist + esquema JSON
    ejemplo-salida-verde.json            Salida IA de ejemplo (semáforo VERDE)
    ejemplo-salida-rojo.json             Salida IA de ejemplo (semáforo ROJO)
    ejemplo-salida-no-analizable.json    Salida IA de ejemplo (revisión manual)
  plantillas/
    google-docs-informe-riesgos.md       Plantilla del informe + descargo legal fijo
  docs/
    01-arquitectura.md                   Arquitectura módulo por módulo
    02-checklist-riesgos.md              Checklist cerrada (BASE + alquiler/proveedor/laboral)
    03-semaforo-y-router.md              Cálculo del semáforo y su Router
    04-informe-y-trazabilidad.md         Plantilla del informe + columnas de Sheets/Airtable
    05-documento-ilegible.md             Qué pasa si no se puede leer (revisión manual)
    06-descargo-legal.md                 "Esto NO es asesoría legal" (dónde y cómo)
    07-checklist-post-importacion.md     Toda la configuración manual tras importar
    08-migracion-whatsapp.md             Cómo pasar de Gmail a WhatsApp/Twilio
```

---

## ✅ Respuesta a los 9 puntos solicitados

| # | Pedido | Dónde |
|---|--------|-------|
| 1 | Arquitectura completa del escenario, módulo por módulo | [`docs/01-arquitectura.md`](docs/01-arquitectura.md) |
| 2 | Checklist de riesgos exacta (cerrada, por tipo de contrato) | [`docs/02-checklist-riesgos.md`](docs/02-checklist-riesgos.md) |
| 3 | Prompt de sistema exacto del módulo OpenAI (JSON estructurado) | [`prompts/system-prompt.md`](prompts/system-prompt.md) · [`prompts/user-prompt-template.md`](prompts/user-prompt-template.md) |
| 4 | Cálculo del semáforo global y su implementación con Router | [`docs/03-semaforo-y-router.md`](docs/03-semaforo-y-router.md) |
| 5 | Plantilla del informe + estructura de Sheets/Airtable | [`plantillas/`](plantillas/) · [`docs/04-informe-y-trazabilidad.md`](docs/04-informe-y-trazabilidad.md) |
| 6 | Dejar claro que NO sustituye asesoría legal | [`docs/06-descargo-legal.md`](docs/06-descargo-legal.md) |
| 7 | Qué pasa si el documento no se puede leer (revisión manual) | [`docs/05-documento-ilegible.md`](docs/05-documento-ilegible.md) |
| 8 | JSON del blueprint (con partes a completar señaladas) | [`blueprints/auditor-contratos.blueprint.json`](blueprints/auditor-contratos.blueprint.json) |
| 9 | Checklist de configuración manual post-importación | [`docs/07-checklist-post-importacion.md`](docs/07-checklist-post-importacion.md) |

---

## 🚀 Puesta en marcha rápida

1. Lee `docs/07-checklist-post-importacion.md`.
2. Importa `blueprints/auditor-contratos.blueprint.json` en Make (zona EU).
3. Crea las **5 conexiones** (OpenAI, Gmail, Drive, Docs, Sheets) y reasígnalas en cada módulo.
4. Sustituye todos los `REEMPLAZAR_*` (carpetas Drive, plantilla, hoja, emails).
5. Pega el system + user prompt de `prompts/` en el módulo OpenAI (#9).
6. Prueba con un contrato con riesgo (→ ROJO), uno equilibrado (→ VERDE) y un escaneo basura (→ ILEGIBLE).

---

## ⚠️ Partes que NO se pueden pre-rellenar en el blueprint
Marcadas con `REEMPLAZAR_*` (strings) y `0` en `__IMTCONN__` (IDs de conexión):
- **Conexiones OAuth** (OpenAI, Gmail, Google Drive, Google Docs, Google Sheets) — **5 conexiones**.
- **IDs de Drive**: carpeta de trabajo, carpeta de informes.
- **ID de la plantilla** del informe (Google Docs) y **ID del Google Sheet**.
- **Emails** del responsable y del asesor legal (CC en ROJO), y **nombre de empresa**.
- **Carpeta/etiqueta y filtro** del módulo de disparo Watch emails.

Detalle y pasos exactos en [`docs/07-checklist-post-importacion.md`](docs/07-checklist-post-importacion.md).

---

## 🔒 Notas de responsabilidad
- El informe es una **primera capa de detección**, **no asesoramiento jurídico**. El descargo va como
  **texto fijo** en la plantilla, en el email y reforzado en el prompt (ver `docs/06-descargo-legal.md`).
- La IA **no inventa cláusulas**: cita textual del contrato o marca `falta`. Si el documento no se
  puede leer, **revisión manual**, nunca un informe con huecos (ver `docs/05-documento-ilegible.md`).
- El semáforo **no aprueba ni rechaza**: colorea, prioriza y (en rojo) añade al asesor legal en copia.
  La decisión de firmar es **siempre humana**.
