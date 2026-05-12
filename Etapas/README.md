# Práctica 5 — SEMAPA Gestión Inteligente de Agua Potable

Proyecto académico para implementar una solución distribuida orientada al almacenamiento, procesamiento, visualización y facturación del consumo de agua potable mediante medidores IoT.

## Objetivo general

Construir una plataforma que permita simular, almacenar y consultar lecturas de consumo de agua provenientes de medidores IoT distribuidos en el municipio de Cochabamba, usando Apache Cassandra como base de datos distribuida, un backend en Go, un dashboard web en React y un módulo de facturación en PDF.

## Stack final recomendado

| Capa | Tecnología | Descripción |
|---|---|---|
| Base de datos | Apache Cassandra | Almacenamiento distribuido de catálogos, medidores, lecturas y agregados. |
| Backend | Go | API REST, consultas estratégicas, lógica de negocio y facturación. |
| Frontend | React + Vite | Dashboard operacional, contable y administrativo. |
| Gráficos | ECharts / Recharts | Visualización de consumo, ingresos, errores y tendencias. |
| Mapas | Leaflet | Visualización geoespacial por distrito, zona y medidor. |
| PDF | Go PDF library o servicio auxiliar | Generación de recibo media carta y rollo térmico. |
| Orquestación | Docker Compose | Entorno local reproducible. |

## Documentos del plan

| Documento | Propósito |
|---|---|
| `00_PLAN_GENERAL_IMPLEMENTACION.md` | Plan maestro del proyecto completo. |
| `01_CAPA_DATOS_CASSANDRA.md` | Diseño de base de datos, tablas CQL y modelado por consulta. |
| `02_CAPA_GENERACION_DATOS.md` | Simulación de personas, contratos, infraestructuras, medidores y lecturas. |
| `03_CAPA_BACKEND_GO.md` | Diseño del backend, estructura de carpetas, endpoints y servicios. |
| `04_CAPA_FRONTEND_REACT.md` | Diseño del frontend, dashboards, rutas, componentes y visualización. |
| `05_CAPA_FACTURACION_NOTIFICACION.md` | Recibos PDF, cálculo de tarifa y simulación de mensajes. |
| `06_CAPA_DOCKER_DEVOPS.md` | Docker Compose, variables de entorno y comandos de ejecución. |
| `07_CONSULTAS_DASHBOARDS.md` | Banco de consultas, endpoints y relación con dashboards. |
| `08_INFORME_DEFENSA.md` | Guía para informe técnico, presentación y defensa oral. |

## Alcance funcional

El sistema debe permitir:

1. Cargar catálogos base desde CSV.
2. Simular 100.000 infraestructuras.
3. Simular 120.000 medidores IoT.
4. Generar lecturas históricas desde abril de 2025.
5. Registrar errores y duplicados simulados.
6. Consultar datos estratégicos en Cassandra.
7. Mostrar dashboards para SEMAPA, Contabilidad y Administración.
8. Generar recibos PDF en formato media carta y rollo térmico.
9. Simular envío por SMS, WhatsApp o email.
10. Documentar arquitectura, decisiones técnicas y conceptos de Cassandra.

## Orden de trabajo recomendado

```txt
1. Levantar Cassandra con Docker.
2. Crear keyspace y tablas.
3. Cargar catálogos.
4. Generar personas, contratos e infraestructuras.
5. Generar medidores.
6. Generar lecturas históricas.
7. Construir backend Go.
8. Implementar consultas estratégicas.
9. Construir dashboard React.
10. Generar recibos PDF.
11. Simular notificaciones.
12. Integrar todo.
13. Preparar informe y defensa.
```

## Criterio de éxito del MVP

El proyecto se considera funcional si permite ejecutar una demo completa:

```txt
Buscar contrato → ver consumo → ver ubicación → generar recibo → descargar PDF → simular envío.
```
