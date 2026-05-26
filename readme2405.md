# readme2405 — Dashboard Contabilidad: 3 KPIs Obligatorios

**Fecha:** 2026-05-24
**Rama:** `devDevonA`
**Alcance:** Dashboard Financiero / Contabilidad SEMAPA — Práctica 5
**Foco:** Cumplir los KPIs marcados como **(Obligatorio)** en el PDF de la práctica para el Dashboard 3.

---

## Resumen ejecutivo

Se ampliaron las gráficas y endpoints de `/contabilidad` con **3 KPIs obligatorios** que faltaban del PDF. Todos los cambios consumen una sola tabla Cassandra (`consumo_mensual_por_contrato`) y agregan visualizaciones temporales y geográficas que antes no existían.

**Importante:** los datos que se ven en el dashboard son **ficticios** (generados sintéticamente por `scripts-data/generar_datos.js`, no son datos reales de SEMAPA). Además, la cartera vencida y los morosos usan un **mock determinístico por hash** porque la tabla `consumo_mensual_por_contrato` aún no tiene el campo `estado_facturacion` poblado. Esto se explica al final del documento.

---

## Estado de los 4 Obligatorios del PDF

| # | KPI Obligatorio | Estado | Endpoint backend |
|---|---|---|---|
| 1 | Monto facturado mensual (Bs) | ✅ con gráfica temporal | `GET /api/mvc/contabilidad/facturacion-mensual` |
| 2 | Facturación por distrito | ✅ con bar chart + tabla | `GET /api/mvc/contabilidad/facturacion-por-distrito?periodo=` |
| 3 | Cartera vencida (con aging) | ✅ con 4 buckets de antigüedad | `GET /api/mvc/contabilidad/cartera-vencida?periodo=` |
| 4 | Preavisos emitidos | ❌ Pendiente | (no creado aún) |

---

## Tablas Cassandra que alimentan el dashboard

**Solo 1 tabla** es consultada por los 4 endpoints de Contabilidad:

### `consumo_mensual_por_contrato`

| Columna | Tipo | Uso en Contabilidad |
|---|---|---|
| `numero_contrato` | text | Identificador único — alimenta el hash de cartera vencida |
| `periodo` | text (`YYYY-MM`) | Filtro temporal en todos los endpoints |
| `nombre_titular` | text | Mostrado en la tabla de morosos |
| `distrito` | text | Agrupador en `facturacion-por-distrito` |
| `zona` | text | Mostrado en tabla de morosos |
| `tarifa_alias` | text | Agrupador en `ingresos-tarifa` (R1, R2, C, CE, etc.) |
| `consumo_m3` | decimal | Métrica de consumo |
| `monto_bs` | decimal | **Métrica de facturación principal** |
| `estado_facturacion` | text | **Existe en schema pero no se usa todavía** (ver "Pendientes") |

**¿Dónde se popula?** En `scripts-data/generar_datos.js`. Cada vez que corres `pnpm run generar-datos` se reescribe esta tabla con datos sintéticos para los períodos 2026-02, 2026-03 y 2026-04.

### Tablas que NO usamos pero existen y podrían sumarse

| Tabla | Para qué la podríamos usar |
|---|---|
| `notificaciones_por_contrato` | Paso 3 — contar preavisos emitidos |
| `contratos_por_numero` | Enriquecer datos de morosos (catastro, categoría, fecha_alta) |
| `medidores_por_serie` | Cruzar con estado de medidor (corte por avería ≠ corte por mora) |
| `lecturas_por_medidor_mes` | Detectar consumo cero (posible medidor dañado, no impago) |
| `catalogo_tarifas` | Calcular factura ideal vs lo que pagó (descuento del 40% Art.27) |

---

## CSVs de Recursos que tomamos como referencia conceptual (no consumidos directamente)

Estos archivos sirvieron para diseñar la lógica, pero el dashboard lee de Cassandra, no de los CSVs:

| Archivo | Para qué fue de referencia |
|---|---|
| `Recursos/Recursos Practica 5 - Tarifario.csv` | Confirmar bloques tarifarios y cargo fijo (Art.4 del Reglamento) |
| `Recursos/Recursos Practica 5 - Distritos.csv` | Nombres oficiales de distritos (TUNARI, MOLLE, ALEJO CALATAYUD…) |
| `Recursos/03 Practica 5 Recursos contratos_agua.csv` | Estructura de un contrato real SEMAPA (numero_catastro, CI, tipo_servicio) |
| `Recursos/03 Practica 5 Recursos - Catastro.csv` | Formato del número de catastro `11-12-412-0983-000` |
| `Recursos/Recursos Practica 5 - ModeloMedidores.csv` | Modelos de medidores para Operacional, no Contabilidad |
| `Recursos/03 Practica 5 Recursos - ErroresIOT.csv` | Códigos de error 3/4/5 — pertenecen a Operacional |

El Reglamento de Política Tarifaria (PDF) se usó como referencia para entender qué cobra SEMAPA por categoría, pero el cálculo del monto no se hace en el dashboard — viene precalculado en `consumo_mensual_por_contrato.monto_bs`.

---

## Cambios concretos por archivo

### Backend

| Archivo | Qué se hizo |
|---|---|
| [backend/src/controllers/contabilidadController.js](backend/src/controllers/contabilidadController.js) | Agregadas 4 funciones: `hashContrato`, `esMoroso`, `diasAtrasoMock`, `bucketDe`. Nuevos handlers: `getFacturacionMensual`, `getFacturacionPorDistrito`, `getCarteraVencida`. Reescrito `getMorosos` para usar el hash en lugar de `Math.random()` (antes el atraso cambiaba en cada recarga). |
| [backend/src/routes/contabilidadRoutes.js](backend/src/routes/contabilidadRoutes.js) | 3 rutas nuevas: `/facturacion-mensual`, `/facturacion-por-distrito`, `/cartera-vencida` |

### Frontend

| Archivo | Qué se hizo |
|---|---|
| [frontend/src/pages/ContabilidadPage.tsx](frontend/src/pages/ContabilidadPage.tsx) | 3 nuevos states (`factMensual`, `factDistrito`, `cartera`), llamadas paralelas en `Promise.all`, fallback simulado por si el backend no responde, y 3 tarjetas visuales nuevas en este orden:<br>1. **Monto Facturado Mensual** — ComposedChart (barras verdes + línea ticket promedio) + tabla con variación %.<br>2. **Cartera Vencida** — KPI grande + 4 mini-KPIs por bucket de antigüedad + BarChart.<br>3. **Facturación por Distrito** — BarChart horizontal + tabla con ticket promedio. |

---

## Endpoints nuevos — contratos de salida

### `GET /api/mvc/contabilidad/facturacion-mensual`
```json
[
  { "periodo": "2026-02", "montoBs": 1180400.00, "consumoM3": 78500, "contratos": 9100, "ticketPromedio": 129.71, "variacionPct": 0 },
  { "periodo": "2026-03", "montoBs": 1245700.00, "consumoM3": 82300, "contratos": 9450, "ticketPromedio": 131.82, "variacionPct": 5.5 },
  { "periodo": "2026-04", "montoBs": 1325200.00, "consumoM3": 87100, "contratos": 9620, "ticketPromedio": 137.75, "variacionPct": 6.4 }
]
```

### `GET /api/mvc/contabilidad/facturacion-por-distrito?periodo=2026-04`
```json
[
  { "distrito": "TUNARI", "ingresoBs": 425000.50, "consumoM3": 28000, "contratos": 3200, "ticketPromedio": 132.81 },
  ...
]
```

### `GET /api/mvc/contabilidad/cartera-vencida?periodo=2026-04`
```json
{
  "periodo": "2026-04",
  "totalBs": 1250400.50,
  "totalContratos": 1840,
  "edadPromedioDias": 47.3,
  "buckets": [
    { "rango": "0-30 días",  "contratos": 920, "totalBs": 380500.00, "pctMonto": 30.4, "color": "#10b981" },
    { "rango": "31-60 días", "contratos": 520, "totalBs": 415200.00, "pctMonto": 33.2, "color": "#f59e0b" },
    { "rango": "61-90 días", "contratos": 280, "totalBs": 285400.50, "pctMonto": 22.8, "color": "#f97316" },
    { "rango": "90+ días",   "contratos": 120, "totalBs": 169300.00, "pctMonto": 13.5, "color": "#ef4444" }
  ]
}
```

---

## Qué es ficticio vs qué viene de Cassandra

El sistema tiene **3 capas de "ficticio"**. Conviene entender cada una porque cambian el plan para llegar a "datos reales":

### Capa 1 — Datos sintéticos en Cassandra
- La tabla `consumo_mensual_por_contrato` se rellena con `scripts-data/generar_datos.js` usando Faker.
- Los nombres de titulares, números de contrato, montos y consumos **son aleatorios** (no corresponden a clientes reales de SEMAPA).
- **Para volverlo real:** cargar los CSVs de Recursos (`contratos_agua.csv`, `lecturas_iot.csv`) en lugar de generar con Faker. Habría que escribir un loader nuevo en `scripts-data/`.

### Capa 2 — Mock determinístico de morosidad
- En `contabilidadController.js`, `esMoroso(numero_contrato)` devuelve `true` para el ~20% de los contratos (hash % 5 === 0).
- `diasAtrasoMock(numero_contrato)` devuelve un número 0-150 estable por contrato (mismo hash → mismo número siempre).
- **Por qué es mock:** la tabla `consumo_mensual_por_contrato` tiene la columna `estado_facturacion` en el schema, pero el script de generación NO la popula. Así que no hay forma de saber si una factura fue pagada o no.
- **Para volverlo real:** modificar `scripts-data/generar_datos.js` para que `estado_facturacion` se rellene con valores reales (`pagado` / `pendiente` / `vencido`) y luego reemplazar `esMoroso()` por `WHERE estado_facturacion != 'pagado'`.

### Capa 3 — Fallback en el frontend
- `ContabilidadPage.tsx` tiene `setFactMensual([...])`, `setFactDistrito([...])`, `setCartera({...})` dentro del `.catch()` del `Promise.all`.
- Esos arrays son datos hardcodeados que solo aparecen si **el backend está caído**.
- **Cuándo activa:** si Cassandra no está corriendo, si el backend Node no inició, o si los endpoints devuelven error.
- **Para verificarlo:** abre la consola del navegador (F12). Si ves `console.warn("Usando datos simulados...")`, estás en fallback.

---

## Cómo probar todo localmente

### Pre-requisitos
- Cassandra corriendo (`docker compose up -d cassandra`)
- Schema cargado (`Get-Content cassandra/schema.cql | docker exec -i semapa-cassandra cqlsh`)
- Datos generados (`cd scripts-data; pnpm run generar-datos`)

### Arrancar

```powershell
# Terminal 1 — backend
cd D:\proyecto5\P5Git\PRACTICA_5_DISTRBUIDOS\backend
pnpm start

# Terminal 2 — frontend
cd D:\proyecto5\P5Git\PRACTICA_5_DISTRBUIDOS\frontend
pnpm run dev
```

Abrir http://localhost:5173/contabilidad

### Verificar endpoints directamente

```powershell
curl http://localhost:8080/api/mvc/contabilidad/facturacion-mensual
curl http://localhost:8080/api/mvc/contabilidad/facturacion-por-distrito?periodo=2026-04
curl http://localhost:8080/api/mvc/contabilidad/cartera-vencida?periodo=2026-04
```

---

## Pendientes detectados (no abordados en esta tanda)

### Para terminar los Obligatorios del PDF
- **Paso 3 — Preavisos emitidos**: crear endpoint que cuente filas en `notificaciones_por_contrato` filtrando por `tipo='preaviso'`, y agregar KPI cards + bar chart por canal (Email/SMS/WhatsApp).

### Para pasar de datos ficticios a datos reales
1. **Cargar los CSVs de Recursos** en lugar de generar con Faker:
   - `Recursos/03 Practica 5 Recursos contratos_agua.csv` (100k filas) → `contratos_por_numero`
   - `Recursos/03 Practica 5 Recursos lecturas_iot.csv` (300k filas) → `lecturas_por_medidor_mes`
   - `Recursos/03 Practica 5 Recursos medidores_iot.csv` (120k filas) → `medidores_por_serie`
   - Habría que escribir un loader en `scripts-data/` que parsee estos CSVs y haga INSERT.

2. **Poblar `estado_facturacion`** en `consumo_mensual_por_contrato` para que cartera vencida deje de ser mock:
   - Modificar `scripts-data/generar_datos.js` para que ~15-20% de filas queden con `estado_facturacion='vencido'` o `'pendiente'`, con `dias_desde_emision` calculados.
   - Reemplazar `esMoroso()` y `diasAtrasoMock()` en el backend por filtros reales sobre estos campos.

3. **Cruzar con `contratos_por_numero`** para enriquecer la tabla de morosos:
   - Agregar columna `categoria` / `subcategoria` (R1, R2, C, CE, etc.) en la tabla mostrada.
   - Agregar columna `numero_catastro` para que el área de cobranza pueda ubicar físicamente al deudor.

### Mejoras visuales sugeridas (no obligatorias)
- Heatmap geográfico de cartera vencida superpuesto al mapa de Cochabamba (`AlcaldiaPage.tsx` ya tiene el mapa de distritos, podría reutilizarse).
- Forecast de facturación a 3 meses con regresión lineal simple sobre `facturacion-mensual`.
- Comparativo "presupuesto vs real" (requiere agregar una tabla `presupuesto_mensual` al schema).

---

## Archivos modificados en esta tanda

| Archivo | Tipo |
|---|---|
| [backend/src/controllers/contabilidadController.js](backend/src/controllers/contabilidadController.js) | + 4 helpers + 3 handlers, fix `getMorosos` |
| [backend/src/routes/contabilidadRoutes.js](backend/src/routes/contabilidadRoutes.js) | + 3 rutas |
| [frontend/src/pages/ContabilidadPage.tsx](frontend/src/pages/ContabilidadPage.tsx) | + 3 states, + 3 tarjetas con charts y tablas |

---

*Cualquier duda sobre la lógica de cartera vencida o la fuente de datos, ver la sección "Qué es ficticio vs qué viene de Cassandra" de este mismo readme.*
