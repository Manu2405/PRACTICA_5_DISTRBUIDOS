# readmeDevon — Informe completo SEMAPA Práctica 5

**Última actualización:** 2026-05-26
**Rama:** `devDevonA`
**Autor:** Devon
**Repositorio:** https://github.com/Manu2405/PRACTICA_5_DISTRBUIDOS

---

## Resumen ejecutivo

Sistema distribuido para SEMAPA Cochabamba con:
- **Cassandra** (Docker) con 25 tablas + índice secundario, 100 k contratos / 248 k lecturas reales del CSV cargados
- **Backend Node** (puerto 8080) — dashboards + 25 consultas + visor + preavisos + email real
- **Backend Go** (puerto 8090) — API móvil con `origen='app_movil'` en lecturas
- **Frontend React** (puerto 5173) — 6 dashboards funcionando
- **Visor totem** (puerto 5174) — búsqueda por contrato / CI / MAC + pago + email
- **Mobile-app Expo Go** — registro de lecturas con máscara MAC
- **Documentos de defensa:** `CONSULTAS.md`, `CONSULTAS_DOCKER.md`, `DocP/HISTORIAL.md`

---

# 📦 PARTE 1 — Levantar el proyecto desde cero

## 1.1 Pre-requisitos (instalación una sola vez)

| Software | Para qué | Cómo |
|---|---|---|
| **Docker Desktop** | Correr Cassandra (+ opcional backend-go, frontend, visor) | https://docker.com/products/docker-desktop |
| **Node.js ≥ 20** | Para correr backend Node, scripts-data, expo, frontend local | https://nodejs.org |
| **pnpm** | Gestor de paquetes (corepack viene con Node 20+) | Ver "Instalar pnpm" abajo |

### Instalar pnpm (Corepack — método recomendado)

PowerShell **como Administrador**:
```powershell
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v   # debe imprimir 9.x o superior
```

Si Corepack falla por permisos, alternativa sin admin:
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
# Cierra y reabre PowerShell
pnpm -v
```

## 1.2 Instalar dependencias de cada subproyecto

⚠️ **Cada subproyecto tiene su propio `package.json`**. Hay que correr `pnpm install` en CADA uno.

```powershell
# Desde la raíz del proyecto:

# 1) Backend Node
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\backend"
pnpm install

# 2) Frontend (dashboards)
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\frontend"
pnpm install

# 3) Visor (totem ciudadano)
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\visor"
pnpm approve-builds   # ⚠️ marca esbuild con espacio + Enter + 'y'
pnpm install

# 4) Scripts de carga de datos
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\scripts-data"
pnpm install

# 5) Mobile-app (Expo)
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\mobile-app"
pnpm install
# Si Expo falla por modules, agregar:
pnpm add react-native-css-interop
```

> 🔑 **Visor requiere `pnpm approve-builds`** — pnpm 11 bloquea scripts de instalación de paquetes por seguridad. Esbuild (que usa Vite) necesita ese permiso para compilar binarios nativos. Aparece menú interactivo, selecciona `esbuild` con espacio, Enter para confirmar, 'y' para aprobar.

## 1.3 Configurar archivos `.env` (una sola vez)

### `backend/.env`

Contenido exacto (sin nada más):
```
CASSANDRA_HOST=localhost
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tuapppasswordsinespacios
SMTP_FROM=SEMAPA Cobranzas <tu_correo@gmail.com>
```

> Para SMTP_PASS necesitas una **App Password** de Gmail (no tu contraseña normal). Genérala en https://myaccount.google.com/apppasswords con 2FA activado.

### `mobile-app/.env`

Contenido (cambia la IP a la de tu PC en la red local):
```
EXPO_PUBLIC_API_URL=http://192.168.137.1:8080/api
```

> Si usas tu hotspot de Windows, la IP siempre es `192.168.137.1`. Si usas WiFi compartida, corre `ipconfig` para ver tu IPv4.

### `.gitignore` ya cubre `.env` recursivamente
Los `.env` NO se suben al repo automáticamente.

## 1.4 Levantar Cassandra en Docker

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS"

# Limpieza inicial (si tenías algo anterior)
docker compose down -v

# Levantar SOLO Cassandra (sin levantar backend/frontend dockerizados)
docker compose up -d cassandra

# Esperar ~90 seg hasta que esté healthy
docker inspect -f '{{.State.Health.Status}}' semapa-cassandra
# Repite el comando hasta que diga: healthy
```

## 1.5 Cargar el schema Cassandra (25 tablas)

⚠️ El archivo `schema.cql` tiene BOM UTF-8 — hay que copiarlo al container con `docker cp` antes de ejecutarlo:

```powershell
docker cp cassandra/schema.cql semapa-cassandra:/tmp/schema.cql
docker exec semapa-cassandra cqlsh -f /tmp/schema.cql

# Verificar que se crearon las 25 tablas
docker exec semapa-cassandra cqlsh -e "USE semapa; DESC TABLES;"
```

## 1.6 Cargar catálogos (rápido, ~5 segundos)

Datos pequeños: distritos, tarifas, modelos de medidor, errores IoT, gateways.

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\scripts-data"
pnpm run cargar-catalogos
# Espera mensajes de "✅" para cada tabla
```

## 1.7 Cargar los datos REALES desde los CSVs (~5-8 min)

100 k contratos + 80 k infraestructuras + 120 k medidores + 248 k lecturas:

```powershell
pnpm run cargar-csvs
# Tarda 5-8 minutos. Va imprimiendo progreso "contratos: 50000/100000"...
```

> ⚠️ El loader puede dar un error al final del tipo "Server failure" — eso es porque la verificación final hace `COUNT(*)` sobre 248k filas y Cassandra hace timeout. **Los datos SÍ se cargaron correctamente** (lo confirma con queries más simples).

---

# 🚀 PARTE 2 — Arrancar el proyecto día a día

Cada servicio en **su propia terminal**. Mantenlas abiertas mientras trabajas.

## 2.1 Backend Node (dashboards + API REST, puerto 8080)

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\backend"
pnpm start
```

Debes ver:
```
✅ Cassandra conectada
🚀 SEMAPA Backend en http://localhost:8080 (MVC Activo)
```

## 2.2 Frontend de dashboards (puerto 5173)

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\frontend"
pnpm dev
```

URLs disponibles:
- http://localhost:5173/contabilidad
- http://localhost:5173/administracion
- http://localhost:5173/operacional
- http://localhost:5173/alcaldia
- http://localhost:5173/consultas (las 25 consultas estratégicas)
- http://localhost:5173/factura (generar PDF de recibo)

## 2.3 Visor / Totem ciudadano (puerto 5174)

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\visor"
pnpm dev
```

URL: http://localhost:5174

## 2.4 Backend-Go (puerto 8090, opcional — solo para mobile)

```powershell
# Está dockerizado, lo levantas con:
docker compose up -d backend-go

# Verificar:
curl http://localhost:8090/health
```

## 2.5 Mobile-app (Expo Go) — ver sección 4 para instrucciones detalladas

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\mobile-app"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.137.1"
pnpm start
```

---

# 🛠️ PARTE 3 — Imprevistos comunes y cómo arreglarlos

## 3.1 Procesos zombie ocupando puertos

**Síntoma:** al hacer `pnpm start` sale `Error: listen EADDRINUSE: address already in use :::8080` o el comando termina con `[ELIFECYCLE] Command failed with exit code 1`.

**Causa:** un proceso anterior quedó corriendo sin cerrarse bien.

**Solución — matar el proceso del puerto:**

```powershell
# Liberar un puerto específico (ejemplo: 8080)
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Liberar TODOS los puertos del proyecto de una vez
8080, 8081, 5173, 5174, 19000, 19001 | ForEach-Object {
  $p = $_
  Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    "Liberado puerto $p (PID $($_.OwningProcess))"
  }
}
```

## 3.2 Backend Node: `NoHostAvailableError: No host could be resolved`

**Síntoma:** el backend no puede conectarse a Cassandra.

**Causa:** la variable `CASSANDRA_HOST` apunta a `cassandra` (hostname dentro de Docker) pero estás corriendo el backend **local** (no en Docker).

**Solución:** verifica que `backend/.env` tenga:
```
CASSANDRA_HOST=localhost
```

## 3.3 Visor: `[ERR_PNPM_IGNORED_BUILDS] esbuild`

**Síntoma:** `pnpm install` falla con "Ignored build scripts: esbuild@0.25.12".

**Causa:** pnpm 11 bloquea scripts de instalación por seguridad.

**Solución:**
```powershell
Set-Location visor
pnpm approve-builds
# Selecciona esbuild con espacio, Enter, y luego 'y'
pnpm install
```

## 3.4 Mobile-app: `Unable to resolve "react-native-css-interop/jsx-runtime"`

**Síntoma:** Expo Go en el celular muestra un error rojo con stack trace mencionando `react-native-css-interop`.

**Causa:** NativeWind 4 inyecta este import automáticamente, pero a veces el paquete no se instala como dependencia transitiva.

**Solución:**
```powershell
Set-Location mobile-app
pnpm add react-native-css-interop
npx expo start --clear   # --clear limpia caché de Metro
```

## 3.5 Expo: el QR muestra `exp://127.0.0.1:8081` y el celular no conecta

**Síntoma:** escaneas el QR pero la app no carga en el celular.

**Causa:** Expo no detectó la IP de la LAN y usa `127.0.0.1` (que es la PC misma — el celular nunca llega ahí).

**Solución:** forzar la IP de la LAN:
```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.137.1"
pnpm start
```

> Cambia `192.168.137.1` por la IP que veas con `ipconfig` (busca "IPv4 Address" del adaptador WiFi o "Mobile Hotspot").

## 3.6 Schema Cassandra: `cqlsh: Invalid syntax at line 1, char 1`

**Síntoma:** al cargar `schema.cql` con pipe (`Get-Content | docker exec -i`) sale error de sintaxis.

**Causa:** el archivo tiene BOM (UTF-8 con marca de orden de bytes) que cqlsh no parsea.

**Solución:** copiarlo dentro del container con `docker cp`:
```powershell
docker cp cassandra/schema.cql semapa-cassandra:/tmp/schema.cql
docker exec semapa-cassandra cqlsh -f /tmp/schema.cql
```

## 3.7 Cassandra `Server failure during read query`

**Síntoma:** una query a la DB devuelve `Server failure during read query at consistency LOCAL_ONE`.

**Causa:** la query hace scan completo de una tabla muy grande (ej. `SELECT COUNT(*) FROM lecturas_por_medidor_mes` sobre 248k filas) y Cassandra hace timeout.

**Solución:** filtrar por PK o usar índice. Por ejemplo:
```powershell
# ❌ MAL — scan completo
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT * FROM lecturas_por_medidor_mes;"

# ✅ BIEN — filtrar por PK (numero_serie + periodo)
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT * FROM lecturas_por_medidor_mes WHERE numero_serie = '0E0C558E3A0F' AND periodo = '2026-03';"
```

## 3.8 Cómo cerrar correctamente cada servicio (evitar zombies futuros)

| Servicio | Cierre normal |
|---|---|
| Backend Node | `Ctrl + C` en la terminal — esperar prompt vacío |
| Frontend Vite | `Ctrl + C` |
| Visor Vite | `Ctrl + C` |
| Expo Metro | `Ctrl + C` × 2 (te pide confirmar) |
| Cassandra | `docker compose stop cassandra` (mantiene volumen y datos) |

⚠️ **NO** uses `docker compose down -v` salvo que quieras borrar TODO (incluidos los 100k contratos cargados — perderías ~8 min de carga).

---

# 📱 PARTE 4 — Inicializar la mobile-app (paso a paso)

> ⏱️ Tardó bastante por errores de red y módulos. Esta sección documenta cada paso para que sea rápido la próxima vez.

## 4.1 Pre-requisitos

1. **Expo Go** instalado en el celular (Play Store / App Store)
2. **PC y celular en la misma red WiFi** — sin esto NO funciona
3. **Dependencias instaladas** (`pnpm install` en `mobile-app/`)
4. **Backend Node corriendo** en puerto 8080

## 4.2 Saber la IP de tu PC

```powershell
ipconfig | findstr "IPv4"
```

Ejemplos según tu setup:

| Setup | IP típica |
|---|---|
| Mobile Hotspot de Windows | `192.168.137.1` |
| WiFi de casa/oficina | `192.168.0.x` o `192.168.1.x` |
| Cable Ethernet | depende de tu router |

## 4.3 Configurar `mobile-app/.env`

Crea el archivo con esta única línea (cambia la IP):
```
EXPO_PUBLIC_API_URL=http://192.168.137.1:8080/api
```

⚠️ **NO** pegues comandos PowerShell aquí — solo la línea de la variable.

## 4.4 Permitir Node.js en el firewall (una sola vez)

PowerShell **como administrador**:
```powershell
New-NetFirewallRule -DisplayName "SEMAPA-LAN" `
  -Direction Inbound `
  -LocalPort 8080,8081 `
  -Protocol TCP -Action Allow -Profile Any
```

## 4.5 Activar hotspot (si lo usas)

Configuración de Windows → Red → **Mobile Hotspot → On**. Conecta tu celular a esa red WiFi creada.

## 4.6 Arrancar el backend Node (terminal 1)

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\backend"
pnpm start
```

Espera ver: `🚀 SEMAPA Backend en http://localhost:8080`.

## 4.7 Test rápido desde el celular ANTES de Expo

Antes de arrancar Expo, **verifica que el celu vea a la PC**. En el navegador del celu abre:
```
http://192.168.137.1:8080/api/mvc/contabilidad/facturacion-mensual
```

| Resultado | Acción |
|---|---|
| ✅ Ves JSON con datos | Tu red está OK, sigue al paso 4.8 |
| ❌ No conecta | Revisa: hotspot activo, IP correcta, firewall, celu conectado al hotspot |

## 4.8 Arrancar Expo (terminal 2)

```powershell
Set-Location "d:\P5\Proyecto5P\PRACTICA_5_DISTRBUIDOS\mobile-app"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.137.1"
pnpm start
```

**Verifica que el QR muestre la IP correcta**, no `127.0.0.1`:
```
› Metro waiting on exp://192.168.137.1:8081
```

Si dice `127.0.0.1`, salta a la sección 3.5.

## 4.9 Conectar el celular

1. Abre **Expo Go** en el celular
2. Toca "Scan QR code"
3. Escanea el QR de la terminal
4. La app se descarga (~30 seg primera vez) y abre

## 4.10 Login y probar registro de lectura

Credenciales de prueba:
- Usuario: `lector1`
- Contraseña: `lector123`

Una vez dentro:
1. Pestaña **"Registro"**
2. Campo MAC — escribe `0E:0C:55:8E:3A:0F` (formato automático con la máscara)
3. Toca "Buscar medidor"
4. Aparece **lectura anterior real**
5. Ingresa lectura actual mayor (ej. si anterior es `1862`, pon `1900`)
6. Toca "Guardar lectura"

## 4.11 Verificar que se guardó en Cassandra

Desde PowerShell:
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT fecha_hora, lectura_actual_m3, origen FROM lecturas_por_medidor_mes WHERE numero_serie = '0E0C558E3A0F' AND periodo = '2026-05';"
```

Debe aparecer una fila reciente con `origen = app_movil` ✅.

---

# 🧩 PARTE 5 — Funcionalidad implementada por componente

## 5.1 Cassandra (schema)

**Archivo:** [cassandra/schema.cql](cassandra/schema.cql)

### Tablas (25 totales)
- **Catálogos (7):** distritos, zonas, tarifas, modelos de medidor, errores IoT, gateways, tipos de infraestructura
- **Operativas (4):** usuarios, contratos, infraestructura, infraestructura por zona
- **Medidores (4):** por serie, por MAC, por distrito-zona, por radiobase-zona
- **Lecturas (4):** por medidor-mes, por distrito-hora, consumo mensual, consumo por distrito-tarifa
- **Errores (2):** por modelo-mes, por distrito-zona
- **Dashboards (3):** resumen operacional, top consumidores, ingresos por tarifa
- **Notificaciones (1):** notificaciones por contrato

### Cambios introducidos
- **Columna `origen`** en `lecturas_por_medidor_mes` (`iot` / `app_movil` / `manual`)
- **Columnas `lectura_anterior_m3` y `lectura_actual_m3`** en `lecturas_por_medidor_mes` (para registrar la lectura real del medidor, no solo el consumo)
- **Columnas `fecha_emision`, `fecha_vencimiento`, `fecha_pago`, `dias_atraso`** en `consumo_mensual_por_contrato` (cartera vencida real, sin mock)
- **Columna `tipo`** en `notificaciones_por_contrato` (`preaviso` / `aviso_cobranza`)
- **Índice secundario** `contratos_por_ci_idx` sobre `contratos_por_numero(identificador_titular)` — habilita búsqueda por CI sin scan completo

## 5.2 Backend Node (puerto 8080) — el principal

**Carpeta:** [backend/](backend/)

### Controllers modificados / creados

| Controller | Funcionalidad |
|---|---|
| `contabilidadController.js` | Cartera vencida real (sin mock hash) usando `estado_facturacion` y `dias_atraso`. Endpoint `getPreavisos` nuevo. Aviso de cobranza envía email real con PDF adjunto |
| `administracionController.js` | Endpoint `getLecturasApp` que cuenta lecturas con `origen='app_movil'` para el KPI Obligatorio del D2 |
| `consultasController.js` | **Las 25 consultas del PDF** implementadas como funciones `q1..q25` + dispatcher `GET /api/consultas/:id` |
| `visorController.js` | Búsqueda multi-formato (contrato/CI/MAC) + normalización de prefijos + endpoint `pagar` para marcar facturas como pagadas |
| `mobile/lecturasController.js` | `POST /api/lecturas` inserta con `origen='app_movil'`, `lectura_actual_m3`, `lectura_anterior_m3`. Acepta MAC con o sin `:` |
| `mobile/medidoresController.js` | `GET /api/medidores/:codigo` busca la última lectura real del medidor across periodos para devolver `lecturaAnterior` correcta a la app |

### Email + PDF

- **email.js** refactorizado: lee credenciales SMTP de `.env`, exporta `enviarPreavisoCobranza()` con HTML rojo de urgencia
- **pdf.js** ampliado: nueva función `generarAvisoCobranzaPDF()` con formato similar al recibo oficial SEMAPA — datos del titular, historial 6 meses, conceptos (Agua/Alcantarillado/Rep. Formulario), importe en letras, fecha de vencimiento, observación
- El email del aviso de cobranza adjunta automáticamente el PDF generado

## 5.3 Backend Go (puerto 8090) — API móvil

**Carpeta:** [backend-go/](backend-go/)

### Cambios

- **Función `normalizeMedidorCodigo`** acepta MAC con o sin `:` (XX:XX:XX:XX:XX:XX o XXXXXXXXXXXX)
- **`POST /api/lecturas`** inserta con:
  - `origen = 'app_movil'`
  - `lectura_actual_m3` y `lectura_anterior_m3` (campos reales del medidor)
  - Calcula `consumo_m3 = lectura_actual - lectura_anterior`
- **`GET /api/medidores/:codigo`** prioriza `lectura_actual_m3` sobre `lectura_m3` para mostrar la lectura real del medidor en la app

## 5.4 Frontend dashboards (puerto 5173)

**Carpeta:** [frontend/](frontend/)

### 6 páginas

| Página | Estado |
|---|---|
| **ContabilidadPage** | Cartera vencida con datos reales + nueva sección de **Preavisos emitidos** (KPIs + BarChart por canal) + aviso de cobranza con prompt de email destino |
| **AdministracionPage** | **KPI nuevo "Lecturas registradas vía app móvil"** + BarChart por distrito + empty state |
| **OperacionalPage** | KPIs de consumo, medidores activos, top 10 zonas (cumple obligatorios del D2) |
| **AlcaldiaPage** | Vista Smart City con KPIs y mapa GeoJSON de distritos |
| **ConsultasPage** | **Las 25 consultas** del PDF — clickeas y se ejecutan. Filtros de período y distrito |
| **FacturaPage** | Generación de PDF de recibo + envío por email |

## 5.5 Visor / Totem ciudadano (puerto 5174)

**Carpeta:** [visor/](visor/)

### Funcionalidad

- **Pantalla bienvenida** con botón "Consultar mi cuenta"
- **Buscador** con teclado numérico en pantalla — acepta formatos:
  - Número de contrato `CONT-XX-XXXXXX` o `CT-XXXXXXXX` o solo dígitos
  - **CI** del titular (con o sin sufijo de departamento)
  - **MAC** del medidor (con o sin `:`)
- **Pantalla de datos** muestra cliente + historial 6 meses con estado de cada factura
- **Opciones de pago:**
  - Enviar comprobante por email (teclado QWERTY en pantalla)
  - Imprimir en rollo térmico 55 mm
- **Pantalla de éxito** con countdown y reinicio automático

### Endpoint backend nuevo

- **`POST /api/visor/pagar`** marca facturas como pagadas: actualiza `estado_facturacion = 'pagado'`, `fecha_pago = now()`, `dias_atraso = 0`

## 5.6 Mobile-app — AppRegistro (Expo Go)

**Carpeta:** [mobile-app/](mobile-app/)

### Funcionalidad (Entregable 4 del PDF — Obligatorio)

- **Login** con `lector1` / `lector123`
- **Pestaña Registro** ([app/(tabs)/registro.tsx](mobile-app/app/(tabs)/registro.tsx)):
  - Input MAC con **máscara automática** `XX:XX:XX:XX:XX:XX`
  - Búsqueda del medidor → muestra modelo, distrito, zona, tarifa y **lectura anterior real**
  - Input lectura actual (solo números enteros, regex `[^0-9]/g`)
  - **Validación delta** — la lectura nueva debe ser mayor o igual a la anterior
  - GPS opcional (lat/lon del registro)
  - **Modo offline** — si no hay conexión, encola y sincroniza después
  - POST a `/api/lecturas` con `origen='app_movil'`, `lectura_actual_m3`, `lectura_anterior_m3`

## 5.7 Scripts-data — carga de datos

**Carpeta:** [scripts-data/](scripts-data/)

| Script | Para qué |
|---|---|
| **cargar_catalogos.js** | Carga los CSVs pequeños (distritos, tarifas, modelos, errores IoT, gateways) → tablas catálogo |
| **cargar_csvs.js** | **Loader principal** — procesa los 4 CSVs grandes (`contratos_agua`, `infraestructuras_cochabamba`, `medidores_iot`, `lecturas_iot`), cruza por `numero_catastro` y `medidor_iot`, calcula `estado_facturacion` real desde `fecha_pago`, genera preavisos |
| **arreglar_errores.js** | Utility — repuebla solo las 2 tablas de errores con distribución correcta entre 5 modelos × 3 períodos × 3 códigos (sin tocar lecturas) |
| **generar_datos.js** | Loader viejo con Faker — mantenido como referencia histórica, NO se usa |

### Comandos del package.json

```json
{
  "cargar-catalogos": "node cargar_catalogos.js",
  "cargar-csvs": "node cargar_csvs.js",
  "cargar-real": "node cargar_catalogos.js && node cargar_csvs.js",
  "generar-datos": "node generar_datos.js"
}
```

## 5.8 Documentos de defensa

| Archivo | Contenido |
|---|---|
| [CONSULTAS.md](CONSULTAS.md) | Las 25 consultas con CQL crudo + guion narrativo para las preguntas estratégicas de los 3 dashboards |
| [CONSULTAS_DOCKER.md](CONSULTAS_DOCKER.md) | Las 25 consultas como comandos `docker exec` listos para copiar/pegar en PowerShell |
| [DocP/HISTORIAL.md](DocP/HISTORIAL.md) | Historial completo de sesiones — para que un asistente IA futuro entienda el contexto |

---

# 📋 PARTE 6 — Datos cargados (resumen)

Después del `pnpm run cargar-csvs`:

| Tabla | Filas | Origen |
|---|---|---|
| `usuarios_por_identificador` | 68.856 | CSV (CI únicos) |
| `contratos_por_numero` | 100.000 | `contratos_agua.csv` |
| `infraestructura_por_id` | 57.356 | `infraestructuras_cochabamba.csv` (filtrado con contrato) |
| `medidores_por_serie` | 100.000 | `medidores_iot.csv` (filtrado con contrato) |
| `lecturas_por_medidor_mes` | 248.055 | `lecturas_iot.csv` |
| `consumo_mensual_por_contrato` | 128.653 | agregado por (contrato, período) |
| `notificaciones_por_contrato` | 1.472 | preavisos generados para vencidos |
| `errores_por_modelo_mes` | 45 | 5 modelos × 3 períodos × 3 códigos |
| `errores_por_distrito_zona` | ~1.110 | distribuido por distritos y zonas |

### Distribución de estados de facturación
- **103.112** pagados (a tiempo)
- **24.069** pagados atrasados (después del vencimiento)
- **1.472** vencidos (no pagaron — concentrados en período 2026-02)
- **0** pendientes (los demás ya pasaron su plazo de 20 días)

---

# 🚦 PARTE 7 — Checklist completo (orden de pasos primera vez)

```
[ ] 1. Instalar Docker Desktop
[ ] 2. Instalar Node.js 20+
[ ] 3. corepack enable + activar pnpm
[ ] 4. Clonar el repo
[ ] 5. pnpm install en cada subproyecto (backend, frontend, visor, scripts-data, mobile-app)
[ ] 6. pnpm approve-builds en visor/ (para esbuild)
[ ] 7. Crear backend/.env con SMTP_USER, SMTP_PASS, CASSANDRA_HOST=localhost
[ ] 8. Crear mobile-app/.env con EXPO_PUBLIC_API_URL=http://<TU_IP>:8080/api
[ ] 9. docker compose up -d cassandra (esperar healthy)
[ ] 10. docker cp schema.cql + docker exec cqlsh -f /tmp/schema.cql
[ ] 11. pnpm run cargar-catalogos (en scripts-data)
[ ] 12. pnpm run cargar-csvs (en scripts-data, ~7 min)
[ ] 13. pnpm start (en backend) → http://localhost:8080
[ ] 14. pnpm dev (en frontend) → http://localhost:5173
[ ] 15. pnpm dev (en visor) → http://localhost:5174
[ ] 16. pnpm start con REACT_NATIVE_PACKAGER_HOSTNAME (en mobile-app)
[ ] 17. Escanear QR con Expo Go en el celular
[ ] 18. Login lector1 / lector123 + probar registro de lectura
[ ] 19. Verificar lectura en Cassandra con cqlsh
```

---

---

# 📜 Anexo histórico — Correcciones de cálculo tarifario (rama devLucas, 2026-05-19)

> Sección conservada del readme original. Documenta los bugs de cálculo de tarifa que se corrigieron antes del trabajo actual.

## Resumen del anexo

Se corrigieron bugs críticos en el cálculo del cobro de SEMAPA que afectaban tanto al backend como a AppRegistro, y se aplicó la regla de 300 litros por habitante/día en el generador de datos. También se unificó la URL de la API en la app móvil para evitar inconsistencias entre archivos de configuración.

## Bugs corregidos

### Bug 1 — Mapeo incorrecto del CSV Tarifario
El CSV `Recursos/Recursos Practica 5 - Tarifario.csv` tiene dos columnas redundantes. El código viejo tomaba el monto total como m³ y el precio unitario como cargo fijo. Corregido a: `consumo_minimo = 12` fijo, `cargo_fijo = row[2]` (el monto real).

### Bug 2 — Cálculo agregado mensual ignoraba bloques progresivos
El cálculo del `monto_bs` aplicaba el precio del bloque 26-50 a TODO el exceso. Corregido para usar `calcularMontoPorConsumo()` del backend que respeta los bloques 13-25, 26-50, 51-75, 76-100, 101-150 y 151+.

### Bug 3 — Lecturas con valores arbitrarios
El loop usaba `randomFloat(0, 1300)` sin relación con la categoría. Corregido aplicando la regla SEMAPA: 300 L × habitantes_típicos por categoría (R1=1, R2=2, R3=4, R4=5 personas).

### Bug 4 — URL móvil inconsistente
`mobile-app/app.json` apuntaba a `:8090`, `.env.example` a `:8080`, `api.ts` a `:8080`. Unificado todo a `:8080` (Node).

## Casos de verificación (post-fix)

| Tarifa | Consumo (m³) | Cálculo | Monto |
|---|---|---|---|
| R1 | 10 (≤12) | solo cargo fijo | Bs 16.74 |
| R3 | 25 | 62.57 + 13 × 2.17 | Bs 90.78 |
| R4 | 60 | 104.22 + 13×2.58 + 25×2.80 + 10×4.39 | Bs 251.66 |

Para validar en cqlsh:
```powershell
docker exec semapa-cassandra cqlsh -e "SELECT alias,consumo_minimo_m3,cargo_fijo FROM semapa.catalogo_tarifas;"
```
Debe mostrar `consumo_minimo_m3 = 12` para las 9 filas y `cargo_fijo` entre 16.74 y 145.98.

## Archivos modificados en esa tanda

| Archivo | Cambio |
|---|---|
| `scripts-data/cargar_catalogos.js` | Bugfix mapeo CSV de tarifas |
| `scripts-data/generar_datos.js` | Regla 300 L + cálculo monto correcto (loader viejo, hoy reemplazado por `cargar_csvs.js`) |
| `mobile-app/app.json` | URL API unificada a 8080 |
| `mobile-app/src/config/api.ts` | Comentario aclaratorio |

---

*Última actualización del informe: 2026-05-26 — Devon. Cualquier duda sobre componentes específicos: revisar `DocP/HISTORIAL.md` para el contexto histórico completo.*
