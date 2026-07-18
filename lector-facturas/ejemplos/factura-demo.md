# Factura de demo (para probar sin cliente delante)

Para la demo lo ideal es **una factura PDF real**. Si no tienes una a mano, crea un PDF con este texto
(vale con exportar a PDF desde Google Docs / Word) y envíalo por email a la cuenta vigilada.

```
                                         FACTURA

Suministros Eléctricos García S.L.            Nº factura: FA-2025-04821
CIF: B12345678                                Fecha: 03/11/2025
C/ Industria 44, 28906 Getafe (Madrid)

Cliente: Instalaciones Pérez S.L. — CIF: B87654321

--------------------------------------------------------------------
Concepto                                  Cantidad   Precio      Importe
--------------------------------------------------------------------
Cable RZ1-K 3x2,5 (rollo 100m)                 3      78,00      234,00
Magnetotérmico 2P 25A                         10      12,50      125,00
Canaleta 40x40 (barra 2m)                     25      11,70      292,50
Pequeño material                               1      191,00     191,00
--------------------------------------------------------------------
                                          Base imponible:          842,50
                                          IVA (21%):               176,93
                                          TOTAL:                 1.019,43 EUR
--------------------------------------------------------------------
Forma de pago: transferencia 30 días
```

**Resultado esperado:** ruta **OK** → fila `PROCESADA` en la hoja `Facturas` con
`base_imponible = 842.50`, `cuota_iva = 176.93`, `total = 1019.43`, `categoria_gasto = Material y mercadería`.

Para probar la ruta de **REVISIÓN**, edita el total a `1.059,43` (crea un descuadre): la IA/Make lo
detectarán y la factura caerá en `REVISION_MANUAL` con aviso por email.

Para probar **DUPLICADA**, envía dos veces la misma factura correcta: la segunda cae en `DUPLICADA`.
