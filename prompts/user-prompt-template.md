# Prompt de usuario — Módulo OpenAI (Make)

> Pega este texto en el campo **User** del módulo *OpenAI → Generate a completion*.
> Las **reglas de negocio** puedes pegarlas fijas aquí, o mapearlas desde un **Data Store** de
> Make / una pestaña de Google Sheets para poder editarlas sin tocar el escenario.
>
> ⚠️ **IMPORTANTE (probado en real):** NO uses `{{1}}` (el bundle completo del webhook) — Make no
> lo serializa a JSON legible y la IA cree que faltan todos los datos. **Mapea cada campo por
> separado** con `{{1.nombre_campo}}`, como en el bloque siguiente. Ajusta la lista de campos a los
> que envíe tu formulario.

```
### DATOS DE LA SOLICITUD
tipo_documento: {{1.tipo_documento}}
sector: {{1.sector}}
canal: {{1.canal}}
cliente_nombre: {{1.cliente_nombre}}
cliente_email: {{1.cliente_email}}
cliente_telefono: {{1.cliente_telefono}}
cliente_direccion: {{1.cliente_direccion}}
tipo_reforma: {{1.tipo_reforma}}
metros_cuadrados: {{1.metros_cuadrados}}
tipo_acabado: {{1.tipo_acabado}}
materiales: {{1.materiales}}
detalles_adicionales: {{1.detalles_adicionales}}
plazo_deseado: {{1.plazo_deseado}}
tipo_caso: {{1.tipo_caso}}
cuantia_reclamada: {{1.cuantia_reclamada}}
contraparte: {{1.contraparte}}
descripcion_caso: {{1.descripcion_caso}}
urgencia: {{1.urgencia}}

### REGLAS DE NEGOCIO / PRECIOS APLICABLES
{{ Pega aquí tus reglas, o mapea desde Data Store / Sheets. Ejemplo resumido: }}
- Reforma integral vivienda: 450 €/m² (acabado estándar), 650 €/m² (acabado premium).
- Reforma de baño completo: 4.800 € (hasta 5 m²), +180 €/m² adicional.
- Reforma de cocina completa: 6.200 € (hasta 8 m²), +210 €/m² adicional.
- Alicatado/solado: 38 €/m². Pintura: 9 €/m². Fontanería (punto): 95 €/ud.
- Gestión de licencias y proyecto: 6 % sobre base imponible (partida aparte).
- IVA: 21 % general; 10 % en rehabilitación de vivienda con antigüedad > 2 años (marcar en notas).
- Condiciones de pago por defecto: 40 % a la firma, 30 % a mitad de obra, 30 % a la entrega.
- Validez de la oferta: 30 días.
(LEGAL) Honorarios por tipo de caso: reclamación cantidad 900 €; despido 1.200 €;
  divorcio mutuo acuerdo 1.100 €; arrendamientos 800 €. Provisión de fondos: 40 %.

### ESQUEMA DE SALIDA OBLIGATORIO (devuelve exactamente estas claves)
{
  "estado": "COMPLETO | FALTAN_DATOS",
  "campos_faltantes": [],
  "notas_internas": "",
  "tipo_documento": "presupuesto | contrato",
  "cliente_nombre": "",
  "cliente_email": "",
  "cliente_telefono": "",
  "cliente_direccion": "",
  "proyecto_titulo": "",
  "proyecto_descripcion": "",
  "fecha_documento": "DD/MM/YYYY",
  "validez_dias": 30,
  "partidas": [
    {"concepto": "", "unidad": "", "cantidad": 0, "precio_unitario": 0, "importe": 0}
  ],
  "base_imponible": 0,
  "iva_porcentaje": 21,
  "iva_importe": 0,
  "total": 0,
  "condiciones_pago": "",
  "plazo_ejecucion": "",
  "clausulas": [{"titulo": "", "texto": ""}],
  "cuerpo_documento": ""
}

Si "estado" = "FALTAN_DATOS", rellena solo "estado", "campos_faltantes" y "notas_internas";
deja el resto de campos vacíos o a 0.
```
