# 01 — Capa de Datos: Apache Cassandra

## 1. Objetivo de la capa

Diseñar e implementar una base de datos distribuida en Apache Cassandra capaz de almacenar catálogos, usuarios, contratos, infraestructuras, medidores IoT, lecturas históricas, errores, consumos agregados y datos de facturación.

## 2. Principio de diseño

Cassandra no debe modelarse como una base de datos relacional tradicional. El diseño debe hacerse por consulta, creando tablas específicas para los patrones de acceso que el sistema necesita responder.

## 3. Conceptos que se deben defender

| Concepto | Explicación breve |
|---|---|
| Wide-column store | Modelo de almacenamiento por filas distribuidas con columnas flexibles. |
| Keyspace | Contenedor lógico de tablas y configuración de replicación. |
| Partition Key | Define cómo se distribuyen los datos entre nodos. |
| Clustering Columns | Ordenan los datos dentro de una partición. |
| Replication Factor | Número de copias de los datos en el cluster. |
| MemTable | Estructura en memoria donde Cassandra escribe primero. |
| CommitLog | Registro en disco usado para durabilidad. |
| SSTables | Archivos inmutables en disco. |
| Compactación | Proceso que reorganiza SSTables y limpia datos antiguos. |

## 4. Keyspace

Para desarrollo local se puede usar `SimpleStrategy`.

```sql
CREATE KEYSPACE IF NOT EXISTS semapa
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};
```

Para explicar producción:

```sql
CREATE KEYSPACE IF NOT EXISTS semapa
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3
};
```

## 5. Tablas de catálogo

### 5.1 Distritos

```sql
CREATE TABLE IF NOT EXISTS catalogo_distritos (
  id_distrito int PRIMARY KEY,
  nombre text,
  subalcaldia text,
  poblacion int,
  lat double,
  lon double
);
```

### 5.2 Zonas

```sql
CREATE TABLE IF NOT EXISTS catalogo_zonas (
  id_zona uuid PRIMARY KEY,
  id_distrito int,
  distrito text,
  zona text,
  subdistrito text,
  subalcaldia text,
  poblacion int,
  lat double,
  lon double
);
```

### 5.3 Tarifas

```sql
CREATE TABLE IF NOT EXISTS catalogo_tarifas (
  alias text PRIMARY KEY,
  categoria text,
  descripcion text,
  consumo_minimo_m3 decimal,
  cargo_fijo decimal,
  precio_base_m3 decimal,
  moneda text
);
```

### 5.4 Modelos de medidores

```sql
CREATE TABLE IF NOT EXISTS catalogo_modelos_medidor (
  id_modelo int PRIMARY KEY,
  nombre text,
  fabricante text,
  tecnologia text,
  garantia_anios int,
  descripcion text
);
```

### 5.5 Errores IoT

```sql
CREATE TABLE IF NOT EXISTS catalogo_errores_iot (
  codigo int PRIMARY KEY,
  descripcion text,
  tipo text,
  severidad text
);
```

### 5.6 Radiobases

```sql
CREATE TABLE IF NOT EXISTS catalogo_radiobases (
  id_radiobase int PRIMARY KEY,
  nombre text,
  lat double,
  lon double,
  distrito text,
  zona text
);
```

## 6. Tablas operativas

### 6.1 Usuarios por carnet/NIT

```sql
CREATE TABLE IF NOT EXISTS usuarios_por_identificador (
  identificador text PRIMARY KEY,
  tipo_persona text,
  nombre text,
  telefono text,
  email text,
  direccion text
);
```

### 6.2 Contratos por número

```sql
CREATE TABLE IF NOT EXISTS contratos_por_numero (
  numero_contrato text PRIMARY KEY,
  identificador_titular text,
  nombre_titular text,
  tipo_persona text,
  direccion text,
  distrito text,
  zona text,
  tarifa_alias text,
  estado text,
  fecha_alta date
);
```

### 6.3 Infraestructuras por zona

```sql
CREATE TABLE IF NOT EXISTS infraestructuras_por_zona (
  distrito text,
  zona text,
  id_infraestructura uuid,
  numero_contrato text,
  tipo_infraestructura text,
  direccion text,
  lat double,
  lon double,
  cantidad_medidores int,
  PRIMARY KEY ((distrito, zona), id_infraestructura)
);
```

### 6.4 Infraestructura por ID

```sql
CREATE TABLE IF NOT EXISTS infraestructura_por_id (
  id_infraestructura uuid PRIMARY KEY,
  numero_contrato text,
  identificador_titular text,
  tipo_infraestructura text,
  direccion text,
  distrito text,
  zona text,
  lat double,
  lon double,
  cantidad_medidores int
);
```

## 7. Tablas de medidores

### 7.1 Medidor por número de serie

```sql
CREATE TABLE IF NOT EXISTS medidores_por_serie (
  numero_serie text PRIMARY KEY,
  mac text,
  id_modelo int,
  modelo text,
  numero_contrato text,
  id_infraestructura uuid,
  tarifa_alias text,
  distrito text,
  zona text,
  radiobase text,
  fecha_instalacion date,
  estado text,
  lat double,
  lon double
);
```

### 7.2 Medidor por MAC

```sql
CREATE TABLE IF NOT EXISTS medidores_por_mac (
  mac text PRIMARY KEY,
  numero_serie text,
  numero_contrato text,
  distrito text,
  zona text,
  estado text
);
```

### 7.3 Medidores por distrito y zona

```sql
CREATE TABLE IF NOT EXISTS medidores_por_distrito_zona (
  distrito text,
  zona text,
  estado text,
  numero_serie text,
  mac text,
  modelo text,
  tarifa_alias text,
  fecha_instalacion date,
  lat double,
  lon double,
  PRIMARY KEY ((distrito, zona, estado), numero_serie)
);
```

### 7.4 Medidores por radiobase

```sql
CREATE TABLE IF NOT EXISTS medidores_por_radiobase_zona (
  radiobase text,
  distrito text,
  zona text,
  numero_serie text,
  mac text,
  modelo text,
  estado text,
  PRIMARY KEY ((radiobase, distrito), zona, numero_serie)
);
```

## 8. Tablas de lecturas

### 8.1 Lecturas por medidor y mes

```sql
CREATE TABLE IF NOT EXISTS lecturas_por_medidor_mes (
  numero_serie text,
  periodo text,
  fecha_hora timestamp,
  mac text,
  radiobase text,
  lectura_m3 decimal,
  lectura_litros decimal,
  status int,
  descripcion_status text,
  distrito text,
  zona text,
  PRIMARY KEY ((numero_serie, periodo), fecha_hora)
) WITH CLUSTERING ORDER BY (fecha_hora DESC);
```

### 8.2 Lecturas por distrito y hora

```sql
CREATE TABLE IF NOT EXISTS consumo_por_distrito_hora (
  distrito text,
  fecha date,
  hora int,
  zona text,
  consumo_total_m3 decimal,
  cantidad_lecturas int,
  promedio_m3 decimal,
  PRIMARY KEY ((distrito, fecha), hora, zona)
);
```

### 8.3 Consumo mensual por contrato

```sql
CREATE TABLE IF NOT EXISTS consumo_mensual_por_contrato (
  numero_contrato text,
  periodo text,
  identificador_titular text,
  nombre_titular text,
  distrito text,
  zona text,
  tarifa_alias text,
  consumo_m3 decimal,
  monto_bs decimal,
  estado_facturacion text,
  PRIMARY KEY ((numero_contrato), periodo)
) WITH CLUSTERING ORDER BY (periodo DESC);
```

### 8.4 Consumo mensual por distrito y tarifa

```sql
CREATE TABLE IF NOT EXISTS consumo_mensual_por_distrito_tarifa (
  periodo text,
  distrito text,
  tarifa_alias text,
  consumo_total_m3 decimal,
  cantidad_contratos int,
  ingreso_total_bs decimal,
  PRIMARY KEY ((periodo, distrito), tarifa_alias)
);
```

## 9. Tablas de errores

### 9.1 Errores por modelo y mes

```sql
CREATE TABLE IF NOT EXISTS errores_por_modelo_mes (
  periodo text,
  modelo text,
  codigo_error int,
  descripcion_error text,
  cantidad int,
  PRIMARY KEY ((periodo, modelo), codigo_error)
);
```

### 9.2 Errores por distrito y zona

```sql
CREATE TABLE IF NOT EXISTS errores_por_distrito_zona (
  periodo text,
  distrito text,
  zona text,
  codigo_error int,
  descripcion_error text,
  cantidad int,
  PRIMARY KEY ((periodo, distrito), zona, codigo_error)
);
```

## 10. Tablas para dashboard

### 10.1 Resumen operacional

```sql
CREATE TABLE IF NOT EXISTS resumen_operacional_mes (
  periodo text PRIMARY KEY,
  consumo_total_m3 decimal,
  cantidad_medidores int,
  medidores_activos int,
  medidores_inactivos int,
  medidores_fuera_servicio int,
  poblacion_beneficiaria int,
  cantidad_errores int
);
```

### 10.2 Top consumidores por distrito

```sql
CREATE TABLE IF NOT EXISTS top_consumidores_por_distrito_mes (
  periodo text,
  distrito text,
  consumo_m3 decimal,
  numero_contrato text,
  nombre_titular text,
  tarifa_alias text,
  PRIMARY KEY ((periodo, distrito), consumo_m3, numero_contrato)
) WITH CLUSTERING ORDER BY (consumo_m3 DESC);
```

### 10.3 Ingresos por tarifa

```sql
CREATE TABLE IF NOT EXISTS ingresos_por_tarifa_mes (
  periodo text,
  tarifa_alias text,
  categoria text,
  consumo_total_m3 decimal,
  cantidad_contratos int,
  ingreso_total_bs decimal,
  PRIMARY KEY ((periodo), tarifa_alias)
);
```

## 11. Archivo sugerido

Guardar todo el esquema en:

```txt
cassandra/schema.cql
```

## 12. Orden de creación

```txt
1. Keyspace.
2. Catálogos.
3. Usuarios y contratos.
4. Infraestructuras.
5. Medidores.
6. Lecturas.
7. Agregados.
8. Errores.
9. Tablas para dashboard.
```

## 13. Checklist de la capa

```txt
[ ] Keyspace creado.
[ ] Tablas de catálogo creadas.
[ ] Tablas de usuarios creadas.
[ ] Tablas de contratos creadas.
[ ] Tablas de infraestructura creadas.
[ ] Tablas de medidores creadas.
[ ] Tablas de lectura creadas.
[ ] Tablas agregadas creadas.
[ ] Tablas de errores creadas.
[ ] Archivo schema.cql probado.
```
