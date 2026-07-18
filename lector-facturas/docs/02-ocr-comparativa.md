# 02 · Qué OCR usar dentro de Make (comparativa) y cómo conectarlo

## Resumen de la decisión
**Se usa Mistral OCR vía el módulo HTTP** (`api.mistral.ai/v1/ocr`). Es el mejor equilibrio para facturas
españolas: OCR real sobre escaneos y fotos, conserva **tablas** (clave para leer bien base/IVA/total),
es barato y el proveedor es **europeo** (argumento de venta ante gestorías sensibles al RGPD).

## Comparativa

| Criterio | **Mistral OCR** (elegido) | Google Cloud Vision | Make AI Toolkit (`ai-tools`) | OpenAI GPT-4o directo |
|----------|---------------------------|---------------------|------------------------------|-----------------------|
| App nativa en Make | No → vía **HTTP** | No → vía **HTTP** | **Sí**, nativa | Sí (módulo OpenAI) |
| PDF multipágina | **Sí, nativo** | Requiere trocear/async | Solo texto embebido | Requiere convertir PDF→imagen |
| Escaneo / foto de móvil | **Sí (OCR real)** | Sí (OCR real) | **No** (no hace OCR de imagen) | Parcial (solo si es imagen) |
| Conserva tablas / layout | **Sí (markdown)** | Texto plano + boxes | Texto plano | Sí |
| Coste orientativo | ~1 $ / 1.000 págs | ~1,5 $ / 1.000 págs | Créditos Make | Tokens (más caro por doc) |
| Datos en UE | **Sí** | Configurable | Según Make | No garantizado |
| Esfuerzo de conexión | 1 API key (header) | API key + proyecto GCP | Ninguno | Ya conectado |

**Por qué no los otros como principal:**
- **Google Vision**: OCR excelente, pero para PDF hay que trocear o usar el modo asíncrono con bucket de
  GCS → más piezas que montar y mantener. Vale como alternativa si el cliente ya vive en Google Cloud.
- **Make AI Toolkit**: comodísimo (cero conexiones), pero **no hace OCR de imágenes**: solo extrae el texto
  ya embebido en el PDF. Una foto de una factura o un PDF escaneado saldría vacío. Sirve solo si el cliente
  garantiza PDFs "digitales" (los que emite un software de facturación).
- **OpenAI GPT-4o directo** (saltarse el OCR): funciona con imágenes sueltas, pero un PDF hay que
  rasterizarlo antes, y la lectura de escaneos es menos fiable que un OCR dedicado.

## Cómo está conectado en el escenario (módulo 3)
Módulo **HTTP → Make a request** (`http:MakeRequest`):

- **URL:** `https://api.mistral.ai/v1/ocr`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <TU_API_KEY_DE_MISTRAL>`  ← en el blueprint es `REEMPLAZAR_MISTRAL_API_KEY`
- **Body type:** `Raw` / `application/json` (JSON string):

```json
{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "document_url",
    "document_url": "data:{{2.contentType}};base64,{{base64(2.data)}}"
  },
  "include_image_base64": false
}
```

- **Parse response:** `Yes` → la salida queda mapeable como `{{3.data.pages[].markdown}}`, `{{3.data.usage_info}}`.

### Filtro "Solo PDF" (entrada del módulo 3)
Antes de gastar una llamada de OCR, el enlace que entra al módulo 3 filtra los adjuntos que **no** son PDF
(evita procesar logos de firma o imágenes inline):

```
{{2.contentType}}      contiene   pdf      (OR)
{{lower(2.fileName)}}  contiene   .pdf
```

## Dónde se obtiene la API key de Mistral
1. Crear cuenta en `console.mistral.ai`.
2. Sección **API Keys → Create new key**.
3. Pegar la clave en el header `Authorization` del módulo 3 (ver `docs/07-checklist-post-importacion.md`).

> Para trocear costes: `mistral-ocr-latest` cobra por página. Con el filtro "Solo PDF" y la
> deduplicación (módulo 6), no se paga OCR por adjuntos irrelevantes ni por facturas repetidas.
