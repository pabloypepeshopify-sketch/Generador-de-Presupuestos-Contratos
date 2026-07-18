# 07 · Checklist de configuración manual

Dos escenarios de uso: **(A)** activar el que ya está creado en esta cuenta, o **(B)** importar el
blueprint desde cero en la cuenta de un cliente nuevo (venta).

---

## A) Activar el escenario ya creado (esta cuenta)
- [ ] Abrir escenario **6613926** (carpeta *Lector de Facturas*).
- [ ] **Módulo 3 (OCR):** pegar la API key de Mistral en el header `Authorization`
      (`Bearer <key>`), sustituyendo `REEMPLAZAR_MISTRAL_API_KEY`.
- [ ] Crear el **Google Sheet** con pestaña `Facturas` + cabeceras (`docs/04`). Copiar su ID.
- [ ] **Módulos 9, 11 y 13:** pegar el Spreadsheet ID (sustituir `REEMPLAZAR_SPREADSHEET_ID`) y confirmar
      que *Sheet* = `Facturas`.
- [ ] **Módulo 12:** poner el email real de avisos (sustituir `REEMPLAZAR_EMAIL_REVISION@...`).
- [ ] Verificar que el **Data Store** de los módulos 6 y 10 es `Lector Facturas · Dedup` (149074).
- [ ] **Run once** + enviar una factura PDF de prueba al Gmail.
- [ ] Revisar la fila creada en `Facturas`; ajustar mapeos si hiciera falta.
- [ ] Activar (toggle **ON**).

---

## B) Importar desde cero en la cuenta de un cliente (reventa)
Usa `blueprints/lector-facturas.blueprint.json` (todas las conexiones a `0` y `REEMPLAZAR_*`).

### 1. Conexiones (OAuth / API)
- [ ] **Gmail** (módulos 1 y 12): conectar la cuenta de correo donde llegan las facturas.
- [ ] **OpenAI** (módulo 4): pegar la API key de OpenAI del cliente (o la tuya, si lo revendes con tu cuenta).
- [ ] **Google Sheets** (módulos 9, 11, 13): conectar la cuenta de Google del cliente.
- [ ] **Mistral** (módulo 3): **no es una conexión de Make**, es un header. Pegar `Bearer <key>` en
      `Authorization`.

### 2. Data Store (antiduplicados)
- [ ] Crear un **Data Store** nuevo con una data structure con los campos de `docs/05-dedup.md`
      (proveedor_nombre, proveedor_nif, numero_factura, fecha_factura, total, fecha_proceso, email_origen).
- [ ] Seleccionarlo en los módulos **6** (Check existence) y **10** (Add a record).

### 3. Google Sheet de destino
- [ ] Crear el Sheet, pestaña `Facturas`, cabeceras A→S (`docs/04-google-sheets-airtable.md`).
- [ ] Pegar el **Spreadsheet ID** en módulos 9, 11, 13.

### 4. Datos del cliente
- [ ] Email de avisos de revisión (módulo 12).
- [ ] Ajustar el filtro Gmail del módulo 1 si las facturas llegan a una etiqueta concreta
      (p. ej. `label:facturas has:attachment filename:pdf`).
- [ ] (Opcional) Ajustar el umbral de confianza `0.85` en los filtros del Router y en el prompt (`docs/03`).

### 5. Prueba y entrega
- [ ] **Run once** con una factura real del cliente.
- [ ] Comprobar: fila `PROCESADA` correcta, una factura "difícil" cae en `REVISION_MANUAL` + email.
- [ ] Reenviar la misma factura → debe caer en `DUPLICADA`.
- [ ] Activar y programar (15 min recomendado; bajar a 5 min si el cliente quiere casi-tiempo-real).

---

## Partes que NO se pueden pre-rellenar en el blueprint
| Marcador en el JSON | Qué es | Dónde |
|---------------------|--------|-------|
| `"__IMTCONN__": 0` | Conexiones OAuth (Gmail, OpenAI, Google) | módulos 1, 4, 9, 11, 12, 13 |
| `"datastore": 0` | ID del Data Store de dedup | módulos 6, 10 |
| `REEMPLAZAR_MISTRAL_API_KEY` | API key de Mistral (header) | módulo 3 |
| `REEMPLAZAR_SPREADSHEET_ID` | ID del Google Sheet | módulos 9, 11, 13 |
| `REEMPLAZAR_EMAIL_REVISION@tu-cliente.com` | Email de avisos | módulo 12 |

> En la cuenta actual el escenario ya viene con las conexiones y el Data Store cableados con IDs reales
> (ver `docs/06`); los `REEMPLAZAR_*` / `0` solo aparecen en el blueprint **plantilla** del repo, pensado
> para reimportar en otras cuentas.
