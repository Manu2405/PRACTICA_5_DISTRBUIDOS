# CONSULTAS_DOCKER.md — Las 25 consultas listas para `docker exec`

Comandos copy-paste para el día de la evaluación. Cada consulta tiene:
1. **Pregunta del PDF**
2. **Comando Docker** (PowerShell, listo para pegar)
3. **Endpoint del backend** equivalente (si el evaluador prefiere ver el dashboard)

> ⚠️ Cassandra **no soporta `GROUP BY` arbitrario ni `JOIN`**. Las consultas marcadas con 🔧 **requieren agregación** que solo el backend Node hace en JS. Para esas, el CQL aquí trae los datos crudos y la agregación final está en `consultasController.js`. Para defensa: muestras el endpoint del backend (que ya agrega) y opcionalmente el CQL crudo (que prueba que los datos están en Cassandra).

## Antes de empezar — verifica que Cassandra esté arriba

```powershell
docker ps --filter "name=semapa-cassandra"
# Debe mostrar Status: Up (healthy)
```

---

## Q1 — Consumo por distrito en rangos de 8 horas 🔧

**Pregunta:** ¿Consumo promedio por distrito en un rango de 8 horas?

**Endpoint:** `GET http://localhost:8080/api/consultas/1?periodo=2026-03`

**Docker (sample crudo de lecturas):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE periodo = '2026-03' LIMIT 10 ALLOW FILTERING;"
```

**Nota:** la agregación por franjas (0-8 / 8-16 / 16-24) se calcula en JS sobre el `fecha_hora.getHours()`.

---

## Q2 — Comparativa 4 últimas semanas por distrito 🔧

**Pregunta:** ¿Comparativa de consumo entre las 4 últimas semanas?

**Endpoint:** `GET http://localhost:8080/api/consultas/2?periodo=2026-03`

**Docker (sample):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE periodo = '2026-03' LIMIT 10 ALLOW FILTERING;"
```

**Nota:** el pivot por semana del mes (`Math.ceil(día / 7)`) se hace en JS.

---

## Q3 — Contratos residenciales con consumo > 45 m³ ✅ Directo

**Pregunta:** Contratos con consumo excesivo (> 45 m³ = 300 L × 30 días × 5 hab según ONU)

**Endpoint:** `GET http://localhost:8080/api/consultas/3?periodo=2026-03`

**Docker (directo, sin agregación):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_contrato, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' AND tarifa_alias IN ('R1','R2','R3','R4') AND consumo_m3 > 45 LIMIT 15 ALLOW FILTERING;"
```

---

## Q4 — Medidores activos por distrito y zona ✅ Directo

**Pregunta:** ¿Cuántos medidores están activos en cada distrito y zona?

**Endpoint:** `GET http://localhost:8080/api/consultas/4`

**Docker (con GROUP BY nativo):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, zona, COUNT(*) FROM medidores_por_distrito_zona WHERE estado = 'activo' GROUP BY distrito, zona LIMIT 15 ALLOW FILTERING;"
```

---

## Q5 — Medidores fuera de servicio por distrito y zona ✅ Directo

**Pregunta:** ¿Cuántos medidores están fuera de servicio?

**Endpoint:** `GET http://localhost:8080/api/consultas/5`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, zona, COUNT(*) FROM medidores_por_distrito_zona WHERE estado = 'fuera_servicio' GROUP BY distrito, zona LIMIT 15 ALLOW FILTERING;"
```

---

## Q6 — Modelos de medidor con más fallas ✅ Directo

**Pregunta:** ¿Qué modelos tienen mayor tasa de fallos?

**Endpoint:** `GET http://localhost:8080/api/consultas/6?periodo=2026-03`

**Docker (los datos están agregados en la tabla):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes WHERE periodo = '2026-03' ALLOW FILTERING;"
```

---

## Q7 — Consumo promedio mensual por tarifa y distrito 🔧

**Pregunta:** Matriz consumo promedio: filas = distrito, columnas = categoría tarifaria

**Endpoint:** `GET http://localhost:8080/api/consultas/7?periodo=2026-03`

**Docker (datos crudos):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' LIMIT 20 ALLOW FILTERING;"
```

**Nota:** el AVG por (distrito × categoría) se calcula en JS.

---

## Q8 — Zonas con consumo anómalo (cero o > 200 m³) 🔧

**Pregunta:** ¿Qué zonas tienen más medidores con consumo anómalo?

**Endpoint:** `GET http://localhost:8080/api/consultas/8?periodo=2026-03`

**Docker (consumos anómalos crudos):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_contrato, zona, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' AND (consumo_m3 = 0 OR consumo_m3 > 200) LIMIT 15 ALLOW FILTERING;"
```

**Nota:** el cruce con modelo de medidor se hace en JS.

---

## Q9 — Matriz lecturas fallidas (código error × modelo) ✅ Directo

**Pregunta:** ¿Cuántas lecturas fallidas por tipo de medidor?

**Endpoint:** `GET http://localhost:8080/api/consultas/9?periodo=2026-03`

**Docker (los datos ya están listos para pivotar):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes WHERE periodo = '2026-03' ALLOW FILTERING;"
```

---

## Q10 — % medidores con más de 4 años de antigüedad 🔧

**Pregunta:** ¿Qué porcentaje de medidores tienen >4 años?

**Endpoint:** `GET http://localhost:8080/api/consultas/10`

**Docker (total + sample fechas):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT COUNT(*) FROM medidores_por_serie LIMIT 1;"
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_serie, fecha_instalacion FROM medidores_por_serie LIMIT 10;"
```

**Nota:** el filtro `fecha_instalacion < hoy - 4 años` se hace en JS.

---

## Q11 — Consumo por zona y categoría residencial 🔧

**Pregunta:** Consumo per cápita por zona × R1/R2/R3/R4

**Endpoint:** `GET http://localhost:8080/api/consultas/11?periodo=2026-03`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT zona, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' AND tarifa_alias IN ('R1','R2','R3','R4') LIMIT 20 ALLOW FILTERING;"
```

---

## Q12 — Top 3 clientes con mayor consumo por distrito 🔧

**Pregunta:** Los 3 clientes que más consumen por distrito

**Endpoint:** `GET http://localhost:8080/api/consultas/12?periodo=2026-03`

**Docker (datos crudos):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, numero_contrato, nombre_titular, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' LIMIT 20 ALLOW FILTERING;"
```

**Nota:** el agrupado por distrito + sort desc + top 3 se hace en JS.

---

## Q13 — Zonas que requieren renovación de medidores ✅ Directo

**Pregunta:** ¿Qué zonas requieren renovación basados en cantidad de errores?

**Endpoint:** `GET http://localhost:8080/api/consultas/13?periodo=2026-03`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona WHERE periodo = '2026-03' LIMIT 15 ALLOW FILTERING;"
```

---

## Q14 — [Sorpresa 1] Distribución contratos por tipo persona × tarifa 🔧

**Pregunta:** Cuántos contratos hay por categoría tarifaria, divididos entre naturales y jurídicas

**Endpoint:** `GET http://localhost:8080/api/consultas/14`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT tipo_persona, tarifa_alias FROM contratos_por_numero LIMIT 20;"
```

**Nota:** el COUNT(*) GROUP BY (tarifa, tipo_persona) se hace en JS.

---

## Q15 — Errores por zona en un distrito específico ✅ Directo

**Pregunta:** ¿Qué zonas tienen mayor cantidad de errores en distrito MOLLE?

**Endpoint:** `GET http://localhost:8080/api/consultas/15?periodo=2026-03&distrito=MOLLE`

**Docker (con índice y filtro nativo):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona WHERE periodo = '2026-03' AND distrito IN ('Distrito 3', 'Distrito 4') ALLOW FILTERING;"
```

**Nota:** MOLLE = Distritos 3 y 4 (mapeo subalcaldía → distritos en `catalogo_distritos`).

---

## Q16 — [Sorpresa 2] Cobertura antenas LoRaWAN 🔧

**Pregunta:** ¿Qué zonas tienen mayor cobertura por antena?

**Endpoint:** `GET http://localhost:8080/api/consultas/16`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT radiobase, zona, distrito FROM medidores_por_radiobase_zona LIMIT 20;"
```

**Nota:** COUNT(*) por (radiobase, zona) se hace en JS.

---

## Q17 — Demanda proyectada a 5 años por distrito 🔧

**Pregunta:** Proyección de consumo a 5 años con factor 2.6%/año

**Endpoint:** `GET http://localhost:8080/api/consultas/17?periodo=2026-03`

**Docker (consumo base):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT distrito, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' LIMIT 20 ALLOW FILTERING;"
```

**Nota:** la proyección `base × 1.026^año` para años 1-5 se hace en JS.

---

## Q18 — [Sorpresa 4] Contratos sin consumo registrado 🔧

**Pregunta:** Contratos que no tienen ninguna lectura procesada en el período

**Endpoint:** `GET http://localhost:8080/api/consultas/18?periodo=2026-03`

**Docker (los dos sets a cruzar):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT COUNT(*) FROM contratos_por_numero LIMIT 1;"
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_contrato FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' LIMIT 10 ALLOW FILTERING;"
```

**Nota:** el `contratos NOT IN consumos` se calcula en JS.

---

## Q19 — Impacto cambio tarifa Preferencial → R4 🔧

**Pregunta:** ¿Cómo impactaría cambiar P a R4 en los ingresos?

**Endpoint:** `GET http://localhost:8080/api/consultas/19?periodo=2026-03`

**Docker (contratos Preferencial):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_contrato, consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' AND tarifa_alias = 'P' LIMIT 15 ALLOW FILTERING;"
```

**Cálculo (JS):** `consumo_total × ($us 8.69 – $us 4.58)`

---

## Q20 — Medidores que no reportaron consumo 🔧

**Pregunta:** Medidores sin lectura en el período (zona, distrito, dirección, serie)

**Endpoint:** `GET http://localhost:8080/api/consultas/20?periodo=2026-03`

**Docker (medidores totales + sample lecturas):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_serie, distrito, zona FROM medidores_por_serie LIMIT 10;"
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_serie FROM lecturas_por_medidor_mes WHERE periodo = '2026-03' LIMIT 10 ALLOW FILTERING;"
```

**Nota:** el `medidores NOT IN lecturas_del_periodo` se calcula en JS.

---

## Q21 — Proyección de ingresos por tarifa del mes 🔧

**Pregunta:** Ingresos proyectados por categoría tarifaria

**Endpoint:** `GET http://localhost:8080/api/consultas/21?periodo=2026-03`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' LIMIT 20 ALLOW FILTERING;"
```

**Nota:** `SUM(consumo), SUM(monto) GROUP BY tarifa` en JS.

---

## Q22 — Clientes con consumo mínimo residencial (≤ 12 m³) ✅ Directo

**Pregunta:** ¿Cuánto y a quiénes cobrar el consumo mínimo? (pagan solo cargo fijo)

**Endpoint:** `GET http://localhost:8080/api/consultas/22?periodo=2026-03`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT numero_contrato, nombre_titular, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' AND tarifa_alias IN ('R1','R2','R3','R4') AND consumo_m3 <= 12 LIMIT 15 ALLOW FILTERING;"
```

---

## Q23 — Ingresos por tarifa en pies³ 🔧

**Pregunta:** Mismos ingresos que Q21 pero con consumo en pies cúbicos

**Endpoint:** `GET http://localhost:8080/api/consultas/23?periodo=2026-03`

**Docker:**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE periodo = '2026-03' LIMIT 20 ALLOW FILTERING;"
```

**Nota:** conversión `m³ × 35.3147 = ft³` en JS.

---

## Q24 — [Sorpresa] Balance financiero por período ✅ Directo

**Pregunta:** Facturado / cobrado / pendiente / vencido por período

**Endpoint:** `GET http://localhost:8080/api/consultas/24`

**Docker (sample con estados):**
```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT periodo, monto_bs, estado_facturacion FROM consumo_mensual_por_contrato LIMIT 20 ALLOW FILTERING;"
```

**Nota:** GROUP BY periodo + breakdown por estado en JS.

---

## Q25 — Resumen general del sistema SEMAPA 🔧

**Pregunta:** Vista panorámica de toda la operación

**Endpoint:** `GET http://localhost:8080/api/consultas/25`

**Docker (5 queries combinadas):**
```powershell
# Total medidores
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT COUNT(*) FROM medidores_por_serie LIMIT 1;"

# Total contratos
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT COUNT(*) FROM contratos_por_numero LIMIT 1;"

# Total zonas y distritos
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT COUNT(*) FROM catalogo_zonas LIMIT 1;"
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT COUNT(*) FROM catalogo_distritos LIMIT 1;"

# Población beneficiaria
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT id_distrito, nombre, poblacion FROM catalogo_distritos;"
```

---

# Verificaciones rápidas adicionales

## Estado del clúster Cassandra

```powershell
docker exec semapa-cassandra nodetool status
```

## Listado de todas las tablas del keyspace

```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; DESC TABLES;"
```

## Verificar el índice secundario sobre CI

```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; DESC INDEX contratos_por_ci_idx;"
```

## Buscar un contrato específico

```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT * FROM contratos_por_numero WHERE numero_contrato = 'CT-00048352';"
```

## Buscar por CI (gracias al índice)

```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT * FROM contratos_por_numero WHERE identificador_titular = '8382172 CBBA';"
```

## Ver lecturas registradas por la app móvil (`origen='app_movil'`)

```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT periodo, fecha_hora, mac, lectura_actual_m3 FROM lecturas_por_medidor_mes WHERE origen = 'app_movil' LIMIT 10 ALLOW FILTERING;"
```

## Ver preavisos generados

```powershell
docker exec semapa-cassandra cqlsh -e "USE semapa; SELECT periodo, fecha_hora, formato, estado FROM notificaciones_por_contrato WHERE tipo = 'preaviso' LIMIT 10 ALLOW FILTERING;"
```

---

# Notas para la defensa

## Por qué algunas consultas son 🔧 (requieren JS)

Cassandra es **wide-column store**, no relacional. Sus restricciones:
1. **`GROUP BY` solo funciona con columnas del PRIMARY KEY** (no arbitrario)
2. **NO hay `JOIN`** — usamos desnormalización
3. **NO hay funciones de agregación complejas** (sin `AVG()` arbitrario, sin `STDDEV()`, etc.)

Por eso el backend hace `SELECT ... ALLOW FILTERING` para traer datos crudos, y luego en JS hace `Map`/`reduce` para agrupar. Esto es el patrón **read-time aggregation**, válido cuando el volumen es manejable (decenas de miles de filas).

**Para producción** se optimiza creando **vistas materializadas** o **tablas con PK específica para esa query** (lo que se llama "modelar por query"). Para esta práctica con 100k filas, el patrón actual es suficiente.

## Patrón al responder al evaluador

1. **Muestra el endpoint del backend** (devuelve resultado final, agregado)
2. **Si pregunta "cómo lo haces sin GROUP BY":** muestra el CQL crudo aquí (prueba que los datos están en Cassandra) y explica la agregación en JS
3. **Si pregunta por el modelo:** abre `cassandra/schema.cql` y muestra el `PRIMARY KEY` de la tabla involucrada
