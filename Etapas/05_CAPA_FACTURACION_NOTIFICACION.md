# 05 — Capa de Facturación y Notificación

## 1. Objetivo de la capa

Implementar la generación de recibos PDF en dos formatos y simular el envío de información de consumo por email, SMS o WhatsApp.

## 2. Responsabilidades

La capa debe:

1. Recibir contrato, carnet o número de medidor.
2. Obtener consumo mensual.
3. Obtener categoría tarifaria.
4. Calcular monto a cobrar.
5. Generar recibo PDF media carta.
6. Generar recibo PDF rollo térmico.
7. Simular envío por email, SMS o WhatsApp.
8. Registrar la notificación simulada.

## 3. Flujo general

```txt
Usuario solicita recibo
        │
        ▼
Backend busca contrato/medidor
        │
        ▼
Obtiene consumo mensual
        │
        ▼
Calcula tarifa y monto
        │
        ▼
Genera PDF media carta
        │
        ▼
Genera PDF rollo térmico
        │
        ▼
Devuelve rutas de descarga
        │
        ▼
Simula envío de mensaje
```

## 4. Entrada requerida

```json
{
  "formato": "email | sms | whatsapp",
  "identificador": "65412354",
  "tipoIdentificador": "contrato | carnet | medidor",
  "periodo": "2025-05"
}
```

## 5. Datos necesarios para facturar

```txt
numero_contrato
nombre_cliente
carnet_o_nit
direccion
distrito
zona
numero_medidor
categoria_tarifaria
periodo
consumo_m3
monto_bs
fecha_emision
```

## 6. Cálculo general del monto

La lógica debe implementarse en un servicio separado:

```txt
services/factura_service.go
```

Pseudocódigo:

```txt
si consumo_m3 <= consumo_minimo:
    monto = cargo_fijo
si consumo_m3 > consumo_minimo:
    excedente = consumo_m3 - consumo_minimo
    monto = cargo_fijo + excedente * precio_m3
```

Si el tarifario tiene rangos más detallados, se debe adaptar la función por tramos.

## 7. Recibo media carta

### Características

```txt
Tamaño: media carta
Uso: entrega digital o impresión formal
Contenido: tabla de detalle, datos del cliente, consumo y monto
```

### Estructura visual

```txt
┌─────────────────────────────────────┐
│ SEMAPA                              │
│ Recibo de consumo de agua potable   │
├─────────────────────────────────────┤
│ Cliente:                            │
│ Contrato:                           │
│ Carnet/NIT:                         │
│ Dirección:                          │
│ Distrito/Zona:                      │
├─────────────────────────────────────┤
│ Periodo:                            │
│ Medidor:                            │
│ Categoría:                          │
│ Consumo:                            │
│ Total a pagar:                      │
├─────────────────────────────────────┤
│ Mensaje institucional               │
│ QR opcional                         │
└─────────────────────────────────────┘
```

## 8. Recibo rollo térmico

### Características

```txt
Ancho: 80mm
Alto: dinámico
Uso: kiosco o punto de atención
Estilo: ticket térmico
```

### Estructura visual

```txt
SEMAPA
RECIBO DE AGUA
------------------------------
Cliente: Sr. Mendoza
Contrato: 65412354
Periodo: 2025-05
Medidor: SN-0001
Categoría: R2
------------------------------
Consumo: 1234 m³
Total: Bs 1234.00
------------------------------
Gracias por su pago puntual
```

## 9. Rutas de almacenamiento

```txt
recibos/
├── media_carta/
│   └── 65412354-2025-05.pdf
└── rollo_termico/
    └── 65412354-2025-05.pdf
```

## 10. Endpoint generar factura

```txt
POST /api/factura/generar
```

Request:

```json
{
  "numeroContrato": "65412354",
  "periodo": "2025-05"
}
```

Response:

```json
{
  "estado": "generado",
  "numeroContrato": "65412354",
  "periodo": "2025-05",
  "consumoM3": 1234.0,
  "montoBs": 1234.0,
  "pdfMediaCarta": "/recibos/media_carta/65412354-2025-05.pdf",
  "pdfRollo": "/recibos/rollo_termico/65412354-2025-05.pdf"
}
```

## 11. Endpoint simular notificación

```txt
POST /api/notificacion/simular
```

Request:

```json
{
  "formato": "whatsapp",
  "identificador": "65412354",
  "tipoIdentificador": "contrato",
  "periodo": "2025-05"
}
```

Response:

```json
{
  "estado": "simulado",
  "formato": "whatsapp",
  "destinatario": "+59170000000",
  "mensaje": "Sr. Mendoza, SEMAPA le recuerda que su recibo de consumo de agua es de Bs 1234 por el período 2025-05. Usted ha consumido 1234 m³ de agua.",
  "adjuntos": []
}
```

## 12. Mensaje SMS/WhatsApp

```txt
Sr. Mendoza, SEMAPA le recuerda que su recibo de consumo de agua es de Bs 1234 por el período 2025-05. Usted ha consumido 1234 m³ de agua.
```

## 13. Mensaje email

Body:

```txt
Sr. Mendoza, SEMAPA le recuerda que su recibo de consumo de agua es de Bs 1234 por el período 2025-05. Usted ha consumido 1234 m³ de agua.

Adjuntamos su recibo en formato media carta y rollo térmico.
```

Adjuntos:

```txt
recibo_media_carta.pdf
recibo_rollo_termico.pdf
```

## 14. Registro de notificaciones

Tabla sugerida:

```sql
CREATE TABLE IF NOT EXISTS notificaciones_por_contrato (
  numero_contrato text,
  periodo text,
  fecha_hora timestamp,
  formato text,
  identificador text,
  estado text,
  mensaje text,
  PRIMARY KEY ((numero_contrato, periodo), fecha_hora)
) WITH CLUSTERING ORDER BY (fecha_hora DESC);
```

## 15. Casos de prueba

| Caso | Resultado esperado |
|---|---|
| Contrato válido | Genera ambos PDFs. |
| Contrato inexistente | Devuelve error 404. |
| Periodo sin consumo | Devuelve mensaje sin datos. |
| Formato WhatsApp | Devuelve mensaje texto. |
| Formato SMS | Devuelve mensaje texto. |
| Formato email | Devuelve mensaje + PDFs. |

## 16. Checklist

```txt
[ ] Servicio de cálculo tarifario creado.
[ ] Endpoint de factura creado.
[ ] PDF media carta generado.
[ ] PDF rollo térmico generado.
[ ] PDFs guardados correctamente.
[ ] Endpoint de notificación creado.
[ ] Mensaje WhatsApp/SMS generado.
[ ] Email simulado con adjuntos.
[ ] Registro de notificación guardado.
[ ] 5 juegos de recibos generados para demo.
```
