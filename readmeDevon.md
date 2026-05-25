# readmeDevon — Correcciones de cálculo tarifario y regla 300 L/persona

**Autor:** Devon
**Rama:** `devLucas` (los cambios se aplicaron sobre esta rama)
**Fecha:** 2026-05-19
**Alcance:** AppRegistro (mobile-app) + scripts de carga/generación de datos

---

## Resumen ejecutivo

Se corrigieron **bugs críticos en el cálculo del cobro** de SEMAPA que afectaban tanto al backend como a AppRegistro, y se aplicó la **regla de 300 litros por habitante/día** en el generador de datos. También se unificó la URL de la API en la app móvil para evitar inconsistencias entre archivos de configuración.

### Lo que estaba mal (antes)

1. El cargador de catálogos interpretaba mal dos columnas del CSV de tarifas: tomaba el monto total como m³ y el precio unitario como cargo fijo.
2. El cálculo agregado del monto mensual en el generador usaba una fórmula lineal simplificada que ignoraba los bloques progresivos del reglamento.
3. El generador de lecturas usaba valores aleatorios sin relación con la realidad (`randomFloat(0, 1300)` litros por franja), produciendo consumos arbitrarios.
4. La URL de la API móvil estaba apuntada a 3 puertos distintos en 3 archivos diferentes.

### Lo que está bien (ahora)

1. `catalogo_tarifas` se carga con `consumo_minimo_m3 = 12` fijo para todas las categorías (según el reglamento) y `cargo_fijo` con el monto total real.
2. El cálculo agregado mensual usa el mismo `tarifaService.js` que el backend, respetando bloques progresivos.
3. Las lecturas diarias se calibran sobre la regla `300 L × habitantes_típicos_por_categoría`.
4. Toda la mobile-app apunta a `:8080` (Node, ya completo).

---

## Problemas identificados y corregidos

### Bug 1 — Mapeo incorrecto del CSV Tarifario

El CSV `Recursos/Recursos Practica 5 - Tarifario.csv` tiene dos columnas redundantes bajo el título "Fijo (12 m3/mes)":

```
fila 0:  .  .  Fijo (12 m3/mes)  .       .     .     .     ...
fila 1:  .  .  m3/mes            $us/mes 13-25 26-50 51-75 ...
fila 2:  .  R1 16.74             1.40    1.10  1.26  1.87  ...
fila 3:  .  R2 33.37             2.78    1.78  1.98  2.96  ...
fila 4:  .  R3 62.57             5.21    2.17  3.38  3.76  ...
```

- `row[2]` (16.74, 33.37, 62.57...) = **monto total** que se paga por los primeros 12 m³.
- `row[3]` (1.40, 2.78, 5.21...) = el **mismo monto pero por m³** (redundante: `row[2] / 12`).
- `row[4]` en adelante = precios por m³ de los bloques progresivos (13-25, 26-50, etc.).

**Verificación**: 16.74 / 12 = 1.395 ≈ 1.40; 62.57 / 12 = 5.214 ≈ 5.21.

El código viejo tomaba `row[2]` como m³ (consumo mínimo) y `row[3]` como cargo fijo, lo cual estaba conceptualmente invertido.

### Bug 2 — Cálculo agregado mensual ignoraba bloques progresivos

En `scripts-data/generar_datos.js`, el cálculo del `monto_bs` para `consumo_mensual_por_contrato` era:

```javascript
let monto = cargo_fijo;
if (consumo > consumo_minimo) {
  monto += (consumo - consumo_minimo) * rango_26_50;
}
```

Esto aplicaba el precio del bloque 26-50 a TODO el exceso, incluso si el consumo era 25 m³ (que debería usar solo el bloque 13-25) o 100 m³ (que debería usar 13-25, 26-50, 51-75 y 76-100 progresivamente).

### Bug 3 — Lecturas con valores arbitrarios

El loop de franjas usaba `randomFloat(0, 1300)` litros por franja diaria, sin relación con la categoría tarifaria ni con habitantes. Una vivienda R1 (sin habitantes) podía generar 800 m³/mes (industria).

### Bug 4 — URL móvil inconsistente

- `mobile-app/app.json` → puerto 8090 (backend-go, incompleto)
- `mobile-app/.env.example` → puerto 8080 (Node, ok)
- `mobile-app/src/config/api.ts` → fallback 8080

Si el desarrollador olvidaba crear `.env`, la app levantaba con la URL de `app.json` y apuntaba a Go, que aún no tiene todos los endpoints.

---

## Cambios por archivo

### 1. `scripts-data/cargar_catalogos.js`

**Función afectada:** `cargarTarifario()`, líneas ~150-175.

```diff
- const consumo_minimo = toDecimal(row[2]);   // 16.74, 33.37... tomados como m³ (MAL)
- const cargo_fijo = toDecimal(row[3]);       // 1.40, 2.78... tomados como monto (MAL)
+ // Reglamento SEMAPA Art.4: los primeros 12 m³ son fijos para todas las categorías.
+ // CSV col[2] (16.74, 33.37, ...) = monto TOTAL por esos 12 m³ → cargo_fijo.
+ // CSV col[3] (1.40, 2.78, ...) es redundante (= col[2]/12), se ignora.
+ const consumo_minimo = 12;
+ const cargo_fijo = toDecimal(row[2]);
```

**Resultado en Cassandra (`catalogo_tarifas`):**

| alias | consumo_minimo_m3 | cargo_fijo |
|---|---|---|
| R1 | 12 | 16.74 |
| R2 | 12 | 33.37 |
| R3 | 12 | 62.57 |
| R4 | 12 | 104.22 |
| C  | 12 | 125.16 |
| CE | 12 | 145.98 |
| I  | 12 | 112.64 |
| P  | 12 | 54.96 |
| S  | 12 | 91.72 |

### 2. `scripts-data/generar_datos.js`

#### Cambio 2a — Import del servicio de tarifa real

```diff
+ import { calcularMontoPorConsumo } from '../backend/src/services/tarifaService.js';
```

#### Cambio 2b — Constante de la regla SEMAPA

```diff
+ // Regla de negocio SEMAPA: consumo teórico de 300 L/habitante/día.
+ const LITROS_POR_HABITANTE_DIA = 300;
```

#### Cambio 2c — Tabla de habitantes típicos por categoría

Reemplaza el cálculo previo basado en habitantes por zona (que daba números absurdos porque dividía la población de una subalcaldía entera entre los pocos medidores generados):

```javascript
// Cada medidor = 1 vivienda. Habitantes típicos según Reglamento Art.4:
//   R1 (lotes baldíos, casas en litigio sin habitantes) → 1 persona
//   R2 (viviendas precarias 1-2 habitaciones)           → 2 personas
//   R3 (viviendas funcionales de 1 planta)              → 4 personas
//   R4 (viviendas multi-piso con todas las dependencias)→ 5 personas
const HABITANTES_TIPICOS = { R1: 1, R2: 2, R3: 4, R4: 5 };

// Consumo no-residencial por categoría (L/día base, antes de variabilidad)
const LITROS_DIA_NO_RESID = {
  C:  3000,  // comercial
  CE: 6000,  // comercial especial
  I:  5000,  // industrial
  P:  1500,  // preferencial
  S:  2500,  // social
};

function litrosDiaMedidor(tarifa) {
  if (HABITANTES_TIPICOS[tarifa] !== undefined) {
    return HABITANTES_TIPICOS[tarifa] * LITROS_POR_HABITANTE_DIA;
  }
  return LITROS_DIA_NO_RESID[tarifa] || 800;
}
```

#### Cambio 2d — Loop de generación de lecturas calibrado

```diff
+ const litrosDiaObjetivo = litrosDiaMedidor(med.tarifa);

  for (let dia = 1; dia <= diasEnMes; dia++) {
+   const factorDia = randomFloat(0.7, 1.3);     // variabilidad diaria ±30%
+   const litrosDia = litrosDiaObjetivo * factorDia;
    const franjas = [
-     { hora: randomInt(0,7), max: 1300 },
-     { hora: randomInt(8,15), max: 380 },
-     { hora: randomInt(16,23), max: 190 },
+     { hora: randomInt(0,7),   share: 0.20 },   // 20% madrugada
+     { hora: randomInt(8,15),  share: 0.50 },   // 50% mañana
+     { hora: randomInt(16,23), share: 0.30 },   // 30% tarde/noche
    ];
    for (const fr of franjas) {
-     let litros = ['R1','R2','R3','R4'].includes(med.tarifa)
-       ? randomFloat(0, fr.max) : randomFloat(0, 250);
+     let litros = litrosDia * fr.share * randomFloat(0.8, 1.2);  // ±20% por franja
      ...
    }
  }
```

#### Cambio 2e — Cálculo del monto agregado mensual

```diff
- let monto = tarifa ? parseFloat(tarifa.cargo_fijo || 0) : 0;
- if (tarifa && data.consumo > parseFloat(tarifa.consumo_minimo_m3 || 0)) {
-   monto += (data.consumo - parseFloat(tarifa.consumo_minimo_m3 || 0)) * parseFloat(tarifa.rango_26_50 || 2);
- }
+ // Usar el mismo servicio que el backend para respetar bloques progresivos.
+ const monto = tarifa
+   ? calcularMontoPorConsumo(data.consumo, tarifa).montoBs
+   : 0;
```

### 3. `mobile-app/app.json`

```diff
- "apiUrl": "http://192.168.1.100:8090/api"
+ "apiUrl": "http://192.168.1.100:8080/api"
```

### 4. `mobile-app/src/config/api.ts`

Solo se actualizó el comentario para reflejar que Node (`:8080`) es el default oficial mientras Go esté incompleto. El `fallback` ya era `:8080`.

---

## Lo que NO se tocó (intencionalmente)

- **`backend/src/services/tarifaService.js`** y **`backend-go/internal/services/tarifa.go`** — la lógica de bloques progresivos ya estaba bien escrita; el bug eran los datos que recibía, no el cálculo.
- **Moneda** — el sistema sigue almacenando `moneda='USD'` en `catalogo_tarifas` y respondiendo `montoBs` en las APIs. Si en algún momento se decide aclarar moneda real (Bs vs USD), es otra tarea separada.
- **`mobile-app/app/(tabs)/facturacion.tsx`** — se conserva el `Alert` que ya estaba; no se agregó vista de detalle de bloques (pedido del usuario).
- **`cassandra/schema.cql`** — no se modifica nunca (restricción del proyecto).

---

## Verificación de cobro correcto (trace manual)

Con los datos nuevos correctamente cargados, los siguientes casos deben dar estos resultados desde el endpoint `POST /api/calcular-factura`:

| Tarifa | Consumo (m³) | Cálculo | Monto |
|---|---|---|---|
| R1 | 10 (≤12) | solo cargo fijo | **Bs 16.74** |
| R3 | 25 | 62.57 + 13 × 2.17 | **Bs 90.78** |
| R4 | 60 | 104.22 + 13×2.58 + 25×2.80 + 10×4.39 | **Bs 251.66** |
| CE | 200 | 145.98 + bloques completos | **Bs ≈ 1.952** |

Casos típicos según la regla 300 L/persona:

| Categoría | Hab. | L/día base | m³/mes prom. | Factura mensual aprox. |
|---|---|---|---|---|
| R1 | 1 | 300 | ~9 | ~16.74 (cargo fijo solo) |
| R2 | 2 | 600 | ~18 | ~44.05 |
| R3 | 4 | 1.200 | ~36 | ~127.96 |
| R4 | 5 | 1.500 | ~45 | ~193.76 |

---

## Cómo levantar el proyecto con Docker (de cero)

El proyecto está completamente dockerizado en [docker-compose.yml](docker-compose.yml). Los servicios definidos son:

| Servicio | Puerto | Imagen / Build | Notas |
|---|---|---|---|
| `cassandra` | 9042 | `cassandra:4.1` | Base de datos NoSQL — siempre en Docker |
| `backend` | 8080 | `./backend` | API Node/Express MVC (dashboards) |
| `backend-go` | 8090 | `./backend-go` | API Go (mobile-app AppRegistro) |
| `frontend` | 5173 | `./frontend` | React + Vite (3 dashboards) |
| `visor` | 5174 | `./visor` | Visor de búsqueda |

El `mobile-app` (Expo Go) NO está en Docker — se corre con `npx expo start` en local.

### Pre-requisitos en la máquina anfitriona

| Herramienta | Para qué | Cómo instalar |
|---|---|---|
| **Docker Desktop** | Correr los containers | https://docker.com/products/docker-desktop |
| **Node.js ≥ 20** | Solo para `scripts-data` y `mobile-app` (no para servicios dockerizados) | https://nodejs.org |
| **pnpm** | Gestor de paquetes (más rápido que npm) | Ver "Instalar pnpm" abajo |

#### Instalar pnpm (si no lo tienes)

```powershell
# Opción A — Corepack (recomendada, viene con Node 16.13+)
# Abrir PowerShell como Administrador:
corepack enable
corepack prepare pnpm@latest --activate

# Opción B — Standalone (sin admin)
iwr https://get.pnpm.io/install.ps1 -useb | iex
# Cierra y reabre PowerShell

# Verificar
pnpm -v   # debe imprimir 9.x o 10.x
```

### Arranque desde cero (flujo completo, ~7 minutos)

```powershell
# 1. Limpiar Docker (borra datos previos)
docker compose down -v

# 2. Levantar SOLO Cassandra primero (los otros servicios dependen de ella)
docker compose up -d cassandra

# 3. Esperar a que esté saludable (~60-90 seg)
# Repite hasta que diga "healthy":
docker inspect -f '{{.State.Health.Status}}' semapa-cassandra

# 4. Cargar el schema (BOM workaround usando docker cp)
docker cp cassandra/schema.cql semapa-cassandra:/tmp/schema.cql
docker exec semapa-cassandra cqlsh -f /tmp/schema.cql

# 5. Verificar que las 25 tablas se crearon
docker exec semapa-cassandra cqlsh -e "USE semapa; DESC TABLES;"

# 6. Instalar deps de scripts-data y cargar catálogos
Set-Location scripts-data
pnpm install
pnpm run cargar-catalogos
# Debe imprimir: 9 errores, 4 gateways, 5 modelos, 9 tarifas, 12 tipos, 15 distritos, 54 zonas

# 7. Cargar DATOS REALES desde CSVs (~5-7 min: 100k contratos, 248k lecturas)
pnpm run cargar-csvs
# Imprime progreso: usuarios → contratos → infraestructuras → medidores → lecturas → consumo mensual → preavisos
Set-Location ..

# 8. Levantar el resto de servicios (backend Node, backend-go, frontend, visor)
docker compose up -d backend backend-go frontend visor

# 9. Verificar que todos los containers están up
docker compose ps
```

### Abrir los dashboards

| URL | Para qué |
|---|---|
| http://localhost:5173/contabilidad | Dashboard 3 (facturación, cartera vencida, preavisos) |
| http://localhost:5173/administracion | Dashboard 2 errores + lecturas vía app móvil |
| http://localhost:5173/operacional | Dashboard 2 consumo + medidores |
| http://localhost:5173/alcaldia | Dashboard 1 (Smart City / ODS) |
| http://localhost:5174 | Visor de búsqueda |
| http://localhost:8090/health | Healthcheck backend-go (mobile API) |

### Configurar SMTP para Aviso de Cobranza por email (opcional)

El endpoint `POST /api/mvc/contabilidad/aviso-cobranza` puede enviar emails reales con nodemailer. Sin `.env` usa el fallback hardcodeado en [backend/email.js](backend/email.js); con `.env` usa tus credenciales.

```powershell
# Crear backend/.env (NO subir al repo, ya está en .gitignore)
@"
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tuapppasswordsinespacios
SMTP_FROM=SEMAPA Cobranzas <tu_correo@gmail.com>
"@ | Out-File -Encoding utf8 backend\.env

# Para que el backend (dockerizado) lea ese .env, hay que agregarlo al docker-compose.yml
# en el servicio "backend":
#   env_file:
#     - ./backend/.env

# Luego rebuildear:
docker compose up -d --build backend
```

> **App Password de Gmail:** generar en https://myaccount.google.com/apppasswords (requiere 2FA activado). El valor son 16 letras minúsculas en grupos de 4 — al guardar en `.env`, quita los espacios.

### Levantar la mobile-app (Expo Go) — fuera de Docker

```powershell
Set-Location mobile-app
pnpm install
npx expo start

# Escanear el QR con la app "Expo Go" en tu teléfono.
# La app apunta a http://<IP_LAN>:8080 — configurar en mobile-app/.env si es necesario.
```

---

## Flujo de modificación (cuando ya está corriendo en Docker)

### Modificaste código del backend Node (`backend/src/...`)

```powershell
# Rebuild solo el container del backend
docker compose up -d --build backend

# Ver logs si algo falla
docker compose logs -f backend
```

### Modificaste código del backend-go (`backend-go/...`)

```powershell
docker compose up -d --build backend-go
docker compose logs -f backend-go
```

### Modificaste el frontend (`frontend/src/...`)

```powershell
# Vite HMR funciona DENTRO del container — los cambios se ven en tiempo real
# si el container monta el código como volumen. Si no, rebuild:
docker compose up -d --build frontend
```

> **Alternativa para iteración rápida:** sacar el frontend de Docker temporalmente y correrlo local:
> ```powershell
> docker compose stop frontend
> Set-Location frontend
> pnpm install   # solo la primera vez
> pnpm dev       # hot-reload nativo en http://localhost:5173
> ```

### Modificaste el schema Cassandra (`cassandra/schema.cql`)

⚠️ Destructivo si haces `down -v`. Alternativas:

```powershell
# Opción A — preservar datos: ALTER TABLE manual
docker exec -it semapa-cassandra cqlsh
> USE semapa;
> ALTER TABLE lecturas_por_medidor_mes ADD nueva_columna text;

# Opción B — reset completo (perderás los datos cargados, ~7 min para repoblar)
docker compose down -v
# Repetir pasos 2-8 del arranque desde cero
```

### Modificaste un loader (`scripts-data/cargar_*.js`)

```powershell
# Truncar selectivamente las tablas afectadas (evita re-arrancar Cassandra)
docker exec semapa-cassandra cqlsh -e "USE semapa; TRUNCATE consumo_mensual_por_contrato; TRUNCATE notificaciones_por_contrato; TRUNCATE lecturas_por_medidor_mes;"

Set-Location scripts-data
pnpm run cargar-csvs
```

### Reiniciar todo sin perder datos

```powershell
docker compose restart
# o un servicio específico:
docker compose restart backend
```

### Apagar todo (preservando datos)

```powershell
docker compose stop
# Los volúmenes y datos se mantienen. Para retomar:
docker compose start
```

### Apagar y borrar TODO (incluido el volumen de Cassandra)

```powershell
docker compose down -v
```

---

## Validar que el cálculo tarifario sigue correcto

### En Cassandra (catálogo)

```powershell
docker exec semapa-cassandra cqlsh -e "SELECT alias,consumo_minimo_m3,cargo_fijo FROM semapa.catalogo_tarifas;"
```

Debe mostrar `consumo_minimo_m3 = 12` para las 9 filas y `cargo_fijo` entre 16.74 y 145.98.

### En la API (cálculo real)

```powershell
# Login al backend-go (mobile API)
$body = '{"username":"lector1","password":"lector123"}'
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8090/api/auth/login" -ContentType "application/json" -Body $body
$token = $login.accessToken

# Calcular R3 con 25 m³ → debe devolver montoBs: 90.78
$calc = '{"consumo_m3":25,"tarifa_alias":"R3"}'
Invoke-RestMethod -Method Post -Uri "http://localhost:8090/api/calcular-factura" `
  -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $calc
```

### En AppRegistro (mobile)

1. Pestaña **Tarifas**
2. Consumo: `25`
3. Tarifa: `R3`
4. Botón **Calcular factura**
5. Debe abrir un Alert con: `Monto: Bs 90.78 · Categoría: Residencial · Exceso: 13 m³`

---

## Troubleshooting Docker

### "No host could be resolved" al conectarse a Cassandra

El container `backend` espera que `cassandra` esté **healthy**, no solo "up". Si arrancan en paralelo y backend se conecta antes:

```powershell
docker compose restart backend
```

### Cassandra no arranca / loop de reinicio

Cassandra 4.1 necesita ~2 GB RAM disponibles. Si Docker Desktop tiene menos:
- Settings → Resources → aumentar Memory a 4 GB mínimo
- Reiniciar Docker Desktop

### `cqlsh: Invalid syntax at line 1, char 1`

El archivo `schema.cql` está guardado con BOM (UTF-16 LE). Solución usada en este proyecto:

```powershell
docker cp cassandra/schema.cql semapa-cassandra:/tmp/schema.cql
docker exec semapa-cassandra cqlsh -f /tmp/schema.cql
```

### `pnpm: comando no reconocido` después de instalar Corepack

Cierra y reabre PowerShell. Si persiste, instala con la **Opción B** (standalone).

### El loader `cargar-csvs` falla en la verificación final con timeout

Es esperado: `SELECT COUNT(*) FROM lecturas_por_medidor_mes` sobre 248k filas hace timeout en Cassandra. **Los datos sí se cargaron correctamente.** Verifica con:

```powershell
docker exec semapa-cassandra cqlsh -e "SELECT periodo, monto_bs, estado_facturacion FROM semapa.consumo_mensual_por_contrato LIMIT 5;"
```

---

## Pendientes / observaciones

Estos puntos quedaron identificados pero NO se tocaron en esta tanda. Si en algún momento alguien los quiere abordar:

- **Backend Go (`:8090`)** sigue sin el endpoint `/api/lorawan/simular-batch` que sí invoca `mobile-app/src/api/endpoints.ts:60`. Si la app apunta a Go, ese botón falla.
- **Backend Go `Refresh`** ([handlers.go:55-64](backend-go/internal/handlers/handlers.go#L55-L64)) es un placeholder que devuelve el mismo token sin validar JWT.
- **Categoría M (Mixto)** del Art.4 del reglamento no existe en `catalogo_tarifas` ni en el CSV.
- **Alcantarillado** no está implementado como línea separada en la factura (Art.6 menciona Bs 17 / 31.5 / 45 m³ / etc. por categoría).
- **Descuento 40% por pago al contado** (Art.27 del reglamento) no implementado.
- **Factor K** para descarga industrial de curtiembres/jeans/lavanderías (Cap. VIII-IX) no implementado.
- **`mobile-app/.env`** — recordatorio: NO subir al repo; solo va `.env.example`.

---

## Archivos modificados (resumen rápido)

| Archivo | Líneas | Tipo de cambio |
|---|---|---|
| `scripts-data/cargar_catalogos.js` | ~154-156 | Bugfix mapeo CSV |
| `scripts-data/generar_datos.js` | ~7, ~14, ~196-216, ~225, ~295 | Regla 300 L + cálculo monto correcto |
| `mobile-app/app.json` | 33 | URL API unificada (8080) |
| `mobile-app/src/config/api.ts` | 3-5 | Comentario aclaratorio |

---

*Cualquier duda sobre la lógica de tarifa, ver el trace explicativo en este mismo readme (sección "Bug 1") o consultar el `Reglamento Interno de Política Tarifaria SEMAPA` (PDF en la raíz del repo).*

---

## por si Vite molesta 
Si te aparece otro error después
Es probable que aparezcan más dependencias faltantes (el package.json del frontend está bastante incompleto — usa recharts, react-leaflet, etc., y esos también necesitan tener React peer-installado pero ya lo tendrás).

Si Vite se queja de algo más tipo "Cannot find module 'X'", el patrón es el mismo:


pnpm add X