# Archivos necesarios en laptop B para el clúster Cassandra

Este documento describe los **3 únicos archivos** que la laptop B (Ubuntu) necesita para funcionar como segundo nodo del clúster Cassandra del proyecto SEMAPA.

> 📌 **Contexto:** Laptop A es Windows (semilla, IP `192.168.137.1`, con todos los datos cargados). Laptop B es Ubuntu 24.04.4 LTS (IP `192.168.137.176` en el hotspot de A). B solo corre Cassandra — no levanta backends ni frontend.

---

## 📂 Ubicación de los archivos en laptop B

Los 3 archivos van en la raíz del proyecto:

```
~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS/
├── docker-compose.yml            ← (1) viene del repo, IGUAL que en laptop A
├── docker-compose.cluster.yml    ← (2) viene del repo, IGUAL que en laptop A
└── .env.cluster                  ← (3) lo creas tú, DIFERENTE al de laptop A
```

---

## 📄 Archivo 1 — `docker-compose.yml`

**Ruta en B:** `~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS/docker-compose.yml`

**Origen:** este archivo ya viene en el repo. Lo único que necesitas para tenerlo es haber hecho `git clone` y `git checkout devDevonA`.

**Contenido:**

```yaml
services:
  cassandra:
    image: cassandra:4.1
    container_name: semapa-cassandra
    ports:
      - "9042:9042"
    environment:
      - CASSANDRA_CLUSTER_NAME=SemapaCluster
      - CASSANDRA_DC=datacenter1
      - CASSANDRA_RACK=rack1
      - CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch
    volumes:
      - cassandra_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -e 'describe keyspaces' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: semapa-backend
    network_mode: host
    environment:
      - CASSANDRA_HOST=localhost
    depends_on:
      cassandra:
        condition: service_healthy
    volumes:
      - ./backend/recibos:/app/recibos
    restart: unless-stopped

  backend-go:
    build:
      context: ./backend-go
      dockerfile: Dockerfile
    container_name: semapa-backend-go
    ports:
      - "8090:8090"
    environment:
      - CASSANDRA_HOST=cassandra
      - CASSANDRA_PORT=9042
      - CASSANDRA_KEYSPACE=semapa
      - APP_PORT=8090
      - JWT_SECRET=semapa-dev-secret
    depends_on:
      cassandra:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: semapa-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped

  visor:
    build:
      context: ./visor
      dockerfile: Dockerfile
    container_name: semapa-visor
    ports:
      - "5174:5174"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  cassandra_data:
```

**Qué hace:**
- Define el servicio `cassandra` con la imagen oficial 4.1
- Mapea el puerto 9042 (CQL clients) al host
- Persiste los datos en el volumen nombrado `cassandra_data` (sobrevive a la destrucción del contenedor)
- Healthcheck que valida que Cassandra responde a queries

> ⚠️ En laptop B **solo se usa el servicio `cassandra`**. Los servicios `backend`, `backend-go`, `frontend`, `visor` están definidos pero **NO se levantan en B** (no se incluyen en el comando `docker compose up`).

---

## 📄 Archivo 2 — `docker-compose.cluster.yml`

**Ruta en B:** `~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS/docker-compose.cluster.yml`

**Origen:** también viene del repo. Es el archivo de **override** que activa modo clúster.

**Contenido:**

```yaml
# ============================================================
# Override de docker-compose para modo CLÚSTER (2 nodos en 2 laptops)
# ============================================================
# Uso (en CADA laptop):
#   docker compose --env-file .env.cluster -f docker-compose.yml -f docker-compose.cluster.yml up -d cassandra
#
# Requiere variables en .env.cluster (copiar de .env.cluster.example):
#   NODE_IP=192.168.137.1          # IP de ESTA laptop en el hotspot
#   CASSANDRA_SEEDS=192.168.137.1  # IP de la laptop semilla (siempre la A)
# ============================================================
# Por qué NO usamos network_mode: host:
# En Docker Desktop para Windows, el contenedor corre dentro de una VM Linux
# (WSL2), y network_mode: host expone la red de la VM, NO la red de Windows.
# Eso hace que Cassandra falle al hacer bind a 192.168.137.1.
# La solución universal (Windows + Linux): port forwarding + broadcast_address.
# ============================================================

services:
  cassandra:
    # Puertos del clúster (9042 ya está en el docker-compose.yml base).
    # 7000 = gossip entre nodos (lo que necesita la otra laptop)
    ports:
      - "7000:7000"
    environment:
      - CASSANDRA_CLUSTER_NAME=SemapaCluster
      - CASSANDRA_DC=datacenter1
      - CASSANDRA_RACK=rack1
      - CASSANDRA_ENDPOINT_SNITCH=GossipingPropertyFileSnitch
      - CASSANDRA_SEEDS=${CASSANDRA_SEEDS}
      # listen_address = "auto" → Cassandra usa la IP del bridge interno del
      # contenedor (algo como 172.17.0.2). Es donde realmente escucha.
      - CASSANDRA_LISTEN_ADDRESS=auto
      # broadcast_address = la IP que se anuncia a OTROS nodos del clúster.
      # Es la IP del hotspot de esta laptop, la que la otra laptop puede ver.
      - CASSANDRA_BROADCAST_ADDRESS=${NODE_IP}
      # rpc_address = 0.0.0.0 → acepta clientes CQL desde cualquier interfaz
      - CASSANDRA_RPC_ADDRESS=0.0.0.0
      # broadcast_rpc_address = lo que se le dice a los clientes (driver) para
      # conectarse. Apunta a la IP del hotspot.
      - CASSANDRA_BROADCAST_RPC_ADDRESS=${NODE_IP}
```

**Qué hace:**
- Agrega el puerto **7000** (gossip entre nodos del clúster — sin este puerto los nodos no se ven entre sí)
- Inyecta las variables `CASSANDRA_SEEDS`, `CASSANDRA_BROADCAST_ADDRESS` y `CASSANDRA_BROADCAST_RPC_ADDRESS` para que Cassandra sepa a quién contactar y bajo qué IP anunciarse
- Las variables `${NODE_IP}` y `${CASSANDRA_SEEDS}` se sustituyen con los valores del archivo `.env.cluster`

> 📌 **Es exactamente el mismo archivo en A y en B.** Lo que cambia entre las dos laptops es solo el `.env.cluster` (siguiente archivo).

---

## 📄 Archivo 3 — `.env.cluster`

**Ruta en B:** `~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS/.env.cluster`

**Origen:** este archivo **NO viene del repo** (está en `.gitignore` porque cambia por máquina). Lo creas manualmente.

**Contenido (laptop B):**

```
NODE_IP=192.168.137.176
CASSANDRA_SEEDS=192.168.137.1
```

**Importante:**
- `NODE_IP` = la IP de **esta** laptop (B) en el hotspot. Si tu IP cambia, hay que actualizar esta variable.
- `CASSANDRA_SEEDS` = la IP de la **laptop A** (la semilla). Siempre apunta a A, nunca a B. Es el "punto de encuentro" donde B se presenta para unirse al clúster.

**Verificar tu IP real:**

```bash
# Desde: cualquier directorio (laptop B)
hostname -I
```

Anota la IP que empiece con `192.168.137.` y úsala como `NODE_IP`.

> ⚠️ Si Windows reasigna otra IP a B (porque B se desconectó y volvió al hotspot), hay que actualizar `NODE_IP` y recrear el contenedor.

### Comparación con el `.env.cluster` de A

| Variable | Laptop A | Laptop B |
|---|---|---|
| `NODE_IP` | `192.168.137.1` | `192.168.137.176` |
| `CASSANDRA_SEEDS` | `192.168.137.1` | `192.168.137.1` |

Lo único que cambia: `NODE_IP`. La semilla siempre apunta a A.

---

## 🛠️ Crear el `.env.cluster` en laptop B

```bash
# Desde: ~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS
nano .env.cluster
```

Pega:
```
NODE_IP=192.168.137.176
CASSANDRA_SEEDS=192.168.137.1
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## ✅ Verificar que los 3 archivos existen y están bien

```bash
# Desde: ~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS
ls -la docker-compose.yml docker-compose.cluster.yml .env.cluster
```

Los 3 deben aparecer. Si alguno falta:
- `docker-compose.yml` o `docker-compose.cluster.yml` faltan → ejecuta `git pull` (debes estar en rama `devDevonA`)
- `.env.cluster` falta → créalo manualmente como se muestra arriba

```bash
# Desde: ~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS
cat .env.cluster
```

Debe imprimir exactamente:
```
NODE_IP=192.168.137.176
CASSANDRA_SEEDS=192.168.137.1
```

Sin comillas, sin espacios alrededor del `=`, sin BOM, sin líneas comentadas.

---

## 🚀 Comando único para levantar B con esos 3 archivos

```bash
# Desde: ~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS
docker compose --env-file .env.cluster -f docker-compose.yml -f docker-compose.cluster.yml up -d cassandra
```

**Desmenuzando el comando:**

| Parte | Para qué |
|---|---|
| `docker compose` | Comando moderno del plugin compose (con espacio, no guion) |
| `--env-file .env.cluster` | Lee las variables `NODE_IP` y `CASSANDRA_SEEDS` |
| `-f docker-compose.yml` | Carga el archivo base |
| `-f docker-compose.cluster.yml` | Aplica encima el override del clúster |
| `up -d cassandra` | Levanta SOLO el servicio cassandra (no backend, frontend, etc.) en modo detached |

---

## 🩺 Verificación post-levantamiento

```bash
# Desde: cualquier directorio (laptop B)
docker ps --filter name=semapa-cassandra
docker exec semapa-cassandra nodetool status
```

`docker ps` debe mostrar `Up X seconds (healthy)`.
`nodetool status` debe mostrar **2 filas con `UN`** (laptop A y laptop B).

---

## 🔁 Si modificas algo en laptop A, ¿qué se sincroniza en B?

| Cambio en A | ¿Acción en B? | Comando en B |
|---|---|---|
| Editar `docker-compose.yml` (en A) y commit | `git pull` + recrear contenedor | `git pull && docker compose --env-file .env.cluster -f docker-compose.yml -f docker-compose.cluster.yml up -d cassandra` |
| Editar `docker-compose.cluster.yml` (en A) y commit | `git pull` + recrear contenedor | Igual |
| Editar `.env.cluster` en A | Nada — B tiene su propio `.env.cluster` con su IP | — |
| Cargar nuevos CSVs en A | Nada — Cassandra replica automáticamente vía RF=2 | — |
| `ALTER` o cambio de schema en A | Nada — el schema se gossipea entre nodos | — |
| Levantar backend/frontend/visor en A | Nada — esos no corren en B | — |

---

## 🆘 Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| `permission denied` al `docker stop` | Docker via Snap o AppArmor | Usar `docker kill semapa-cassandra` |
| Contenedor muere con `Cannot assign requested address` | `NODE_IP` no coincide con la IP real | Actualizar `.env.cluster` con la IP correcta |
| Contenedor muere con `Unable to gossip with peers` | A no está corriendo, o firewall bloquea 7000 | Verificar que A esté UP y que `nc -zv 192.168.137.1 7000` funcione |
| `nodetool status` solo muestra 1 nodo | B no se unió al clúster | Ver logs: `docker logs --tail 50 semapa-cassandra` |

---

## 📋 Resumen ultra corto

**En laptop B necesitas exactamente esto en `~/Downloads/semapa2/PRACTICA_5_DISTRBUIDOS/`:**

1. ✅ `docker-compose.yml` (del repo, `git pull`)
2. ✅ `docker-compose.cluster.yml` (del repo, `git pull`)
3. ✅ `.env.cluster` (creado manualmente con tu IP `192.168.137.176`)

**Plus:**
- Docker Engine + Compose plugin instalados
- Conexión al hotspot WiFi de laptop A
- Puerto 7000 abierto (ufw allow)

Con eso B es un nodo Cassandra completamente operativo. Todo lo demás del repo (backend, frontend, etc.) es **innecesario** para B.
