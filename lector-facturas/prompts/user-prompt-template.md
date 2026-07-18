# Prompt de usuario — módulo OpenAI (id 4 del escenario)

Texto **exacto** del campo *User* del módulo OpenAI. Inyecta el texto que devolvió el OCR (Mistral)
y algo de contexto del email. El OCR ya hizo el trabajo de "leer"; aquí la IA solo **estructura**.

```text
Extrae los datos de la siguiente factura de proveedor.

METADATOS DEL EMAIL (contexto, no forman parte de la factura salvo que esta los confirme):
- Remitente: {{1.fromEmail}}
- Asunto: {{1.subject}}
- Fichero adjunto: {{2.fileName}}
- Fecha de recepcion: {{1.internalDate}}

TEXTO OCR DE LA FACTURA (Mistral OCR, formato markdown; las tablas conservan el desglose de partidas e IVA):
"""
{{join(3.data.pages[].markdown; " ")}}
"""

Devuelve unicamente el JSON con el esquema indicado.
```

## Mapeos usados
| Referencia | De dónde sale |
|------------|---------------|
| `{{1.fromEmail}}` `{{1.subject}}` `{{1.internalDate}}` | Módulo 1 · Gmail *Watch emails* |
| `{{2.fileName}}` | Módulo 2 · Iterator (adjunto actual) |
| `{{join(3.data.pages[].markdown; " ")}}` | Módulo 3 · HTTP a Mistral OCR → une el markdown de todas las páginas |

> El remitente y el asunto se pasan **solo como contexto**. El prompt de sistema (regla 2) prohíbe usarlos
> para rellenar campos de la factura salvo que el propio documento los confirme. Esto evita, por ejemplo,
> tomar el email del que reenvía la factura como si fuera el proveedor.
