# Prompt de usuario — Módulo OpenAI (Make)

> Pega este texto en el campo **User** del módulo *OpenAI → Create a Chat Completion*.
> `{{1}}` es el bundle completo del webhook (los datos del formulario/WhatsApp).
> Las **reglas de negocio** puedes pegarlas fijas aquí, o mapearlas desde un **Data Store** de
> Make / una pestaña de Google Sheets para poder editarlas sin tocar el escenario.

```
### DATOS DE LA SOLICITUD (JSON de entrada)
{{1}}

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
