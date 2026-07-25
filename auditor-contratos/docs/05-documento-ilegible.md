# 05 · Qué pasa si el documento no se puede leer bien

Principio no negociable: **antes que un informe con huecos rellenados por la IA, una revisión
manual.** El sistema tiene **dos redes de seguridad** independientes; si cualquiera salta, el
contrato se marca para revisión humana y **no se genera informe**.

```
OCR de Mistral (paso 3) ─► texto_contrato, n_chars (paso 4)
        │
        ▼
RED 1 · GATE POR CARACTERES (Router 5, ANTES de la IA)
        n_chars < MIN_CHARS  ─► ILEGIBLE_REVISION_MANUAL  (ni siquiera se llama a OpenAI)
        │
        ▼ (n_chars >= MIN_CHARS)
OpenAI analiza (paso 8)
        │
        ▼
RED 2 · AUTODECLARACIÓN DE LA IA (Router 11, DESPUÉS de la IA)
        estado_analisis = NO_ANALIZABLE  ─► NO_ANALIZABLE_IA  (no se genera informe)
```

## Red 1 — Gate por número de caracteres (Router 5)
En el paso 4 se calcula `n_chars = {{length(join(map(3.data.pages; "markdown"); " "))}}` (longitud
del texto que devolvió el OCR de Mistral). El Router 5 bifurca:

| Ruta | Filtro | Acción |
|------|--------|--------|
| **ILEGIBLE** | `{{4.n_chars}}` **number:less** `MIN_CHARS` | Email al responsable "documento no legible, revisar a mano" (adjunta el original) + Sheets `ILEGIBLE_REVISION_MANUAL`. **No se llama a OpenAI.** |
| **ANALIZABLE** | `{{4.n_chars}}` **number:greaterorequal** `MIN_CHARS` | Continúa a OpenAI. |

- **`MIN_CHARS` recomendado: 400.** Un contrato real supera de sobra ese umbral; un PDF que solo
  produce 20 caracteres es un escaneo fallido o un formato no soportado. Ajusta según tus documentos.
- Cubre: PDF de imagen sin texto ni OCR aprovechable, archivos corruptos, adjuntos que no eran el
  contrato.

## Red 2 — La IA se autodeclara no analizable (Router 11)
Aunque el texto supere `MIN_CHARS`, puede ser un galimatías de OCR o estar cortado. El system prompt
obliga a la IA a poner `estado_analisis = "NO_ANALIZABLE"` y explicar el motivo, **dejando `puntos`
vacío y sin generar `informe_cuerpo`**, en vez de inventar. El Router 11 la envía a revisión manual
(`NO_ANALIZABLE_IA`) sin generar informe.

## Qué recibe el responsable en ambos casos
Email claro, con el **contrato original adjunto**, indicando:
- Que **no se pudo auditar automáticamente** y por qué (`n_chars` bajo / motivo de la IA).
- Que debe **revisarlo manualmente** o reenviar una copia de mejor calidad / en otro formato.
- Y una fila en la hoja con el estado correspondiente para no perder la trazabilidad.

## Formatos no soportados
El **filtro "Solo PDF" del paso 3** (condición sobre `{{2.mimeType}}` = contiene `pdf`, o
`{{lower(2.filename)}}` contiene `.pdf`) solo deja pasar PDF al OCR. Cualquier otro adjunto
(imágenes sueltas, .xlsx, .txt, .zip, y por defecto .docx) se ignora. Para admitir **.docx** hay que
añadir la rama Drive-convert descrita en `01-arquitectura.md`. Lo importante: **nunca** se fuerza un
análisis sobre algo que no es un contrato PDF legible.

> Regla que también vive en el prompt (`prompts/system-prompt.md`, sección "CONTROL DE
> LEGIBILIDAD"): *ante la duda razonable, NO_ANALIZABLE.* Es preferible una revisión manual a un
> informe con huecos.
