# 04 — Capa Frontend: React Dashboard

## 1. Objetivo de la capa

Construir una interfaz web moderna para visualizar el consumo de agua, estado de medidores, errores IoT, ingresos por tarifa y generación de recibos.

## 2. Stack frontend

| Elemento | Tecnología |
|---|---|
| Framework | React + Vite |
| Lenguaje | TypeScript |
| Estilos | TailwindCSS |
| Componentes | shadcn/ui o componentes propios |
| Gráficos | ECharts o Recharts |
| Mapas | Leaflet + react-leaflet |
| HTTP | Axios |
| Estado de consultas | TanStack Query |
| Rutas | React Router |

## 3. Dashboards requeridos

| Dashboard | Propósito |
|---|---|
| Operacional SEMAPA | Consumo, medidores, mapa, alertas. |
| Contabilidad | Ingresos, tarifas, cobros y proyecciones. |
| Administración | Errores, modelos, radiobases y medidores sin reporte. |

## 4. Estructura de carpetas

```txt
frontend-react/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── operacional.ts
│   │   ├── contabilidad.ts
│   │   ├── administracion.ts
│   │   └── factura.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── kpi/
│   │   │   └── KpiCard.tsx
│   │   ├── charts/
│   │   │   ├── BarChartCard.tsx
│   │   │   ├── LineChartCard.tsx
│   │   │   ├── PieChartCard.tsx
│   │   │   └── GaugeCard.tsx
│   │   ├── map/
│   │   │   ├── ConsumptionMap.tsx
│   │   │   └── MeterPopup.tsx
│   │   ├── tables/
│   │   │   ├── DataTable.tsx
│   │   │   └── ConsultaTable.tsx
│   │   └── factura/
│   │       ├── FacturaForm.tsx
│   │       └── FacturaResult.tsx
│   ├── pages/
│   │   ├── OperacionalPage.tsx
│   │   ├── ContabilidadPage.tsx
│   │   ├── AdministracionPage.tsx
│   │   ├── ConsultasPage.tsx
│   │   └── FacturaPage.tsx
│   ├── routes/
│   │   └── AppRoutes.tsx
│   ├── schemas/
│   │   ├── dashboard.ts
│   │   ├── factura.ts
│   │   └── consultas.ts
│   ├── lib/
│   │   ├── format.ts
│   │   └── constants.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── Dockerfile
```

## 5. Rutas del frontend

```txt
/                       -> redirige a /operacional
/operacional            -> Dashboard SEMAPA
/contabilidad           -> Dashboard Contabilidad
/administracion         -> Dashboard Administración
/consultas              -> Banco de consultas
/factura                -> Generación de recibo
/factura/:numeroContrato -> Detalle de factura
```

## 6. Layout principal

El layout debe incluir:

```txt
Sidebar lateral
Header superior
Selector de periodo
Filtro por distrito
Filtro por zona
Filtro por tarifa
Área principal de dashboard
```

## 7. Dashboard operacional SEMAPA

### Objetivo

Mostrar el estado general del consumo de agua y medidores.

### Componentes

| Componente | Descripción |
|---|---|
| KPI consumo total | Total mensual en m³. |
| KPI medidores activos | Cantidad de medidores activos. |
| KPI población beneficiaria | Población estimada. |
| KPI errores IoT | Total de errores del periodo. |
| Mapa de consumo | Burbujas o calor por distrito/zona. |
| Histograma horario | Consumo promedio por hora. |
| Tabla de zonas | Consumo, medidores y errores por zona. |

### Endpoints usados

```txt
GET /api/operacional/resumen
GET /api/operacional/consumo-distrito
GET /api/operacional/consumo-hora
GET /api/operacional/mapa-consumo
GET /api/operacional/medidores-activos
```

## 8. Dashboard contabilidad

### Objetivo

Mostrar ingresos proyectados, consumo por tarifa y facturación.

### Componentes

| Componente | Descripción |
|---|---|
| KPI ingresos totales | Total a cobrar. |
| Gráfico por tarifa | Ingresos por R1, R2, R3, R4, C, CE, I, P, S. |
| Tabla de consumo mínimo | Clientes sujetos a consumo mínimo. |
| Proyección mensual | Estimación de ingresos por periodo. |
| Conversión a pies³ | Consulta 24. |

### Endpoints usados

```txt
GET /api/contabilidad/ingresos-tarifa
GET /api/contabilidad/proyeccion-ingresos
GET /api/contabilidad/consumo-minimo
GET /api/contabilidad/cambio-tarifa
GET /api/contabilidad/ingresos-pies3
```

## 9. Dashboard administración

### Objetivo

Mostrar fallas técnicas, modelos con errores y zonas que requieren atención.

### Componentes

| Componente | Descripción |
|---|---|
| KPI medidores fuera de servicio | Total del periodo. |
| Gráfico errores por modelo | Consulta 6 y 9. |
| Tabla errores por zona | Consulta 13 y 15. |
| Cobertura por radiobase | Consulta 17. |
| Medidores sin reporte | Consulta 21. |

### Endpoints usados

```txt
GET /api/administracion/errores-modelo
GET /api/administracion/errores-distrito-zona
GET /api/administracion/medidores-antiguos
GET /api/administracion/medidores-sin-reporte
GET /api/administracion/cobertura-radiobase
```

## 10. Página de consultas

La página de consultas debe permitir:

```txt
Seleccionar número de consulta.
Ingresar filtros.
Ejecutar consulta.
Mostrar resultado en tabla.
Exportar JSON opcionalmente.
```

## 11. Página de factura

La página de factura debe permitir:

```txt
Buscar por contrato, carnet o medidor.
Seleccionar periodo.
Generar factura.
Ver consumo y monto.
Descargar PDF media carta.
Descargar PDF rollo térmico.
Simular envío por email/SMS/WhatsApp.
```

## 12. Cliente Axios

Archivo:

```txt
src/api/client.ts
```

Debe contener:

```txt
baseURL del backend
interceptor de errores
timeout
headers JSON
```

## 13. Estilo visual recomendado

```txt
Tema oscuro o semi oscuro.
Cards grandes para KPIs.
Mapa central llamativo.
Gráficas claras y minimalistas.
Colores por alerta: verde, amarillo, rojo.
Diseño limpio para defensa.
```

## 14. Componentes reutilizables

```txt
KpiCard
ChartCard
FilterBar
DateSelector
DistrictSelector
DataTable
StatusBadge
ConsumptionMap
FacturaForm
FacturaResult
```

## 15. Checklist frontend

```txt
[ ] Proyecto React creado con Vite.
[ ] Tailwind configurado.
[ ] Rutas creadas.
[ ] Layout general listo.
[ ] Dashboard operacional listo.
[ ] Dashboard contabilidad listo.
[ ] Dashboard administración listo.
[ ] Página de consultas lista.
[ ] Página de factura lista.
[ ] API conectada.
[ ] Mapas funcionando.
[ ] Gráficas funcionando.
[ ] Estados loading/error controlados.
[ ] Responsive básico aplicado.
```
