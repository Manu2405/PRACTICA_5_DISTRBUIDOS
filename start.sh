#!/bin/bash
set -e

PROYECTO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  SEMAPA — Inicialización del proyecto"
echo "============================================"

# 1. Limpiar containers huérfanos y volúmenes anteriores
echo ""
echo "[1/7] Limpiando containers y volúmenes anteriores..."
sudo docker rm -f semapa-cassandra semapa-backend semapa-backend-go semapa-frontend semapa-visor 2>/dev/null || true
docker-compose -f "$PROYECTO_DIR/docker-compose.yml" down -v 2>/dev/null || true

# 2. Instalar dependencias locales (frontend y visor necesitan node_modules antes del build)
echo ""
echo "[2/7] Instalando dependencias locales (frontend y visor)..."
pnpm install --dir "$PROYECTO_DIR/frontend" || true
pnpm install --dir "$PROYECTO_DIR/visor" || true

# 3. Levantar Cassandra
echo ""
echo "[3/7] Levantando Cassandra..."
docker-compose -f "$PROYECTO_DIR/docker-compose.yml" up -d cassandra

# 4. Esperar que Cassandra esté healthy
echo ""
echo "[4/7] Esperando que Cassandra esté healthy (puede tardar 60-90 seg)..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' semapa-cassandra 2>/dev/null)" = "healthy" ]; do
  echo "  ... esperando ($(docker inspect -f '{{.State.Health.Status}}' semapa-cassandra 2>/dev/null))"
  sleep 10
done
echo "  Cassandra está healthy."

# 5. Cargar schema
echo ""
echo "[5/7] Cargando schema en Cassandra..."
docker cp "$PROYECTO_DIR/cassandra/schema.cql" semapa-cassandra:/tmp/schema.cql
docker exec semapa-cassandra cqlsh -f /tmp/schema.cql
echo "  Schema cargado. Verificando tablas..."
docker exec semapa-cassandra cqlsh -e "USE semapa; DESC TABLES;"

# 6. Cargar catálogos y datos
echo ""
echo "[6/7] Cargando catálogos y datos desde CSVs (~5-7 min)..."
pnpm install --dir "$PROYECTO_DIR/scripts-data"
pnpm --dir "$PROYECTO_DIR/scripts-data" run cargar-catalogos
pnpm --dir "$PROYECTO_DIR/scripts-data" run cargar-csvs

# 7. Levantar el resto de servicios
echo ""
echo "[7/7] Levantando backend, backend-go, frontend y visor..."
docker-compose -f "$PROYECTO_DIR/docker-compose.yml" up -d --build backend backend-go frontend visor

echo ""
echo "============================================"
echo "  Estado final de los servicios:"
echo "============================================"
docker-compose -f "$PROYECTO_DIR/docker-compose.yml" ps

echo ""
echo "Dashboards disponibles:"
echo "  http://localhost:5173/operacional"
echo "  http://localhost:5173/contabilidad"
echo "  http://localhost:5173/administracion"
echo "  http://localhost:5173/alcaldia"
echo "  http://localhost:5174        (Visor)"
echo ""
echo "Para la app móvil (otra terminal):"
echo "  cd mobile-app && npx expo start"
echo "============================================"
