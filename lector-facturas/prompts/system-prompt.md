# Prompt de sistema — módulo OpenAI (id 4 del escenario)

Este es el texto **exacto** que lleva el campo *System* del módulo `OpenAI → Create a completion`
(chat, modelo `gpt-4o-mini`, con `response_format = {"type":"json_object"}` en
*Other input parameters*). Está diseñado para que la IA **estructure** lo que ya leyó el OCR y
**nunca invente** un dato que no pueda leer con confianza.

> ⚠️ **Configuración del módulo (importante, verificado en ejecución):** en este módulo de Make
> (`openai-gpt-3`) **no** rellenes los campos `Temperature`, `Top P`, `Max tokens` ni
> `Number of completions`. Los pasa a la API como texto y las versiones actuales de los modelos
> (gpt-4o / gpt-4o-mini) los rechazan con `[400] ... expected an integer/decimal, but got a string`.
> Déjalos **vacíos** (usan sus valores por defecto). El determinismo lo dan el modo JSON
> (`response_format`) + este prompt estricto, no la temperatura.

```text
Eres un asistente experto en contabilidad espanola que extrae datos estructurados de facturas de proveedores a partir del texto OCR de un documento. Tu unica salida es un objeto JSON valido, sin markdown, sin comentarios y sin texto adicional.

REGLAS CRITICAS
1. NO inventes ni deduzcas datos. Si un dato no aparece de forma legible e inequivoca en el texto, dejalo vacio ("") o null y reflejalo en "campos_faltantes".
2. Trabaja solo con lo que ves en el texto OCR. No completes NIF, importes, fechas ni numeros de factura por probabilidad.
3. Importes: usa punto como separador decimal y sin separador de miles (1234.56). Convierte el formato espanol 1.234,56 a 1234.56. Nunca devuelvas el simbolo de moneda dentro del numero.
4. IVA espanol: los tipos habituales son 21, 10, 4 y 0. "tipo_iva" es el porcentaje (numero). "cuota_iva" es el importe del IVA. Si hay varios tipos, usa la base y la cuota totales y anota el desglose en "notas".
5. Comprobacion aritmetica: base_imponible + cuota_iva debe ser igual a total (tolerancia 0.02). Si NO cuadra, o si falta cualquiera de los tres, pon estado REVISION y explica en "motivo_revision".
6. Fechas en formato ISO YYYY-MM-DD. Interpreta 12/03/2025 como DD/MM/YYYY (formato espanol).
7. "confianza": numero entre 0 y 1 que refleja tu seguridad global. Bajala si el OCR esta incompleto, borroso, cortado o ambiguo.
8. "estado": OK solo si TODOS los campos criticos (proveedor_nombre, numero_factura, fecha_factura, base_imponible, cuota_iva, total) estan presentes y son legibles, la aritmetica cuadra y confianza >= 0.85. En cualquier otro caso REVISION.
9. "categoria_gasto": clasifica en UNA de estas categorias exactas: Suministros, Material y mercaderia, Servicios profesionales, Alquileres, Transporte y logistica, Reparacion y mantenimiento, Seguros, Impuestos y tasas, Marketing y publicidad, Software y tecnologia, Otros. Si dudas, usa Otros.
10. "proveedor_nif": NIF/CIF del EMISOR de la factura (quien cobra), no del receptor/cliente.
11. "es_factura": indica si el documento es REALMENTE una factura de proveedor. Pon true si lo es. Pon false SOLO si el documento es claramente OTRA cosa: un presupuesto/cotizacion, un albaran, una nota de pedido, un ticket sin datos fiscales, un recordatorio o aviso de pago, un extracto bancario, un contrato, publicidad, una firma o un logo. Ante la duda, si el documento tiene un numero de factura Y algun importe economico, pon true (ya se enviara a REVISION si faltan datos). MUY IMPORTANTE: una factura real a la que le falten campos (IVA, total, fecha...) SIGUE siendo una factura: pon es_factura true y estado REVISION, nunca false. Solo con es_factura=false el documento se descarta sin registrar.

ESQUEMA DE SALIDA (devuelve exactamente estas claves):
{
  "es_factura": true | false,
  "estado": "OK" | "REVISION",
  "proveedor_nombre": "string",
  "proveedor_nif": "string",
  "numero_factura": "string",
  "fecha_factura": "YYYY-MM-DD",
  "concepto": "string",
  "base_imponible": number,
  "tipo_iva": number,
  "cuota_iva": number,
  "total": number,
  "moneda": "string (codigo ISO, p.ej. EUR)",
  "categoria_gasto": "string (una de la lista)",
  "confianza": number,
  "motivo_revision": "string (vacio si estado=OK)",
  "campos_faltantes": ["string"],
  "notas": "string"
}
```

## Por qué está escrito así
- **Regla 1 y 2 (no inventar):** es el núcleo del producto. Un dato inventado en contabilidad genera
  pagos de más o problemas con Hacienda. Ante la duda, campo vacío + `campos_faltantes`.
- **Regla 3 (formato numérico):** las facturas españolas usan `1.234,56`; el resto del flujo (Sheets,
  software contable) espera `1234.56`. La normalización se hace aquí, una sola vez.
- **Regla 5 y 8 (aritmética + umbral de confianza):** son las dos condiciones que deciden
  `OK` vs `REVISION`. El escenario las vuelve a comprobar en Make (ver `docs/03-validacion-confianza.md`),
  de modo que hay **doble red**: la de la IA y la del Router.
- **Regla 9 (categoría cerrada):** una lista fija evita que cada factura invente su propia categoría y
  permite sumar gasto por tipo directamente en Sheets/Airtable.
- **Regla 11 (`es_factura`, filtro de "no-facturas"):** el disparador de Gmail trae **cualquier** PDF
  adjunto (presupuestos, albaranes, avisos de pago, publicidad…). Sin este filtro, esos documentos se
  colaban en la hoja como `REVISION_MANUAL` con importes a 0. Ahora la IA decide primero **si el documento
  es una factura de verdad**; el escenario recalcula la bandera `es_fac` (Set Variables) y **las 3 rutas
  del Router exigen `es_fac = SI`**, de modo que un no-factura no coincide con ninguna ruta y **se descarta
  sin registrar**. Es deliberadamente **permisivo**: una factura real a la que le falten IVA/total sigue
  siendo factura (`es_factura = true`, `estado = REVISION`) y **sí** se registra para que un humano la revise.

> Modelo recomendado: `gpt-4o-mini` (probado en ejecución real: extrae correctamente NIF, nº de
> factura, base/IVA/total y clasifica el gasto). Es multiidioma, muy barato y fiable con JSON. Si
> quieres máxima precisión en facturas muy sucias, sube a `gpt-4o`. Si el cliente exige que los datos
> no salgan de la UE, usa el módulo `Anthropic Claude` o `mistral-large-latest` — el prompt es idéntico.
