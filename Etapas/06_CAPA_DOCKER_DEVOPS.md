# 06 — Capa Docker y DevOps Local

## 1. Objetivo de la capa

Crear un entorno de ejecución local reproducible para levantar Cassandra, backend Go y frontend React mediante Docker Compose.

## 2. Servicios mínimos

| Servicio | Puerto | Descripción |
|---|---:|---|
| Cassandra | 9042 | Base de datos distribuida. |
| Backend Go | 8080 | API REST. |
| Frontend React | 5173 | Dashboard web. |

Opcional:

| Servicio | Puerto | Descripción |
|---|---:|---|
| MinIO | 9000 / 9001 | Almacenamiento de PDFs. |

## 3. Estructura esperada

```txt
semapa-cassandra/
├── backend-go/
├── frontend-react/
├── cassandra/
│   ├── schema.cql
│   └── seed.cql
├── scripts-data/
├── recibos/
├── docker-compose.yml
├── .env
└── README.md
```

## 4. Archivo `.env`

```env
# Cassandra
CASSANDRA_HOST=cassandra
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=semapa

# Backend
APP_PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
PDF_OUTPUT_DIR=/app/recibos

# Frontend
VITE_API_URL=http://localhost:8080

# MinIO opcional
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=admin123456
```

## 5. Docker Compose sugerido

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
      context: ./backend-go
      dockerfile: Dockerfile
    container_name: semapa-backend
    ports:
      - "8080:8080"
    env_file:
      - .env
    depends_on:
      cassandra:
        condition: service_healthy
    volumes:
      - ./recibos:/app/recibos

  frontend:
    build:
      context: ./frontend-react
      dockerfile: Dockerfile
    container_name: semapa-frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8080
    depends_on:
      - backend

  minio:
    image: minio/minio:latest
    container_name: semapa-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=admin
      - MINIO_ROOT_PASSWORD=admin123456
    volumes:
      - minio_data:/data

volumes:
  cassandra_data:
  minio_data:
```

## 6. Comandos principales

### Levantar servicios

```bash
docker compose up -d
```

### Ver logs

```bash
docker compose logs -f
```

### Ver logs de Cassandra

```bash
docker compose logs -f cassandra
```

### Entrar a Cassandra

```bash
docker exec -it semapa-cassandra cqlsh
```

### Ejecutar schema

```bash
docker exec -i semapa-cassandra cqlsh < cassandra/schema.cql
```

### Bajar servicios

```bash
docker compose down
```

### Bajar servicios y borrar datos

```bash
docker compose down -v
```

## 7. Dockerfile backend Go

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o semapa-api ./cmd/server

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/semapa-api .
COPY --from=builder /app/recibos ./recibos
EXPOSE 8080
CMD ["./semapa-api"]
```

## 8. Dockerfile frontend React

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

## 9. Flujo de instalación local

```txt
1. Clonar repositorio.
2. Crear archivo .env.
3. Ejecutar docker compose up -d.
4. Esperar que Cassandra esté healthy.
5. Ejecutar schema.cql.
6. Cargar catálogos.
7. Generar datos de prueba.
8. Ejecutar backend.
9. Abrir frontend.
10. Probar demo completa.
```

## 10. URLs locales

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend Health | http://localhost:8080/health |
| API Operacional | http://localhost:8080/api/operacional/resumen |
| MinIO Console | http://localhost:9001 |
| Cassandra | localhost:9042 |

## 11. Checklist DevOps

```txt
[ ] Docker instalado.
[ ] docker-compose.yml creado.
[ ] Cassandra levanta.
[ ] Backend levanta.
[ ] Frontend levanta.
[ ] Backend conecta con Cassandra.
[ ] Schema ejecutado.
[ ] Volúmenes persistentes funcionando.
[ ] Carpeta recibos montada.
[ ] README de ejecución creado.
```
