# 00 — Plan General de Implementación

## 1. Nombre del proyecto

**Sistema distribuido para la gestión inteligente de consumo de agua potable SEMAPA**

## 2. Descripción general

El proyecto consiste en implementar una solución tecnológica que simule la operación de medidores IoT de agua potable, almacene sus lecturas en Apache Cassandra, permita ejecutar consultas estratégicas para la toma de decisiones, visualice el consumo mediante dashboards y genere recibos PDF de consumo mensual.

El sistema se enfoca en el caso de SEMAPA, con medidores distribuidos en el municipio de Cochabamba y conectados conceptualmente mediante una red LoRaWAN.

## 3. Objetivo general del proyecto

Desarrollar un sistema distribuido basado en Apache Cassandra para almacenar, procesar, consultar y visualizar lecturas de consumo de agua potable generadas por medidores IoT, con el fin de apoyar la toma de decisiones operativas, administrativas y contables de SEMAPA.

## 4. Objetivos específicos

1. Diseñar una base de datos distribuida en Cassandra orientada a consultas estratégicas.
2. Generar datos simulados de personas, contratos, infraestructuras, medidores y lecturas.
3. Implementar un backend en Go que exponga endpoints REST para consultas, dashboard y facturación.
4. Construir un frontend en React que muestre dashboards interactivos.
5. Implementar un módulo de facturación que genere recibos PDF en dos formatos.
6. Simular el envío de mensajes por email, SMS o WhatsApp.
7. Elaborar documentación técnica para defensa del proyecto.

## 5. Alcance funcional

### Incluido

- Base de datos Cassandra.
- Carga de catálogos desde CSV.
- Simulación batch de datos.
- API REST en Go.
- 25 consultas documentadas.
- Mínimo 5 consultas ejecutables para demo.
- Dashboard operacional SEMAPA.
- Dashboard contable.
- Dashboard administrativo.
- Generación de recibo media carta.
- Generación de recibo rollo térmico.
- Simulación de notificaciones.
- Informe técnico máximo 2 páginas.

### No incluido en el MVP

- Streaming real con Kafka/MQTT.
- WhatsApp Cloud API real.
- SMS real con proveedor externo.
- App móvil.
- Integración real con SEMAPA.
- Cobros reales.
- Autenticación avanzada.

## 6. Arquitectura general

```txt
┌──────────────────────────────┐
│ CSV de recursos              │
│ Distritos, tarifas, modelos  │
│ errores, infraestructuras    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Generador de datos            │
│ Personas, contratos,          │
│ infraestructuras, medidores,  │
│ lecturas y errores            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Apache Cassandra              │
│ Tablas orientadas a consulta  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Backend Go API                │
│ Consultas, facturación,       │
│ resumen y notificación        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Frontend React                │
│ Dashboards, mapas, gráficos,  │
│ búsqueda y recibos            │
└──────────────────────────────┘
```

## 7. Capas del sistema

| Capa | Responsabilidad |
|---|---|
| Datos | Almacenar y consultar información en Cassandra. |
| Generación | Crear datos simulados masivos desde CSV. |
| Backend | Exponer API REST y ejecutar lógica de negocio. |
| Frontend | Visualizar indicadores, mapas, gráficos y recibos. |
| Facturación | Calcular consumo, monto y generar PDFs. |
| DevOps | Levantar servicios con Docker y documentar ejecución. |

## 8. Cronograma general

| Etapa | Actividad | Duración sugerida |
|---:|---|---:|
| 0 | Organización inicial | 0.5 día |
| 1 | Análisis de datos y reglas | 1 día |
| 2 | Diseño Cassandra | 1.5 días |
| 3 | Docker y entorno local | 1 día |
| 4 | Carga de catálogos | 1 día |
| 5 | Generación de personas e infraestructuras | 1.5 días |
| 6 | Generación de medidores | 1 día |
| 7 | Generación de lecturas | 2 días |
| 8 | Backend Go API | 3 días |
| 9 | Consultas estratégicas | 3 días |
| 10 | Dashboard React | 3 días |
| 11 | Facturación PDF | 2 días |
| 12 | Notificación simulada | 1 día |
| 13 | Integración final | 2 días |
| 14 | Informe y defensa | 1 día |

## 9. Entregables generales

| Entregable | Descripción |
|---|---|
| Código fuente | Backend, frontend, scripts y CQL. |
| Docker Compose | Servicios listos para levantar localmente. |
| Base Cassandra | Keyspace, tablas y datos cargados. |
| Scripts de generación | Datos simulados y carga batch. |
| API REST | Endpoints para consultas, dashboard y facturación. |
| Dashboard | Visualización funcional con gráficos y mapa. |
| PDFs | Recibos media carta y rollo térmico. |
| Informe técnico | Máximo 2 páginas. |
| Presentación | Slides o guion de defensa. |

## 10. MVP mínimo

El MVP mínimo debe contener:

```txt
[ ] Cassandra funcionando.
[ ] Keyspace creado.
[ ] Catálogos cargados.
[ ] Infraestructuras simuladas.
[ ] Medidores simulados.
[ ] Lecturas de prueba cargadas.
[ ] 5 consultas estratégicas funcionando.
[ ] Backend conectado a Cassandra.
[ ] Dashboard consumiendo API real.
[ ] Recibos PDF generados.
[ ] Notificación simulada.
[ ] Informe técnico preparado.
```

## 11. Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cargar demasiados datos desde el inicio | Alto | Trabajar primero con muestra de 1.000 y luego escalar. |
| Modelar Cassandra como SQL | Alto | Crear tablas por consulta. |
| Dashboard con datos falsos | Medio | Conectar temprano con API real. |
| PDF complicado al final | Medio | Hacer recibo simple primero y luego mejorar diseño. |
| Integración tardía | Alto | Integrar desde etapas tempranas. |

## 12. Criterio de demo final

La demo debe seguir este flujo:

```txt
1. Abrir dashboard.
2. Ver KPIs generales.
3. Ver mapa de consumo.
4. Ejecutar una consulta estratégica.
5. Buscar un contrato.
6. Generar recibo PDF.
7. Simular envío por WhatsApp/email.
8. Mostrar resultado JSON o PDF.
```
