# 03 — Capa Backend: Go API

## 1. Objetivo de la capa

Implementar una API REST en Go que conecte con Cassandra, ejecute consultas estratégicas, entregue datos al frontend, genere recibos PDF y simule notificaciones.

## 2. Responsabilidades

La capa backend debe:

1. Conectarse a Cassandra.
2. Exponer endpoints REST.
3. Ejecutar consultas estratégicas.
4. Servir datos para dashboards.
5. Calcular consumo mensual y montos.
6. Generar recibos PDF.
7. Simular mensajes por WhatsApp, SMS o email.
8. Devolver respuestas JSON limpias.

## 3. Estructura sugerida

```txt
backend-go/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── db/
│   │   ├── cassandra.go
│   │   └── statements.go
│   ├── models/
│   │   ├── dashboard.go
│   │   ├── factura.go
│   │   ├── lectura.go
│   │   └── consulta.go
│   ├── repositories/
│   │   ├── dashboard_repository.go
│   │   ├── consulta_repository.go
│   │   ├── factura_repository.go
│   │   └── medidor_repository.go
│   ├── services/
│   │   ├── dashboard_service.go
│   │   ├── consulta_service.go
│   │   ├── factura_service.go
│   │   ├── pdf_service.go
│   │   └── notificacion_service.go
│   ├── handlers/
│   │   ├── health_handler.go
│   │   ├── dashboard_handler.go
│   │   ├── consulta_handler.go
│   │   ├── factura_handler.go
│   │   └── notificacion_handler.go
│   └── routes/
│       └── routes.go
├── recibos/
│   ├── media_carta/
│   └── rollo_termico/
├── go.mod
├── go.sum
└── Dockerfile
```

## 4. Variables de entorno

```env
APP_PORT=8080
CASSANDRA_HOST=localhost
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=semapa
PDF_OUTPUT_DIR=./recibos
FRONTEND_ORIGIN=http://localhost:5173
```

## 5. Dependencias sugeridas

```txt
github.com/apache/cassandra-gocql-driver/v2
github.com/gin-gonic/gin
github.com/joho/godotenv
github.com/google/uuid
```

Alternativa HTTP:

```txt
net/http nativo
chi router
fiber
gin
```

Para clase, `gin` o `chi` simplifican rutas.

## 6. Conexión Cassandra

Archivo sugerido:

```txt
internal/db/cassandra.go
```

Responsabilidad:

```txt
Crear cluster.
Configurar keyspace.
Crear sesión.
Cerrar conexión.
Manejar errores.
```

## 7. Capas internas

### 7.1 Handler

Recibe HTTP request y devuelve HTTP response.

Ejemplo:

```txt
GET /api/dashboard/resumen
```

### 7.2 Service

Contiene lógica de negocio.

Ejemplo:

```txt
Calcular porcentaje de medidores fuera de servicio.
Calcular exceso de consumo.
Generar mensaje de recibo.
```

### 7.3 Repository

Ejecuta consultas contra Cassandra.

Ejemplo:

```txt
SELECT * FROM resumen_operacional_mes WHERE periodo = ?
```

## 8. Endpoints generales

### 8.1 Salud

```txt
GET /health
```

Respuesta:

```json
{
  "status": "ok",
  "database": "connected",
  "service": "semapa-backend"
}
```

## 9. Endpoints dashboard operacional

```txt
GET /api/operacional/resumen?periodo=2025-05
GET /api/operacional/consumo-distrito?periodo=2025-05
GET /api/operacional/consumo-hora?fecha=2025-05-12
GET /api/operacional/mapa-consumo?periodo=2025-05
GET /api/operacional/medidores-activos?distrito=TUNARI
GET /api/operacional/medidores-fuera-servicio?distrito=TUNARI
```

## 10. Endpoints dashboard contabilidad

```txt
GET /api/contabilidad/ingresos-tarifa?periodo=2025-05
GET /api/contabilidad/proyeccion-ingresos?periodo=2025-05
GET /api/contabilidad/consumo-minimo?periodo=2025-05
GET /api/contabilidad/cambio-tarifa?periodo=2025-05&origen=P&destino=R4
GET /api/contabilidad/ingresos-pies3?periodo=2025-05
```

## 11. Endpoints dashboard administración

```txt
GET /api/administracion/errores-modelo?periodo=2025-05
GET /api/administracion/errores-distrito-zona?periodo=2025-05
GET /api/administracion/medidores-antiguos?periodo=2025-05
GET /api/administracion/medidores-sin-reporte?periodo=2025-05
GET /api/administracion/cobertura-radiobase?periodo=2025-05
```

## 12. Endpoints de consultas

```txt
GET /api/consultas/1?distrito=TUNARI&fecha=2025-05-12
GET /api/consultas/2?periodo=2025-05
GET /api/consultas/3?periodo=2025-05
...
GET /api/consultas/25
```

La idea es que cada consulta del PDF tenga un endpoint independiente, aunque internamente algunas compartan repositorios.

## 13. Endpoint de facturación

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
  "cliente": "Sr. Mendoza",
  "periodo": "2025-05",
  "consumoM3": 1234.0,
  "montoBs": 1234.0,
  "pdfMediaCarta": "/recibos/media_carta/65412354-2025-05.pdf",
  "pdfRollo": "/recibos/rollo_termico/65412354-2025-05.pdf"
}
```

## 14. Endpoint de notificación simulada

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
  "mensaje": "Sr. Mendoza, SEMAPA le recuerda que su recibo de consumo de agua es de Bs 1234 por el período 2025-05. Usted ha consumido 1234 m³ de agua."
}
```

## 15. Modelos principales

### 15.1 Resumen operacional

```go
type ResumenOperacional struct {
    Periodo                 string  `json:"periodo"`
    ConsumoTotalM3          float64 `json:"consumoTotalM3"`
    CantidadMedidores       int     `json:"cantidadMedidores"`
    MedidoresActivos        int     `json:"medidoresActivos"`
    MedidoresFueraServicio  int     `json:"medidoresFueraServicio"`
    PoblacionBeneficiaria   int     `json:"poblacionBeneficiaria"`
    CantidadErrores         int     `json:"cantidadErrores"`
}
```

### 15.2 Factura

```go
type FacturaRequest struct {
    NumeroContrato string `json:"numeroContrato"`
    Periodo        string `json:"periodo"`
}

type FacturaResponse struct {
    Estado         string  `json:"estado"`
    Cliente        string  `json:"cliente"`
    Periodo        string  `json:"periodo"`
    ConsumoM3      float64 `json:"consumoM3"`
    MontoBs        float64 `json:"montoBs"`
    PDFMediaCarta  string  `json:"pdfMediaCarta"`
    PDFRollo       string  `json:"pdfRollo"`
}
```

## 16. Buenas prácticas

```txt
Usar prepared statements.
No hacer SELECT * masivos sin partición.
No usar ALLOW FILTERING salvo para demo controlada.
Manejar errores HTTP correctamente.
Separar handlers, services y repositories.
Validar periodo e identificadores.
Registrar logs de generación de factura.
```

## 17. Checklist backend

```txt
[ ] Proyecto Go creado.
[ ] Conexión Cassandra funcionando.
[ ] Endpoint /health funcionando.
[ ] Endpoints dashboard funcionando.
[ ] Endpoints consultas funcionando.
[ ] Endpoint factura funcionando.
[ ] Endpoint notificación funcionando.
[ ] CORS configurado.
[ ] Errores HTTP controlados.
[ ] README backend creado.
```
