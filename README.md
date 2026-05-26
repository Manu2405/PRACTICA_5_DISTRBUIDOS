# 💧 SEMAPA — Sistema de Gestión Inteligente de Agua Potable

Sistema integral de monitoreo, facturación y notificación para el Servicio Municipal de Agua Potable y Alcantarillado de Cochabamba, Bolivia.

> **Práctica 5 — Implementación de Cassandra**  
> Base de Datos Avanzadas · UMSS 2026

---

## 📋 Índice

- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Requisitos](#-requisitos)
- [Instalación Rápida](#-instalación-rápida)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Dashboards](#-dashboards)
- [API Endpoints](#-api-endpoints)
- [Facturación y PDFs](#-facturación-y-pdfs)
- [Notificaciones](#-notificaciones)
- [Datos Generados](#-datos-generados)
- [Etapas del Proyecto](#-etapas-del-proyecto)

---

## 🏗 Arquitectura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend    │────▶│    Cassandra      │
│  React+Vite  │     │  Node.js     │     │  (Docker 4.1)     │
│  :5173       │     │  Express     │     │  :9042             │
│              │     │  :8080       │     │  Keyspace: semapa  │
└──────────────┘     └──────────────┘     └──────────────────┘
                           │
                     ┌─────┴─────┐
                     │  Gmail    │
                     │  SMTP     │
                     │  (email)  │
                     └───────────┘
```

---

## 🛠 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Base de Datos** | Apache Cassandra | 4.1 (Docker) |
| **Backend** | Node.js + Express | 22.x |
| **Backend (alt)** | Go + Gin | 1.26 |
| **Frontend** | React + Vite + TypeScript | 19.x / 8.x |
| **Gráficos** | Recharts | 2.x |
| **Mapas** | Leaflet + react-leaflet | 1.9 / 5.x |
| **PDFs** | PDFKit | 0.15 |
| **Email** | Nodemailer (Gmail SMTP) | 6.x |
| **Contenedor** | Docker + Docker Compose | — |

---

## 📦 Requisitos

- **Docker Desktop** (para Cassandra)
- **Node.js** ≥ 18
- **npm** ≥ 9
- **Go** ≥ 1.21 (opcional, backend alternativo)

---

## 🚀 Instalación Rápida

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd practica_5_Semapa
```

### 2. Levantar Cassandra

```bash
docker-compose up -d
```

Esperar 30 segundos a que Cassandra esté healthy, luego cargar el schema:

```bash
docker exec -i semapa-cassandra cqlsh < cassandra/schema.cql
```

### 3. Generar datos de prueba

```bash
cd scripts-data
npm install
node generar_datos.js
cd ..
```

Genera automáticamente:
- 507 contratos/personas
- 1,000 medidores IoT
- ~423,264 lecturas históricas (6 meses)
- ~2,126 errores IoT
- 15 distritos, 9 tarifas, 4 gateways

### 4. Iniciar el Backend

```bash
cd backend
npm install
node server.js
```

El backend estará en **http://localhost:8080**

### 5. Iniciar el Frontend

```bash
cd frontend
npm install
npm run dev
```

El dashboard estará en **http://localhost:5173**

---

## 📁 Estructura del Proyecto

```
practica_5_Semapa/
├── cassandra/
│   └── schema.cql              # DDL: keyspace + 12 tablas
├── scripts-data/
│   └── generar_datos.js        # Generador masivo (Promise.all batches)
├── backend/                    # API REST (Node.js + Express)
│   ├── server.js               # Servidor principal + 18 endpoints
│   ├── db.js                   # Conexión Cassandra
│   ├── pdf.js                  # Generador PDF (media carta + rollo)
│   └── email.js                # Servicio email real (Gmail SMTP)
├── backend-go/                 # API REST alternativa (Go + Gin)
│   ├── cmd/server/main.go
│   └── internal/
│       ├── db/cassandra.go
│       ├── models/models.go
│       ├── handlers/handlers.go
│       ├── services/pdf_service.go
│       └── routes/routes.go
├── frontend/                   # Dashboard React
│   └── src/
│       ├── api/client.ts       # Axios client
│       ├── components/
│       │   ├── Sidebar.tsx     # Navegación lateral
│       │   └── KpiCard.tsx     # Tarjetas KPI reutilizables
│       └── pages/
│           ├── OperacionalPage.tsx
│           ├── ContabilidadPage.tsx
│           ├── AdministracionPage.tsx
│           └── FacturaPage.tsx
├── Etapas/                     # Documentación de cada capa
├── docker-compose.yml
└── README.md
```

---

## 📊 Dashboards

### Dashboard Operacional (`/operacional`)
- **6 KPIs**: Consumo total, medidores activos/inactivos/fuera, población, errores IoT
- **Gráfico de barras**: Consumo por distrito (15 distritos)
- **Gráfico apilado**: Estado de medidores por distrito
- **Mapa interactivo**: 500 medidores sobre mapa de Cochabamba (CartoDB dark)
- **Tabla detallada**: Consumo, montos y contratos por distrito

### Dashboard Contabilidad (`/contabilidad`)
- **4 KPIs**: Ingresos totales (Bs), consumo total, contratos facturados, tarifas activas
- **Gráfico pie**: Distribución de ingresos por tarifa (R1-R4, C, CE, I, P, S)
- **Gráfico horizontal**: Consumo por categoría tarifaria
- **Tabla Top 15**: Mayores consumidores del período

### Dashboard Administración (`/administracion`)
- **4 KPIs**: Total errores, modelos afectados, distritos con errores, tipos de error
- **Gráfico**: Errores por modelo de medidor
- **Gráfico**: Errores por distrito
- **Tabla**: Detalle de tipos de error con porcentajes

### Facturación (`/factura`)
- Buscar por número de contrato
- Generar factura con **2 PDFs reales** (media carta + rollo térmico 80mm)
- Descargar PDFs
- Enviar **email real** con PDFs adjuntos vía Gmail
- Simular SMS y WhatsApp
- Historial de consumo (6 meses)

---

## 🔌 API Endpoints

### Operacional
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del sistema |
| `GET` | `/api/operacional/resumen?periodo=2026-04` | KPIs generales |
| `GET` | `/api/operacional/consumo-distrito?periodo=2026-04` | Consumo por distrito |
| `GET` | `/api/operacional/mapa-medidores` | 500 medidores con coordenadas |
| `GET` | `/api/operacional/medidores-estado` | Estado por distrito |

### Contabilidad
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/contabilidad/ingresos-tarifa?periodo=2026-04` | Ingresos por tarifa |
| `GET` | `/api/contabilidad/top-consumidores?periodo=2026-04&limit=15` | Top consumidores |

### Administración
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/administracion/errores-modelo?periodo=2026-04` | Errores por modelo |
| `GET` | `/api/administracion/errores-distrito?periodo=2026-04` | Errores por distrito/zona |

### Consultas
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/consultas/contrato/:numero` | Buscar contrato |
| `GET` | `/api/consultas/medidor/:serie` | Buscar medidor |
| `GET` | `/api/consultas/consumo/:contrato` | Historial de consumo |

### Catálogos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/catalogos/distritos` | 15 distritos con coords |
| `GET` | `/api/catalogos/tarifas` | 9 categorías tarifarias |
| `GET` | `/api/catalogos/gateways` | 4 gateways IoT |
| `GET` | `/api/catalogos/contratos?limit=50` | Lista de contratos |

### Facturación y Notificación
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/factura/generar` | Genera PDFs reales |
| `POST` | `/api/notificacion/simular` | Email real / SMS-WhatsApp simulado |

---

## 📄 Facturación y PDFs

La factura genera **dos formatos PDF**:

| Formato | Tamaño | Uso |
|---------|--------|-----|
| **Media Carta** | Letter | Entrega digital, impresión formal |
| **Rollo Térmico** | 80mm × dinámico | Kiosco, punto de atención |

Ambos incluyen: datos del titular, contrato, consumo, monto, tarifa, distrito y zona.

```bash
# Ejemplo de generación
curl -X POST http://localhost:8080/api/factura/generar \
  -H "Content-Type: application/json" \
  -d '{"numeroContrato":"CONT-04-719276","periodo":"2026-04"}'
```

---

## 📧 Notificaciones

| Canal | Tipo | Detalle |
|-------|------|---------|
| **Email** | ✅ Real | Gmail SMTP con template HTML + PDFs adjuntos |
| **WhatsApp** | 📱 Simulado | Mensaje generado + registro en Cassandra |
| **SMS** | 📱 Simulado | Mensaje generado + registro en Cassandra |

```bash
# Enviar email real
curl -X POST http://localhost:8080/api/notificacion/simular \
  -H "Content-Type: application/json" \
  -d '{"formato":"email","numeroContrato":"CONT-04-719276","periodo":"2026-04","destinatarioEmail":"usuario@gmail.com"}'
```

---

## 📈 Datos Generados

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `catalogo_distritos` | 15 | Distritos de Cochabamba |
| `catalogo_tarifas` | 9 | R1, R2, R3, R4, C, CE, I, P, S |
| `catalogo_gateways` | 4 | Radiobases IoT |
| `personas` | 507 | Titulares naturales/jurídicos |
| `contratos_por_numero` | 507 | Contratos activos |
| `medidores_por_serie` | 1,000 | Medidores IoT con coords |
| `lecturas_por_medidor` | ~423,264 | 6 meses × 28 lecturas/mes |
| `consumo_mensual_por_contrato` | ~3,042 | Agregados mensuales |
| `errores_por_modelo_mes` | ~350 | Errores IoT agrupados |
| `errores_por_distrito_zona` | ~2,126 | Errores por ubicación |
| `notificaciones_por_contrato` | dinámica | Registro de notificaciones |

---

## 📋 Etapas del Proyecto

| # | Etapa | Estado |
|---|-------|--------|
| 1 | Infraestructura Cassandra (Docker + Schema) | ✅ |
| 2 | Generación Masiva de Datos (~423K registros) | ✅ |
| 3 | Backend API REST (Node.js + Go) | ✅ |
| 4 | Frontend React Dashboard (4 vistas) | ✅ |
| 5 | Facturación PDF + Notificación Email | ✅ |
| 6 | Despliegue Docker (compose) | ✅ |

---

## 👤 Autor

**Práctica 5** — Base de Datos Avanzadas  
Universidad Mayor de San Simón · Cochabamba, Bolivia · 2026

---

## 📝 Licencia

Proyecto académico — Uso educativo.
