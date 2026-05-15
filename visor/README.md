# SEMAPA Visor de Pagos — Documentación técnica

Aplicación tipo **totem de autoservicio** para que los clientes de SEMAPA consulten su cuenta, vean el historial de consumos y reciban su comprobante de pago por email o impresora térmica de 55mm.

---

## Arquitectura general

```
Celular / Tablet (navegador)
        │
        │  HTTP  puerto 5174
        ▼
┌─────────────────────┐
│  semapa-visor       │  React 19 + Vite 6 + TypeScript
│  Docker container   │  Sirve la SPA en modo dev (--host 0.0.0.0)
│  puerto 5174        │
└────────┬────────────┘
         │
         │  HTTP  puerto 8080  (window.location.hostname → IP dinámica)
         ▼
┌─────────────────────┐
│  semapa-backend     │  Node.js + Express  network_mode: host
│  Docker container   │
│  puerto 8080        │
└────────┬────────────┘
         │
         │  CQL  puerto 9042
         ▼
┌─────────────────────┐
│  semapa-cassandra   │  Apache Cassandra 4.1
│  Docker container   │  keyspace: semapa
│  puerto 9042        │
└─────────────────────┘
```

### Por qué `window.location.hostname`

El frontend corre en el navegador del celular. Si el `baseURL` fuera `http://localhost:8080`, el celular intentaría conectarse a sí mismo. Usando `window.location.hostname` se toma automáticamente la IP del servidor que sirvió la página (la laptop), sin necesidad de hardcodear ninguna IP.

---

## Estructura de archivos

```
visor/
├── Dockerfile              # Imagen Docker: node:20-alpine, npm install, vite dev
├── package.json            # Dependencias: react, axios, lucide-react
├── tsconfig.json           # TypeScript: target ES2023, jsx react-jsx, strict
├── vite.config.ts          # Plugin React, puerto 5174
└── src/
    ├── main.tsx            # Punto de entrada React
    ├── index.css           # Estilos completos del totem (sin framework CSS)
    └── App.tsx             # Toda la lógica y UI de la aplicación
```

---

## Flujo de pantallas

```
[Bienvenida] → [Buscar] → [Datos + Historial] → [Opciones de pago]
                                                      ├── [Email] → [Éxito]
                                                      └── [Imprimir] → [Éxito]
```

| Pantalla | Estado (`Paso`) | Descripción |
|----------|----------------|-------------|
| Bienvenida | `bienvenida` | Logo SEMAPA, botón de inicio, selector de período (default: mes anterior) |
| Buscar | `buscar` | Teclado numérico, construye `CONT-XX-XXXXXX` automáticamente |
| Datos | `datos` | Tarjeta del cliente + tabla con 6 meses de historial + total pendiente |
| Pago | `pago` | Dos opciones: correo electrónico o impresora térmica |
| Email | `email` | Teclado QWERTY con atajos de dominio (@gmail, @hotmail...) |
| Éxito | `exito` | Confirmación con countdown de 8s y vuelta automática al inicio |

---

## Componentes internos (en `App.tsx`)

### `NumPad`
Teclado numérico 4×3. Acepta hasta 8 dígitos e inserta el guion automáticamente después del dígito 2 (`04715427` → `04-715427`). El contrato completo que se envía al backend es `CONT-04-715427`.

### `Qwerty`
Teclado QWERTY completo para ingresar email. Incluye:
- Tecla Shift (mayúsculas)
- Atajos de dominio: `@gmail.com`, `@hotmail.com`, `@yahoo.com`, `@outlook.com`
- Fila de números y caracteres especiales (`@`, `.`, `-`, `_`)

### `Steps`
Indicador de progreso de 3 pasos (Buscar → Datos → Pago) con estado activo/completado.

---

## Endpoints del backend que usa el visor

### 1. Buscar contrato
```
GET /api/visor/buscar?q=CONT-04-715427&periodo=2026-04
```
**Respuesta:**
```json
{
  "contrato": "CONT-04-715427",
  "nombre": "Gracia Nieves Deleón Sánchez Abigail",
  "identificador": "CI-5587609",
  "tipo_persona": "natural",
  "direccion": "...",
  "distrito": "4",
  "zona": "COÑA COÑA",
  "tarifa": "R3",
  "consumo_m3": 81.77,
  "monto_bs": 70.10,
  "periodo": "2026-04",
  "historial": [
    { "periodo": "2026-04", "consumo_m3": 81.77, "monto_bs": 70.10, "estado": "pendiente" },
    { "periodo": "2026-03", "consumo_m3": 76.86, "monto_bs": 53.52, "estado": "pendiente" },
    ...
  ]
}
```
Si el período seleccionado no tiene datos, el backend devuelve automáticamente el período más reciente con datos.

Puede buscar por:
- Número de contrato: `CONT-04-715427`
- Número de serie del medidor (fallback)

### 2. Generar PDF
```
POST /api/factura/generar
Body: { "numeroContrato": "CONT-04-715427", "periodo": "2026-04" }
```
Genera dos PDFs y los guarda en el volumen `./backend/recibos/`:
- `media_carta/CONT-04-715427-2026-04.pdf` — Factura A5
- `rollo_termico/CONT-04-715427-2026-04.pdf` — Rollo 55mm

### 3. Enviar notificación / email
```
POST /api/notificacion/simular
Body: { "formato": "email", "numeroContrato": "...", "periodo": "...", "destinatarioEmail": "..." }
```
Si `formato = "email"` envía el email real con los PDFs adjuntos y registra en Cassandra. Si es `"print"` simula y registra.

---

## Tablas de Cassandra utilizadas

El visor accede a Cassandra **solo a través del backend**. Las tablas involucradas son:

### Tablas de lectura

| Tabla | Para qué la usa |
|-------|----------------|
| `contratos_por_numero` | Buscar el contrato por número y obtener nombre, dirección, tarifa, distrito, zona |
| `medidores_por_serie` | Búsqueda alternativa: si el usuario ingresa el número de serie del medidor en vez del contrato |
| `consumo_mensual_por_contrato` | Obtener el historial completo de 6 meses: consumo_m3, monto_bs, estado_facturacion por período |

### Tablas de escritura

| Tabla | Para qué la usa |
|-------|----------------|
| `notificaciones_por_contrato` | Registrar cada notificación enviada (email o simulada), con timestamp y estado |

### Esquema resumido de las tablas relevantes

```cql
-- Contrato principal
contratos_por_numero (
  numero_contrato text PRIMARY KEY,
  identificador_titular text,
  nombre_titular text,
  tipo_persona text,       -- 'natural' | 'juridica'
  direccion text,
  distrito text,
  zona text,
  tarifa_alias text,       -- 'R1'|'R2'|'R3'|'R4'|'C'|'CE'|'I'|'P'|'S'
  estado text,
  fecha_alta date
)

-- Historial de consumos (clustering por periodo DESC)
consumo_mensual_por_contrato (
  numero_contrato text,
  periodo text,            -- formato 'YYYY-MM'
  consumo_m3 decimal,
  monto_bs decimal,
  estado_facturacion text, -- 'pendiente' | 'pagado'
  PRIMARY KEY (numero_contrato, periodo)
) WITH CLUSTERING ORDER BY (periodo DESC)

-- Notificaciones enviadas
notificaciones_por_contrato (
  numero_contrato text,
  periodo text,
  fecha_hora timestamp,
  formato text,            -- 'email' | 'print'
  identificador text,
  estado text,             -- 'enviado' | 'simulado'
  mensaje text,
  PRIMARY KEY ((numero_contrato, periodo), fecha_hora)
)
```

---

## Cómo se generan los datos

Los datos que muestra el visor son **simulados** (datos reales de clientes SEMAPA son privados). Se generan en dos pasos:

### Paso 1: Catálogos reales — `scripts-data/cargar_catalogos.js`
Lee CSVs exportados desde el Excel `Recursos Practica 5.xlsx` y carga en Cassandra:
- 15 distritos de Cochabamba (nombres, subalcaldía, población, coordenadas)
- 54 zonas con sus gateways LoRaWAN
- 9 categorías de tarifas con cargo fijo y rangos de precio por m³
- 5 modelos de medidores IoT
- 9 códigos de error IoT
- 4 gateways/radiobases

### Paso 2: Datos simulados — `scripts-data/generar_datos.js`
Genera aleatoriamente:
- **1000 usuarios** (nombres ficticios, CI/NIT ficticios)
- **1000 contratos** (uno por usuario, distribuidos entre los 15 distritos y 54 zonas reales)
- **1000 medidores** con MAC, modelo aleatorio, coordenadas dentro del área de Cochabamba
- **6 meses de lecturas** (período actual − 6 meses hasta período actual − 1)
- **Consumos mensuales** calculados con la fórmula real del tarifario SEMAPA:
  - Cargo fijo + precio por rango de m³ consumidos
  - Los rangos son: 0-12 m³ (mínimo), 13-25, 26-50, 51-75, 76-100, 101-150, 151+
  - Cada categoría de tarifa tiene precios diferentes por rango

**Los montos en Bolivianos son correctos** según el tarifario oficial. Solo los nombres, contratos y volúmenes de consumo son ficticios.

---

## Cómo levantar el visor

```bash
# 1. Levantar Cassandra + backend + visor
docker-compose up -d

# 2. Cargar schema (solo si se borró el volumen)
docker exec -i semapa-cassandra cqlsh < cassandra/schema.cql

# 3. Cargar catálogos reales (solo si se borró el volumen)
cd scripts-data && node cargar_catalogos.js

# 4. Generar datos simulados (solo si se borró el volumen)
cd scripts-data && node generar_datos.js

# 5. Obtener IP de la laptop
hostname -I | awk '{print $1}'

# 6. Abrir en celular (misma red WiFi o datos compartidos)
http://<IP>:5174
```

### Reconstruir el visor tras cambios en el código
```bash
docker-compose up -d --build visor
```

---

## Posibles modificaciones futuras

| Mejora | Dónde cambiar |
|--------|--------------|
| Agregar QR para pago en línea | `App.tsx` pantalla `pago`, generar QR con `qrcode.react` |
| Mostrar imagen del medidor | `App.tsx` pantalla `datos`, llamar a `/api/consultas/medidor/:serie` |
| Buscar por CI/NIT además de contrato | `server.js` endpoint `/api/visor/buscar`, consultar `usuarios_por_identificador` |
| Cambiar colores/logo | `index.css` variables CSS en `:root`, reemplazar `<Droplets>` por `<img>` |
| Soporte multiidioma (quechua) | Extraer textos a un objeto de traducciones en `App.tsx` |
| Timeout de inactividad (totem real) | `App.tsx` agregar `useEffect` con `setTimeout` que llame a `reiniciar()` |
| Impresión directa sin abrir PDF | Integrar `qz-tray` o `escpos` para comunicación directa con impresora térmica |
| Marcar período como pagado tras imprimir | `server.js` `POST /api/factura/generar`, actualizar `estado_facturacion` en Cassandra |
