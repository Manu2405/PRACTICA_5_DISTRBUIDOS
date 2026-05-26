-- ============================================================
-- SEMAPA - Sistema de Gestión Inteligente de Agua Potable
-- Schema Cassandra
-- ============================================================

-- 1. KEYSPACE
-- NetworkTopologyStrategy + RF=2 = cada fila vive en los 2 nodos del clúster.
-- Si una laptop se cae, los datos siguen disponibles desde la otra (HA).
-- Para single-node sigue funcionando: Cassandra solo crea las réplicas que puede.
CREATE KEYSPACE IF NOT EXISTS semapa
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 2
};

USE semapa;

-- ============================================================
-- 2. TABLAS DE CATÁLOGO
-- ============================================================

-- 2.1 Distritos
CREATE TABLE IF NOT EXISTS catalogo_distritos (
  id_distrito int PRIMARY KEY,
  nombre text,
  subalcaldia text,
  poblacion int,
  lat double,
  lon double
);

-- 2.2 Zonas
CREATE TABLE IF NOT EXISTS catalogo_zonas (
  id_zona uuid PRIMARY KEY,
  id_distrito int,
  distrito text,
  subdistrito text,
  zona text,
  subalcaldia text,
  gateway text,
  habitantes int,
  r1 int,
  r2 int,
  r3 int,
  r4 int,
  c int,
  ce int,
  i int,
  p int,
  s int,
  total int
);

-- 2.3 Tarifas
CREATE TABLE IF NOT EXISTS catalogo_tarifas (
  alias text PRIMARY KEY,
  categoria text,
  descripcion text,
  consumo_minimo_m3 decimal,
  cargo_fijo decimal,
  rango_13_25 decimal,
  rango_26_50 decimal,
  rango_51_75 decimal,
  rango_76_100 decimal,
  rango_101_150 decimal,
  rango_151_mas decimal,
  moneda text
);

-- 2.4 Modelos de medidores
CREATE TABLE IF NOT EXISTS catalogo_modelos_medidor (
  id_modelo int PRIMARY KEY,
  nombre text,
  fabricante text,
  tecnologia text,
  aplicacion text,
  datasheet text
);

-- 2.5 Errores IoT
CREATE TABLE IF NOT EXISTS catalogo_errores_iot (
  codigo int PRIMARY KEY,
  descripcion text
);

-- 2.6 Gateways / Radiobases
CREATE TABLE IF NOT EXISTS catalogo_gateways (
  id_gateway int PRIMARY KEY,
  nombre text,
  lat double,
  lon double
);

-- 2.7 Tipos de infraestructura
CREATE TABLE IF NOT EXISTS catalogo_tipos_infraestructura (
  id_tipo int PRIMARY KEY,
  descripcion text
);

-- ============================================================
-- 3. TABLAS OPERATIVAS
-- ============================================================

-- 3.1 Usuarios por carnet/NIT
CREATE TABLE IF NOT EXISTS usuarios_por_identificador (
  identificador text PRIMARY KEY,
  tipo_persona text,
  nombre text,
  telefono text,
  email text,
  direccion text
);

-- 3.2 Contratos por número
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

-- Índice secundario para búsqueda por CI desde el visor (totem ciudadano)
CREATE INDEX IF NOT EXISTS contratos_por_ci_idx ON contratos_por_numero (identificador_titular);

-- 3.3 Infraestructuras por zona
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

-- 3.4 Infraestructura por ID
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

-- ============================================================
-- 4. TABLAS DE MEDIDORES
-- ============================================================

-- 4.1 Medidor por número de serie
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

-- 4.2 Medidor por MAC
CREATE TABLE IF NOT EXISTS medidores_por_mac (
  mac text PRIMARY KEY,
  numero_serie text,
  numero_contrato text,
  distrito text,
  zona text,
  estado text
);

-- 4.3 Medidores por distrito y zona
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

-- 4.4 Medidores por radiobase
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

-- ============================================================
-- 5. TABLAS DE LECTURAS
-- ============================================================

-- 5.1 Lecturas por medidor y mes
CREATE TABLE IF NOT EXISTS lecturas_por_medidor_mes (
  numero_serie text,
  periodo text,
  fecha_hora timestamp,
  mac text,
  radiobase text,
  lectura_m3 decimal,
  lectura_litros decimal,
  lectura_anterior_m3 decimal,
  lectura_actual_m3 decimal,
  status int,
  descripcion_status text,
  distrito text,
  zona text,
  origen text,
  PRIMARY KEY ((numero_serie, periodo), fecha_hora)
) WITH CLUSTERING ORDER BY (fecha_hora DESC);

-- 5.2 Consumo por distrito y hora
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

-- 5.3 Consumo mensual por contrato
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
  fecha_emision date,
  fecha_vencimiento date,
  fecha_pago timestamp,
  dias_atraso int,
  PRIMARY KEY ((numero_contrato), periodo)
) WITH CLUSTERING ORDER BY (periodo DESC);

-- 5.4 Consumo mensual por distrito y tarifa
CREATE TABLE IF NOT EXISTS consumo_mensual_por_distrito_tarifa (
  periodo text,
  distrito text,
  tarifa_alias text,
  consumo_total_m3 decimal,
  cantidad_contratos int,
  ingreso_total_bs decimal,
  PRIMARY KEY ((periodo, distrito), tarifa_alias)
);

-- ============================================================
-- 6. TABLAS DE ERRORES
-- ============================================================

-- 6.1 Errores por modelo y mes
CREATE TABLE IF NOT EXISTS errores_por_modelo_mes (
  periodo text,
  modelo text,
  codigo_error int,
  descripcion_error text,
  cantidad int,
  PRIMARY KEY ((periodo, modelo), codigo_error)
);

-- 6.2 Errores por distrito y zona
CREATE TABLE IF NOT EXISTS errores_por_distrito_zona (
  periodo text,
  distrito text,
  zona text,
  codigo_error int,
  descripcion_error text,
  cantidad int,
  PRIMARY KEY ((periodo, distrito), zona, codigo_error)
);

-- ============================================================
-- 7. TABLAS PARA DASHBOARD
-- ============================================================

-- 7.1 Resumen operacional mensual
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

-- 7.2 Top consumidores por distrito y mes
CREATE TABLE IF NOT EXISTS top_consumidores_por_distrito_mes (
  periodo text,
  distrito text,
  consumo_m3 decimal,
  numero_contrato text,
  nombre_titular text,
  tarifa_alias text,
  PRIMARY KEY ((periodo, distrito), consumo_m3, numero_contrato)
) WITH CLUSTERING ORDER BY (consumo_m3 DESC);

-- 7.3 Ingresos por tarifa mensual
CREATE TABLE IF NOT EXISTS ingresos_por_tarifa_mes (
  periodo text,
  tarifa_alias text,
  categoria text,
  consumo_total_m3 decimal,
  cantidad_contratos int,
  ingreso_total_bs decimal,
  PRIMARY KEY ((periodo), tarifa_alias)
);

-- ============================================================
-- 8. TABLA DE NOTIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones_por_contrato (
  numero_contrato text,
  periodo text,
  fecha_hora timestamp,
  formato text,
  identificador text,
  estado text,
  tipo text,
  mensaje text,
  PRIMARY KEY ((numero_contrato, periodo), fecha_hora)
) WITH CLUSTERING ORDER BY (fecha_hora DESC);
