# 02 · Estructura de Google Sheets (seguimiento)

Crea un Google Sheet llamado, por ejemplo, **`Presupuestos - Seguimiento`** con una pestaña
(`sheetId`) llamada **`Seguimiento`**. La **fila 1 son cabeceras** (el módulo usa
`includesHeaders = true`, así puedes mapear por nombre de columna).

## Columnas (fila 1 = cabeceras)

| Col | Cabecera            | Contenido                                             | Escrito por |
|:---:|---------------------|-------------------------------------------------------|-------------|
| A   | `id_solicitud`      | Clave única (fecha+email). Une todo el flujo.         | Esc.1 #7/#12 |
| B   | `fecha_recepcion`   | Fecha/hora de entrada de la solicitud.                | Esc.1 |
| C   | `cliente_nombre`    | Nombre del cliente.                                   | Esc.1 |
| D   | `cliente_email`     | Email de contacto.                                    | Esc.1 |
| E   | `tipo_documento`    | `presupuesto` / `contrato`.                           | Esc.1 |
| F   | `proyecto_titulo`   | Título/resumen del proyecto o caso.                   | Esc.1 |
| G   | `importe_total`     | Total del documento (€). Vacío si faltan datos.       | Esc.1 |
| H   | `estado`            | Ver estados abajo.                                    | Esc.1 y Esc.2 |
| I   | `canal`             | `formulario` / `whatsapp`.                            | Esc.1 |
| J   | `enlace_pdf`        | URL del PDF en Drive.                                 | Esc.1 |
| K   | `fecha_envio`       | Fecha/hora de envío al cliente.                       | Esc.2 |
| L   | `notas`             | Notas internas de la IA o campos faltantes.           | Esc.1 |

### Fila de cabeceras lista para pegar (fila 1)
```
id_solicitud	fecha_recepcion	cliente_nombre	cliente_email	tipo_documento	proyecto_titulo	importe_total	estado	canal	enlace_pdf	fecha_envio	notas
```
> (separadas por TAB — pégalas en A1 y se reparten en A1:L1)

## Ciclo de estados (columna H)

```
PENDIENTE_DATOS ─────► (el equipo pide datos, relanza) ─────► PENDIENTE_APROBACION
PENDIENTE_APROBACION ─┬─► ENVIADO      (revisor aprueba → cliente recibe PDF)
                      └─► RECHAZADO    (revisor rechaza → editar/relanzar)
```

| Estado                 | Significado |
|------------------------|-------------|
| `PENDIENTE_DATOS`      | La IA marcó `FALTAN_DATOS`. No se generó documento. |
| `PENDIENTE_APROBACION` | Documento generado, esperando revisión humana. |
| `ENVIADO`              | Aprobado y enviado al cliente. |
| `RECHAZADO`            | Revisor lo descartó. |

## Índices de columna en los blueprints
Los módulos *Add/Update Row* mapean por **índice base 0**: `0`=A, `1`=B, … `11`=L. Si reordenas
columnas, ajusta el mapeo `values` en los blueprints.

## Enganche con seguimiento de no respondidos (idea 2)
Un tercer escenario programado (*Google Sheets → Search Rows* con filtro `estado = ENVIADO` y
`fecha_envio` > N días sin respuesta) permitirá enviar recordatorios automáticos. Esta hoja ya está
preparada para ello (columnas `estado` y `fecha_envio`).
