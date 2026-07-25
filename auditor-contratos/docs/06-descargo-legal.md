# 06 · Descargo de responsabilidad — "esto NO es asesoría legal"

El sistema deja explícito, en **tres sitios independientes**, que el informe es una primera capa de
detección y **no un dictamen jurídico**, y que **la decisión de firmar es siempre humana**.

## Dónde aparece (redundancia deliberada)

1. **En el informe PDF — texto FIJO de la plantilla.** No es una etiqueta que rellene la IA, sino
   texto escrito directamente en la plantilla de Google Docs (paso 14). La IA **no puede omitirlo,
   editarlo ni moverlo**. Ver `plantillas/google-docs-informe-riesgos.md`, bloque "AVISO IMPORTANTE".

2. **En el cuerpo del email** (pasos 18/19/20) — una línea antes del informe adjunto:
   > *Informe automático de detección de riesgos. NO es asesoramiento jurídico ni sustituye a un
   > abogado. La decisión de firmar es suya. Contrato original adjunto para su verificación.*

3. **En el propio prompt de la IA** (`prompts/system-prompt.md`, sección "LO QUE NUNCA HACES"): la
   IA tiene **prohibido** recomendar firmar/no firmar y dar su salida como dictamen jurídico. Así el
   contenido generado nunca contradice el descargo.

## Texto exacto del descargo (informe)

```
⚠️ AVISO IMPORTANTE — ESTO NO ES ASESORAMIENTO JURÍDICO

Este informe es una PRIMERA CAPA AUTOMÁTICA de detección de posibles cláusulas de riesgo,
generada por inteligencia artificial a partir del texto del contrato aportado. NO constituye
un dictamen jurídico ni sustituye la revisión por un abogado colegiado. El sistema NO decide
ni recomienda firmar o no firmar: la decisión es siempre del responsable. La IA puede omitir
cláusulas, malinterpretar el texto o no detectar riesgos. Antes de firmar cualquier contrato
con semáforo ÁMBAR o ROJO, consulte con un profesional del Derecho. La cita textual de cada
punto se ofrece para su verificación directa contra el contrato original, que se adjunta.
```

## Por qué así
- **Texto fijo, no generado:** una etiqueta `{{descargo}}` rellenada por la IA podría, en teoría,
  salir vacía o alterada. Escrito en la plantilla, siempre sale idéntico.
- **En cada punto se muestra la CITA TEXTUAL**, no solo la interpretación de la IA: el responsable
  puede contrastar cada afirmación contra el contrato original adjunto. El informe invita
  explícitamente a hacerlo.
- **Coherencia semáforo ↔ descargo:** en ámbar y rojo el descargo remite expresamente a consultar
  con un profesional antes de firmar; el sistema nunca cierra la decisión.
