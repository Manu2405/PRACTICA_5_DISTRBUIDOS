# 07 — Consultas Estratégicas y Dashboards

## 1. Objetivo

Documentar el banco de consultas estratégicas solicitado por la práctica, definir qué tabla de Cassandra alimenta cada consulta y relacionarlas con los dashboards del sistema.

## 2. Principio de diseño

Cada consulta importante debe tener una tabla pensada para responderla de forma rápida, evitando joins y filtros costosos.

## 3. Banco de consultas

| Nº | Consulta | Dashboard | Tabla sugerida |
|---:|---|---|---|
| 1 | Consumo promedio por distrito en rango de 8 horas | Operacional | `consumo_por_distrito_hora` |
| 2 | Comparativa de consumo entre 4 últimas semanas | Operacional | `consumo_por_distrito_hora` |
| 3 | Contratos con consumo excesivo mayor a 45 m³ | Contabilidad | `consumo_mensual_por_contrato` |
| 4 | Medidores activos por distrito y zona | Operacional | `medidores_por_distrito_zona` |
| 5 | Medidores fuera de servicio por distrito y zona | Administración | `medidores_por_distrito_zona` |
| 6 | Modelos con mayor tasa de fallos | Administración | `errores_por_modelo_mes` |
| 7 | Consumo promedio mensual por tarifa y distrito | Contabilidad | `consumo_mensual_por_distrito_tarifa` |
| 8 | Zonas con consumo anómalo | Administración | `consumo_mensual_por_distrito_tarifa` / tabla derivada |
| 9 | Lecturas fallidas por tipo de medidor | Administración | `errores_por_modelo_mes` |
| 10 | Porcentaje de medidores con más de 4 años | Administración | `medidores_por_distrito_zona` / tabla derivada |
| 11 | Consumo per cápita por zona y categoría residencial | Operacional | `consumo_mensual_por_distrito_tarifa` |
| 12 | Top 3 consumidores por distrito | Operacional | `top_consumidores_por_distrito_mes` |
| 13 | Zonas que requieren renovación por errores | Administración | `errores_por_distrito_zona` |
| 14 | Consulta sorpresa 1 | Variable | A definir |
| 15 | Zonas con mayor cantidad de errores en distrito X | Administración | `errores_por_distrito_zona` |
| 16 | Consulta sorpresa 2 | Variable | A definir |
| 17 | Cobertura de antenas por zona | Administración | `medidores_por_radiobase_zona` |
| 18 | Demanda proyectada a 5 años | Operacional | cálculo desde consumo mensual |
| 19 | Consulta sorpresa 4 | Variable | A definir |
| 20 | Impacto de cambio de tarifa P a R4 | Contabilidad | `consumo_mensual_por_contrato` |
| 21 | Medidores que no reportaron consumo | Administración | `medidores_por_distrito_zona` + lecturas |
| 22 | Proyección de ingresos por tipo de tarifa | Contabilidad | `ingresos_por_tarifa_mes` |
| 23 | Clientes con consumo mínimo residencial | Contabilidad | `consumo_mensual_por_contrato` |
| 24 | Ingresos por tarifa en pies³ | Contabilidad | `ingresos_por_tarifa_mes` + conversión |
| 25 | Consulta sorpresa | Variable | A definir |

## 4. Consultas prioritarias para implementar primero

Estas consultas deben hacerse primero porque sirven para demo, defensa y dashboard.

| Prioridad | Consulta |
|---|---|
| Alta | 1. Consumo por distrito y rango horario |
| Alta | 3. Contratos con consumo excesivo |
| Alta | 4. Medidores activos |
| Alta | 5. Medidores fuera de servicio |
| Alta | 6. Fallos por modelo |
| Alta | 7. Consumo mensual por tarifa y distrito |
| Alta | 9. Lecturas fallidas por medidor |
| Alta | 12. Top consumidores |
| Alta | 18. Demanda proyectada |
| Alta | 22. Ingresos por tarifa |

## 5. Endpoints por consulta

```txt
GET /api/consultas/1
GET /api/consultas/2
GET /api/consultas/3
GET /api/consultas/4
GET /api/consultas/5
GET /api/consultas/6
GET /api/consultas/7
GET /api/consultas/8
GET /api/consultas/9
GET /api/consultas/10
GET /api/consultas/11
GET /api/consultas/12
GET /api/consultas/13
GET /api/consultas/14
GET /api/consultas/15
GET /api/consultas/16
GET /api/consultas/17
GET /api/consultas/18
GET /api/consultas/19
GET /api/consultas/20
GET /api/consultas/21
GET /api/consultas/22
GET /api/consultas/23
GET /api/consultas/24
GET /api/consultas/25
```

## 6. Dashboard operacional SEMAPA

### Indicadores

```txt
Consumo total mensual.
Cantidad de medidores.
Medidores activos.
Medidores fuera de servicio.
Población beneficiaria.
Consumo promedio por hora.
Consumo por distrito.
Top consumidores por distrito.
```

### Consultas usadas

```txt
1, 2, 4, 11, 12, 18
```

## 7. Dashboard contabilidad

### Indicadores

```txt
Ingresos por tarifa.
Ingresos proyectados.
Contratos con consumo excesivo.
Impacto por cambio tarifario.
Cobro mínimo residencial.
Conversión de ingresos por pies cúbicos.
```

### Consultas usadas

```txt
3, 7, 20, 22, 23, 24
```

## 8. Dashboard administración

### Indicadores

```txt
Errores por modelo.
Errores por distrito y zona.
Medidores antiguos.
Medidores sin reporte.
Cobertura de radiobases.
Zonas que requieren renovación.
```

### Consultas usadas

```txt
5, 6, 8, 9, 10, 13, 15, 17, 21
```

## 9. Formato estándar de respuesta

Toda consulta debe devolver JSON con esta estructura:

```json
{
  "consulta": 1,
  "titulo": "Consumo promedio por distrito en rango de 8 horas",
  "periodo": "2025-05",
  "filtros": {
    "distrito": "TUNARI"
  },
  "data": [],
  "total": 0
}
```

## 10. Ejemplo consulta 1

Request:

```txt
GET /api/consultas/1?distrito=TUNARI&fecha=2025-05-12
```

Response:

```json
{
  "consulta": 1,
  "titulo": "Consumo promedio por distrito en rango de 8 horas",
  "data": [
    {
      "distrito": "TUNARI",
      "rangoHora": "00:00-08:00",
      "consumoM3": 1254004
    },
    {
      "distrito": "TUNARI",
      "rangoHora": "08:00-16:00",
      "consumoM3": 6854221
    },
    {
      "distrito": "TUNARI",
      "rangoHora": "16:00-24:00",
      "consumoM3": 7254133
    }
  ]
}
```

## 11. Checklist de consultas

```txt
[ ] Consultas documentadas.
[ ] Tabla Cassandra definida para cada consulta.
[ ] Endpoint creado por consulta.
[ ] Respuesta JSON estandarizada.
[ ] 5 consultas mínimas funcionando.
[ ] 10 consultas prioritarias funcionando.
[ ] Dashboards conectados a consultas.
[ ] Resultados exportables o visibles en grilla.
```
