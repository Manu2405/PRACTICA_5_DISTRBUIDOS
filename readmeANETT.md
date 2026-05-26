# SEMAPA — Estado del Proyecto, Correcciones y Pendientes
> Documento de trabajo interno — actualizado 2026-05-14

---
## cambios
## 🗂️ TAREAS TRELLO

### Tablero: SEMAPA · Práctica 5

#### 📋 Lista: BACKLOG

| # | Tarea | Descripción | Etiqueta |
|---|---|---|---|
| T-01 | Regenerar datos con nombres de distrito | Corregir `generar_datos.js` línea 103: `zona.id_distrito` → `zona.distrito`. Luego volver a correr el script dentro de Docker para que todas las tablas almacenen el nombre del distrito (ej: "MOLLE") en lugar del número. | Backend / Datos |
| T-02 | Dashboard Alcaldía — mapa de burbujas | `AlcaldiaPage.tsx` ya creado. Probar que `/api/alcaldia/mapa-distritos` devuelve datos reales con lat/lon y consumo por distrito. | Frontend |
| T-03 | Dashboard SEMAPA — equilibrio financiero | Agregar KPI de ingresos esperados vs. deuda por período en `OperacionalPage.tsx`. Fuente: `consumo_mensual_por_contrato` (monto_bs). | Frontend / Backend |
| T-04 | Dashboard SEMAPA — mapa con filtros | Filtros por sub-alcaldía / distrito / zona / mes sobre el mapa Leaflet. Nuevos endpoints `/api/operacional/mapa-filtrado`. | Backend / Frontend |
| T-05 | Dashboard SEMAPA — ranking zonas | Gráfica de barras de zonas con mayor consumo, agrupable por sub-alcaldía. Fuente: `consumo_mensual_por_contrato`. | Frontend |
| T-06 | Dashboard Contabilidad — buscador avanzado | Agregar búsqueda por nombre (ALLOW FILTERING sobre `contratos_por_numero`) y por medidor ya existente en Visor. Integrar en `ContabilidadPage.tsx`. | Frontend / Backend |
| T-07 | Visor — prueba end-to-end | Levantar `semapa-visor` en Docker (puerto 5174). Buscar contrato real, generar factura PDF, enviar email, imprimir rollo 55mm. | QA / Testing |
| T-08 | Visor — búsqueda por nombre de cliente | Agregar endpoint `/api/visor/buscar-nombre?nombre=XXX` con ALLOW FILTERING. Limitar a 10 resultados. Mostrar lista para seleccionar. | Backend / Frontend |
| T-09 | Sidebar — renombrar Administración | Cambiar label "Administración" → "IoT / Errores" para diferenciarla del Dashboard Alcaldía. | Frontend |
| T-10 | Informe técnico (máx. 2 páginas) | Redactar arquitectura distribuida: Cassandra (particiones, réplicas, CQL), Node.js Express, React, Docker. Justificación de herramientas. | Documentación |
| T-11 | App móvil (opcional +30 pts) | App React Native o Flutter para ingreso manual de lecturas + geolocalización para medidor más cercano. Conecta a `/api/operacional/mapa-medidores`. | Móvil |
| T-12 | Git — subir y enviar | Commit final, push al repositorio, enviar link a jrmendozac@gmail.com. | DevOps |

#### 🔵 Lista: EN PROGRESO
*(Mover tarjetas aquí cuando se estén trabajando)*

#### ✅ Lista: COMPLETADO

| # | Tarea | Notas |
|---|---|---|
| C-01 | 25 consultas estratégicas corregidas | `backend/consultas.js` — todas las Q1-Q25 funcionando con tablas reales |
| C-02 | Frontend ConsultasPage | Títulos correctos, filtro por período y distrito, DataTable responsiva |
| C-03 | Dashboard Alcaldía — estructura base | `AlcaldiaPage.tsx` creado con mapa burbujas, KPIs, ranking y tabla |
| C-04 | Visor de Pagos — app separada | `visor/` en puerto 5174, Docker service, endpoint `/api/visor/buscar` |
| C-05 | Sidebar actualizado | "Operacional" → "Dashboard SEMAPA", link "Alcaldía" agregado |
| C-06 | CORS backend ampliado | Puerto 5174 (Visor) agregado a los orígenes permitidos |
| C-07 | Fix distritos por nombre | `generar_datos.js` corregido: usa `zona.distrito` en lugar de `zona.id_distrito` |

---

---

## ✅ LO QUE YA ESTÁ HECHO

### Infraestructura base
- [x] Docker Compose con Cassandra 4.1 + Backend Node.js + Frontend React
- [x] Schema Cassandra completo (`cassandra/schema.cql`) — 25 tablas, keyspace `semapa`
- [x] Backend Node.js 22 + Express en puerto 8080
- [x] Frontend React 19 + Vite + TypeScript en puerto 5173
- [x] PDF generation: media carta + rollo térmico (`backend/pdf.js`)
- [x] Email real con Gmail SMTP + adjuntos PDF (`backend/email.js`)
- [x] Endpoints REST: operacional, contabilidad, administración, facturación, notificación
- [x] Scripts de carga de datos (`scripts-data/`)
- [x] Backend alternativo en Go (`backend-go/`)

### 25 Consultas estratégicas — CORREGIDAS (2026-05-14)
- [x] **Q1** — Consumo por distrito en rangos de 8h: ahora usa `lecturas_por_medidor_mes` real (samplea 15 medidores/distrito)
- [x] **Q2** — Comparativa 4 últimas semanas: pivota los 3 distritos con más consumo como columnas
- [x] **Q3** — Contratos con consumo excesivo >45m³: agrega litros, exceso%, límite ONU
- [x] **Q4** — Medidores activos por distrito **y zona** (antes faltaba zona)
- [x] **Q5** — Medidores fuera de servicio por distrito **y zona** (antes faltaba zona)
- [x] **Q6** — Modelos con mayor tasa de fallos: incluye tipos de error
- [x] **Q7** — Consumo por tarifa y distrito: pivot correcto con todas las categorías
- [x] **Q8** — Consumo anómalo por modelo + zonas afectadas (lógica completamente nueva)
- [x] **Q9** — Matriz lecturas fallidas: código_error × modelo, con descripción de `catalogo_errores_iot`
- [x] **Q10** — Medidores >10 años (umbral corregido: Excel dice 10, doc texto dice 4 → usamos 10)
- [x] **Q11** — Consumo por zona y categoría residencial: pivot R1/R2/R3/R4
- [x] **Q12** — Top 3 clientes por distrito del mes activo
- [x] **Q13** — Zonas con renovación necesaria por errores reportados
- [x] **Q14** — [Sorpresa 1] Distribución contratos por tipo de persona y categoría
- [x] **Q15** — Zonas con más errores en distrito X (acepta parámetro `?distrito=MOLLE`)
- [x] **Q16** — [Sorpresa 2] Cobertura antenas LoRaWAN: medidores por zona y radiobase
- [x] **Q17** — Demanda proyectada 5 años: tasa **2.6%/año** por distrito (antes usaba 3.5% global)
- [x] **Q18** — [Sorpresa 4] Contratos sin consumo en el periodo
- [x] **Q19** — Impacto P→R4: usa precios reales (P=4.58, R4=8.685) del tarifario Excel
- [x] **Q20** — Medidores sin consumo con zona, distrito, dirección y serie
- [x] **Q21** — Ingresos por tarifa: fórmula `consumo × (cargo_fijo/12)` verificada en Excel
- [x] **Q22** — Clientes con consumo mínimo residencial ≤12m³ (cobra cargo fijo)
- [x] **Q23** — Ingresos por tarifa en pies cúbicos (1 m³ = 35.3147 ft³)
- [x] **Q24** — [Sorpresa] Balance financiero por periodo
- [x] **Q25** — Resumen general del sistema con ingresos calculados

### Frontend — Página de Consultas
- [x] Títulos de las 25 consultas corregidos y alineados con el documento oficial
- [x] Input separado para `distrito` (usado por Q15)
- [x] Badges de categoría con conteo (Operacional / Contabilidad / Administración)
- [x] `renderData` simplificado que maneja cualquier estructura plana
- [x] `tsconfig.json` corregido: añadido `"jsx": "react-jsx"`

---

## 🔴 LO QUE FALTA HACER (PENDIENTE)

### PRIORIDAD ALTA — Para que las consultas funcionen con datos reales

#### 1. Verificar columnas críticas en el schema
El diagrama nuevo (`diagrama.jpeg`) simplificó columnas que las consultas necesitan.
Revisar que `cassandra/schema.cql` tenga estas columnas (ya están en el schema actual, pero si se recrea el schema nuevo hay que restaurarlas):

| Tabla | Columnas que deben existir |
|---|---|
| `medidores_por_serie` | `zona`, `fecha_instalacion`, `direccion`, `modelo` |
| `consumo_mensual_por_contrato` | `zona`, `nombre_titular` |
| `lecturas_por_medidor_mes` | `distrito`, `zona` |
| `errores_por_distrito_zona` | `descripcion_error` |

#### 2. Fórmula de cálculo de monto — confirmar en scripts
En `scripts-data/generar_datos.js` verificar que el monto se calcula como:
```
monto_bs = consumo_m3 × (tarifa.cargo_fijo / 12)
```
Esto fue confirmado con el Excel pero hay que asegurarse que los datos generados coincidan.

---

### PRIORIDAD ALTA — 3 Dashboards nuevos (aún NO implementados)

#### Dashboard 1 — ALCALDÍA
**Ruta sugerida:** `/alcaldia`

Componentes a crear:
- [ ] **Mapa de calor por distrito** — mostrar "índice de presión hídrica" (contaminación estimada)
  - Fórmula: `indice = consumo_m3 × 0.8` (80% retorno como agua residual — estándar saneamiento urbano)
  - Usar GeoJSON de distritos de Cochabamba (`http://mapadigital.cochabamba.bo`)
  - Color: escala verde→rojo por intensidad de consumo
- [ ] **Deuda de la Alcaldía con SEMAPA** — contratos tipo `P` (Preferencial) o `S` (Social) cuyo titular sea la alcaldía
- [ ] **KPIs generales:** consumo promedio mensual, consumo promedio anual, tendencia
- [ ] **Ranking de distritos** por consumo (barras o tabla con mapa de calor)
- [ ] **Gráfica de tendencia** mensual/anual

**Datos disponibles:** `consumo_mensual_por_contrato` (distrito, consumo_m3, periodo), `catalogo_distritos` (nombre, subalcaldia, poblacion)

---

#### Dashboard 2 — SEMAPA (operacional avanzado)
**Ruta sugerida:** `/semapa` (reemplaza o extiende `/operacional`)

Componentes a crear:
- [ ] **KPI financiero:** ingresos esperados vs. periodos de deuda — indicador de rentabilidad para inversiones
- [ ] **Mapa con filtros:** sub-alcaldía → distrito → zona, con capa de calor por consumo
  - Filtro por mes/periodo
  - Usar GeoJSON de Cochabamba por distritos (mismo del Dashboard Alcaldía)
- [ ] **Gráfica de barras:** consumo mensual total agrupable por sub-alcaldía / distrito / zona
- [ ] **Ranking de distritos** que más consumen (con tendencia temporal)
- [ ] **Ranking de zonas** que más consumen

**Datos disponibles:** `consumo_mensual_por_contrato`, `errores_por_distrito_zona`, `medidores_por_serie`

---

#### Dashboard 3 — CONTABILIDAD (facturación y cobranza)
**Ruta sugerida:** `/contabilidad` (reemplazar la página actual)

Componentes a crear:
- [ ] **Buscador:** por número de contrato / nombre del cliente / número de medidor / número de servicio
- [ ] **Mapa de resultados:** pin en coordenadas del medidor, click → popup con:
  - Nombre del cliente
  - Número de contrato/cuenta
  - Distrito y zona
  - Medidor(es) asignados + modelo del medidor
  - Consumo histórico por franja horaria (de `lecturas_por_medidor_mes`)
- [ ] **Botón: Generar factura** — llama a `/api/factura/generar` → produce PDF media carta + rollo 55mm
- [ ] **Botón: Enviar por Gmail** — llama a `/api/notificacion/simular` con `formato=email`, adjunta los 2 PDFs
- [ ] **Botón: Aviso de cobranza** — genera carta tamaño A4 en PDF y la envía por Gmail
- [ ] El mapa debe mostrar la ubicación del medidor encontrado (lat/lon de `medidores_por_serie`)

**Datos disponibles:** `contratos_por_numero`, `medidores_por_serie` (lat/lon), `lecturas_por_medidor_mes`, `consumo_mensual_por_contrato`

**Duda pendiente:** ¿El consumo por hora del popup usa las lecturas de `lecturas_por_medidor_mes` (3 franjas/día) o necesitamos granularidad de 1 hora? Con 3 lecturas/día es suficiente para mostrar un histograma de franjas.

---

### PRIORIDAD MEDIA — Mapa de distritos de Cochabamba

**Problema actual:** El mapa del frontend muestra puntos individuales de medidores (CircleMarker) sobre un fondo oscuro. No muestra los límites de los 15 distritos ni las 6 sub-alcaldías.

**Lo que se necesita:**
- GeoJSON de los 15 distritos de Cochabamba (disponible en `http://mapadigital.cochabamba.bo/public/generado2`)
- Superponer polígonos de distritos coloreados por consumo (heatmap)
- Para los dashboards Alcaldía y SEMAPA esto es obligatorio

**Tarea:**
- [ ] Descargar/obtener GeoJSON de límites de distritos de Cochabamba
- [ ] Agregar capa `GeoJSON` de `react-leaflet` en el mapa
- [ ] Colorear cada distrito según `consumo_m3` del periodo seleccionado
- [ ] Tooltip al hover: nombre del distrito, consumo total, índice de contaminación estimada

---

### PRIORIDAD BAJA — Mejoras y extras

- [ ] **App móvil** (opcional +30 pts): ingreso manual de lecturas + geolocalización para medidor más cercano
- [ ] **Sidebar:** renombrar "Operacional" → "Dashboard SEMAPA" y "Administración" → "Alcaldía" según nueva arquitectura
- [ ] **Página `/alcaldia`:** crear el componente `AlcaldiaPage.tsx`
- [ ] **Informe técnico** (máx. 2 páginas): arquitectura distribuida, justificación de herramientas, conceptos de Cassandra
- [ ] **Git:** subir todo al repositorio y enviar a jrmendozac@gmail.com

---

## 📋 REGLAS DE NEGOCIO CONFIRMADAS

### Tarifario (verificado con Excel)
| Alias | Categoría | Precio/m³ | Cargo fijo Bs (12 m³) |
|---|---|---|---|
| R1 | Residencial | 1.3950 | 16.74 |
| R2 | Residencial | 2.7808 | 33.37 |
| R3 | Residencial | 5.2142 | 62.57 |
| R4 | Residencial | 8.6850 | 104.22 |
| C  | Comercial   | 10.430 | 125.16 |
| CE | Comercial Especial | 12.165 | 145.98 |
| I  | Industrial  | 9.3867 | 112.64 |
| P  | Preferencial | 4.580 | 54.96 |
| S  | Social      | 7.6433 | 91.72 |

**Fórmula de billing:** `monto = consumo_m3 × (cargo_fijo_bs / 12)`

### Consumo excesivo (Q3)
- Límite: **45 m³/mes** = 300 L/día × 30 días × 5 personas (referencia ONU)
- Solo aplica a tarifa residencial (R1, R2, R3, R4)

### Índice de contaminación / presión hídrica (Dashboard Alcaldía)
- `indice_presion_hidrica = consumo_total_m3 × 0.8`
- El 80% del agua consumida retorna al sistema como agua residual (modelo estándar saneamiento urbano)
- NO llamar "contaminación" directamente — usar "Carga Hídrica Urbana" o "Presión Ambiental Estimada"

### Proyección de demanda (Q17)
- Factor de crecimiento: **2.6%/año** (confirmado por Excel)
- Fórmula: `consumo_anio_n = consumo_base × (1.026)^n`

### Antigüedad de medidores (Q10)
- Umbral: **> 10 años** (confirmado por hoja Consultas del Excel)

### Lecturas IoT
- 3 lecturas por día: franja 0-8h, 8-16h, 16-24h
- Status 1 = automático (bien), Status 2 = manual, Status 3-9 = errores
- 0.5% de lecturas con errores, 0.07% con duplicados (doble reporte por atenuación LoRa)

---

## 🏗️ ESTRUCTURA DE ARCHIVOS CLAVE

```
practica_5_Semapa/
├── cassandra/schema.cql          ← Schema de BD (25 tablas)
├── backend/
│   ├── server.js                 ← ~18 endpoints REST
│   ├── consultas.js              ← ✅ 25 consultas corregidas
│   ├── db.js                     ← Conexión Cassandra
│   ├── pdf.js                    ← Generación PDF media carta + rollo
│   └── email.js                  ← Envío Gmail SMTP
├── frontend/src/pages/
│   ├── OperacionalPage.tsx       ← Dashboard operacional (renombrar a "Dashboard SEMAPA")
│   ├── ContabilidadPage.tsx      ← Contabilidad actual
│   ├── AdministracionPage.tsx    ← Renombrar a "AlcaldiaPage.tsx"
│   ├── FacturaPage.tsx           ← Módulo de facturación
│   └── ConsultasPage.tsx         ← ✅ 25 consultas actualizadas
├── scripts-data/
│   ├── cargar_catalogos.js       ← Carga catálogos desde CSV
│   └── generar_datos.js          ← Genera 120K medidores + lecturas
├── docker-compose.yml
├── arqui.jpeg                    ← Diagrama arquitectura (fuente de verdad)
└── diagrama.jpeg                 ← Diagrama schema DB (conceptual, no reemplaza schema.cql)
```
