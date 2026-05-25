#!/bin/bash

PROYECTO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROYECTO_DIR"

echo "============================================"
echo "  SEMAPA — Apagado del proyecto"
echo "============================================"
echo ""
echo "¿Qué deseas hacer?"
echo "  1) Apagar conservando datos (recomendado)"
echo "  2) Apagar y borrar TODO (datos incluidos)"
echo ""
read -rp "Opción [1/2]: " opcion

case $opcion in
  2)
    echo ""
    echo "Eliminando containers y volúmenes..."
    sudo docker rm -f semapa-cassandra semapa-backend semapa-backend-go semapa-frontend semapa-visor 2>/dev/null || true
    docker-compose down -v
    echo ""
    echo "Todo eliminado. Para volver a iniciar: ./start.sh"
    ;;
  *)
    echo ""
    echo "Apagando servicios (datos conservados)..."
    docker-compose stop
    echo ""
    echo "Servicios apagados. Para reanudar: docker-compose start"
    ;;
esac

echo "============================================"
