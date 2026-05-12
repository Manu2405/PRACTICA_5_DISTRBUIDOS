# 02 — Capa de Generación de Datos

## 1. Objetivo de la capa

Generar datos simulados coherentes para poblar Cassandra con personas, contratos, infraestructuras, medidores IoT, lecturas históricas, errores, duplicados y agregados necesarios para consultas y dashboards.

## 2. Entradas

| Archivo | Uso |
|---|---|
| `Distritos.csv` | Distribución territorial y poblacional. |
| `Hoja 10.csv` | Distribución de infraestructuras. |
| `Tarifario.csv` | Categorías y reglas de cobro. |
| `ModeloMedidores.csv` | Modelos de medidores IoT. |
| `ErroresIOT.csv` | Estados y errores de lectura. |
| `Infraestructuras.csv` | Tipos de infraestructura. |
| `UnidadesEducativas.csv` | Infraestructuras educativas. |
| `InfraestrucuraPublicas.csv` | Infraestructuras públicas. |

## 3. Cantidades objetivo

| Entidad | Cantidad |
|---|---:|
| Personas naturales | 80.000 |
| Personas jurídicas | 5.000 |
| Infraestructuras | 100.000 |
| Medidores IoT | 120.000 |
| Modelos de medidor | 5 |
| Categorías tarifarias | 9 |
| Errores de lectura | 0.5% |
| Duplicados simulados | 0.07% |

## 4. Reglas de generación

### 4.1 Personas

- Persona natural: carnet, nombre, teléfono, email, dirección.
- Persona jurídica: NIT, razón social, teléfono, email, dirección.
- Una persona puede tener entre 1 y 5 infraestructuras.

### 4.2 Contratos

Cada contrato debe tener:

```txt
numero_contrato
identificador_titular
nombre_titular
tipo_persona
tarifa_alias
direccion
distrito
zona
estado
fecha_alta
```

### 4.3 Infraestructuras

Cada infraestructura debe tener:

```txt
id_infraestructura
numero_contrato
tipo_infraestructura
direccion
distrito
zona
lat
lon
cantidad_medidores
```

Tipos sugeridos:

```txt
vivienda
edificio
condominio
unidad_educativa
centro_salud
hospital
comercio
industria
parque
institucion_publica
```

### 4.4 Medidores

Cada medidor debe tener:

```txt
numero_serie
mac
modelo
contrato
infraestructura
tarifa_alias
distrito
zona
radiobase
fecha_instalacion
estado
lat
lon
```

Fecha de instalación:

```txt
Desde: 2020-01-01
Hasta: 2025-03-01
```

Estados posibles:

```txt
activo
inactivo
fuera_servicio
baja
```

## 5. Reglas de consumo

### 5.1 Residencial

| Franja horaria | Rango de consumo |
|---|---:|
| 00:00 - 08:00 | 0 a 1300 litros |
| 08:00 - 16:00 | 0 a 380 litros |
| 16:00 - 24:00 | 0 a 190 litros |

### 5.2 Otras categorías

| Categoría | Rango sugerido |
|---|---:|
| Comercial | 0 a 250 litros |
| Comercial Especial | 0 a 250 litros |
| Industrial | 0 a 250 litros o mayor en casos extremos |
| Preferencial | 0 a 250 litros |
| Social | 0 a 250 litros |

## 6. Estrategia de carga gradual

No se debe empezar con todos los datos masivos desde el primer día.

| Nivel | Medidores | Uso |
|---|---:|---|
| Prueba mínima | 100 | Validar schema y scripts. |
| Prueba inicial | 1.000 | Validar API y dashboard. |
| Prueba media | 10.000 | Medir rendimiento. |
| Carga final | 120.000 | Entrega/demo final. |

## 7. Orden de generación

```txt
1. Cargar catálogos.
2. Generar personas naturales.
3. Generar personas jurídicas.
4. Generar contratos.
5. Generar infraestructuras.
6. Generar medidores.
7. Generar lecturas.
8. Generar errores.
9. Generar duplicados.
10. Generar agregados mensuales.
11. Insertar en Cassandra.
```

## 8. Estructura de scripts sugerida

```txt
scripts-data/
├── config/
│   └── settings.yaml
├── input/
│   ├── Distritos.csv
│   ├── Hoja10.csv
│   ├── Tarifario.csv
│   ├── ModeloMedidores.csv
│   └── ErroresIOT.csv
├── output/
│   ├── personas.csv
│   ├── contratos.csv
│   ├── infraestructuras.csv
│   ├── medidores.csv
│   └── lecturas.csv
├── cargar_catalogos.go
├── generar_personas.go
├── generar_infraestructuras.go
├── generar_medidores.go
├── generar_lecturas.go
└── cargar_cassandra.go
```

## 9. Pseudoflujo de generación

```txt
Para cada zona:
  calcular proporción poblacional
  asignar cantidad de infraestructuras
  para cada infraestructura:
    crear titular
    crear contrato
    asignar tipo de infraestructura
    asignar coordenadas aproximadas
    asignar 1 a 5 medidores
    para cada medidor:
      asignar modelo
      asignar tarifa
      asignar radiobase
      asignar fecha de instalación
      generar lecturas históricas
```

## 10. Duplicados

Los duplicados representan medidores ubicados en frontera de cobertura LoRaWAN.

Regla:

```txt
0.07% de las lecturas se duplican con mismo MAC y timestamp, pero posible radiobase distinta.
```

Tratamiento:

```txt
Guardar lectura cruda.
Deduplicar para agregados.
Marcar evento como duplicado en log.
```

## 11. Errores

Regla:

```txt
0.5% de lecturas deben tener status de error.
```

Ejemplos:

```txt
Falla en alimentación eléctrica.
Fallo en conectividad de red.
Configuración incorrecta del sensor o gateway.
Daño en caudalímetro.
Error de firmware.
Timestamp incorrecto.
```

## 12. Agregados requeridos

Mientras se generan lecturas, conviene calcular:

```txt
consumo por distrito y hora
consumo mensual por contrato
consumo mensual por distrito y tarifa
errores por modelo y mes
errores por distrito y zona
top consumidores por distrito
resumen operacional mensual
ingresos por tarifa mensual
```

## 13. Salidas esperadas

```txt
personas_generadas.csv
contratos_generados.csv
infraestructuras_generadas.csv
medidores_generados.csv
lecturas_generadas.csv
agregados_generados.csv
```

También se puede insertar directo a Cassandra.

## 14. Checklist

```txt
[ ] Catálogos leídos correctamente.
[ ] Personas generadas.
[ ] Contratos generados.
[ ] Infraestructuras generadas.
[ ] Medidores generados.
[ ] Lecturas generadas.
[ ] Errores insertados.
[ ] Duplicados insertados.
[ ] Agregados generados.
[ ] Carga a Cassandra validada.
[ ] Conteos finales documentados.
```
