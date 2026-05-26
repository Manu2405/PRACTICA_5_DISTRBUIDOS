# AppRegistro SEMAPA — Guía para el equipo (rama `devLucas`)

**Autor:** Lucas  
**Módulo:** App móvil de campo + API para lecturas de medidores  
**Estado:** Probado en **Expo Go SDK 54** (mayo 2026)

---

## Resumen para compañeros

Se agregó **AppRegistro**, aplicación móvil para que el personal de campo registre lecturas de agua potable. La app:

- Solo se ejecuta con **Expo Go** (no APK ni EAS Build).
- Consume una **API REST** (mismo contrato en Node `:8080` o Go `:8090`).
- Funciona **online/offline** (cola local + sincronización).
- Incluye pantallas: Login, Dashboard, Lectura, Historial, Consumos, Tarifas, LoRaWAN, Sync, Config.

**Prueba realizada:** login `lector1`, dashboard “Online — API sincronizada”, navegación completa OK.

**Importante:** si el dashboard muestra **0 lecturas / 0 medidores**, Cassandra no tiene datos de prueba aún. Hay que ejecutar `scripts-data` (ver sección 4).

---

## Arquitectura (qué usa cada cosa)

| Componente | Carpeta | Tecnología | Puerto | Quién lo usa |
|------------|---------|------------|--------|--------------|
| Dashboard web | `frontend/` | React + Vite | 5173 | Equipo web (Manuel/Anett) |
| Backend web | `backend/` | Node.js + Express | 8080 | Frontend web + **app móvil (pruebas)** |
| API móvil Go | `backend-go/` | Go + Gin + gocql | 8090 | App móvil (lineamiento líder) |
| App móvil | `mobile-app/` | Expo 54 + React Native | — | Lectores en campo |
| Base de datos | `cassandra/` | Cassandra 4.1 | 9042 | Todos (schema **no modificado**) |

```
Celular (Expo Go)  ──WiFi──►  PC:8080 o :8090/api  ──►  Cassandra
Frontend web       ────────►  PC:8080              ──►  Cassandra
```

---

## Requisitos

1. **Docker Desktop** abierto (ícono verde).
2. **Node.js** 18+.
3. **Expo Go** en el celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) — versión **SDK 54**.
4. PC y celular en la **misma red Wi‑Fi**.
5. **Go 1.22+** (opcional; solo si corren `backend-go` sin Docker).

---

## Puesta en marcha rápida

### 1. Clonar y cambiar a la rama

```bash
git clone https://github.com/Manu2405/PRACTICA_5_DISTRBUIDOS.git
cd PRACTICA_5_DISTRBUIDOS
git checkout devLucas
```

### 2. Cassandra + schema

```bash
docker compose up -d cassandra
# Esperar ~1 minuto hasta healthy
```

**Git Bash (schema):**

```bash
docker exec -i semapa-cassandra cqlsh < cassandra/schema.cql
```

**PowerShell:**

```powershell
Get-Content cassandra/schema.cql | docker exec -i semapa-cassandra cqlsh
```

### 3. Datos de prueba (recomendado)

Sin esto, la app conecta pero **no hay medidores** que buscar.

```bash
cd scripts-data
npm install
node cargar_catalogos.js
node generar_datos.js
```

### 4. Backend API

**Opción A — Node (más simple para probar la app hoy):**

```bash
cd backend
npm install
export CASSANDRA_HOST=127.0.0.1   # Git Bash
# set CASSANDRA_HOST=127.0.0.1   # CMD
npm start
```

Verificar: `http://localhost:8080/health`

**Opción B — Go (API móvil oficial):**

```bash
docker compose up -d backend-go
# o: cd backend-go && go run ./cmd/server
```

Verificar: `http://localhost:8090/health`

### 5. App móvil (Expo Go)

```bash
cd mobile-app
cp .env.example .env
```

Editar `.env` con la **IP Wi‑Fi del PC** (no `localhost`):

```env
# Node (pruebas)
EXPO_PUBLIC_API_URL=http://192.168.0.10:8080/api

# Go (cuando usen backend-go)
# EXPO_PUBLIC_API_URL=http://192.168.0.10:8090/api
```

Obtener IP: `ipconfig` → adaptador **Wi‑Fi** → IPv4.

```bash
npm install
npx expo start --clear --lan
```

Escanear el QR con **Expo Go**. Si sale error de SDK, el proyecto ya está en **SDK 54**; reiniciar con `--clear`.

---

## Credenciales demo

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `lector1` | `lector123` | lector |
| `admin` | `admin123` | administrador |

---

## API móvil — endpoints

Base: `http://<IP>:8080/api` (Node) o `http://<IP>:8090/api` (Go)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | JWT |
| POST | `/auth/refresh` | Renovar token |
| GET | `/mobile/dashboard` | KPIs del día |
| GET | `/medidores` | Listado |
| GET | `/medidores/:codigo` | Detalle + última lectura |
| POST | `/lecturas` | Registrar lectura |
| GET | `/lecturas/historial?codigo_medidor=XXX` | Historial |
| GET | `/tarifas` | Catálogo SEMAPA |
| POST | `/calcular-factura` | Cálculo R1/R2/R3 |
| POST | `/lorawan/simular` | Simulación IoT |

Lógica tarifaria y negocio: **backend** (`backend/src/services/tarifaService.js` o `backend-go/internal/services/tarifa.go`).

---

## Estructura nueva en el repo

```
mobile-app/              # App Expo (AppRegistro)
backend-go/              # API Go para móvil
backend/src/controllers/mobile/
backend/src/routes/mobileRoutes.js
backend/src/middleware/authMiddleware.js
backend/src/services/tarifaService.js
ReadmeLUCAS.md           # Este archivo
```

---

## Problemas frecuentes

| Error | Solución |
|-------|----------|
| `dockerDesktopLinuxEngine` no encontrado | Abrir **Docker Desktop** y esperar. |
| Expo Go: SDK 52 vs 54 | Usar rama `devLucas` actualizada; `npx expo start --clear`. |
| Network error en el celular | Misma Wi‑Fi; IP correcta en `mobile-app/.env`. |
| Login OK pero “Sin datos” | Ejecutar `scripts-data` (generar medidores/lecturas). |
| Puerto 8081 ocupado | Cerrar otras instancias de Expo; usar `--clear`. |

---

## Checklist de prueba (equipo)

- [ ] Docker + Cassandra healthy
- [ ] Schema + datos cargados
- [ ] `health` del backend OK
- [ ] Login en Expo Go
- [ ] Dashboard “Online”
- [ ] Buscar medidor con código real (tras `generar_datos.js`)
- [ ] Registrar lectura y ver en Historial
- [ ] Tarifas: calcular con R2 y consumo 25

---

## Restricciones del proyecto

- **No** modificar `cassandra/schema.cql`.
- App móvil: captura, visualización, sync y reportes básicos.
- Cálculo tarifario complejo: en el **backend**.

---

## Contacto / rama

- Trabajo de Lucas en **`devLucas`**.
- Base del sistema web: rama **`devManuel`** (Node + React dashboards).

---

*Última actualización: prueba exitosa Expo Go — login, dashboard online, 8 pantallas navegables.*
