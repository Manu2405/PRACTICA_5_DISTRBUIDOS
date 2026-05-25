# CONSULTAS — Guía completa para defensa

Documento de referencia rápida para responder cualquier consulta en la evaluación.

**Contiene:**
1. Las **25 consultas técnicas** del PDF (págs 13-17) — con queries CQL crudas y endpoint
2. **Guía narrativa** para las preguntas estratégicas de los 3 dashboards

---

## Cómo usar este documento

- **Si el ingeniero pide una de las 25**: corre la query en el frontend (página "Consultas") o ejecuta el CQL crudo aquí pegado en `cqlsh` directamente.
- **Si pregunta algo estratégico frente al dashboard**: usa el guion narrativo de la Parte 2 para responder.

## Acceder a cqlsh (para correr CQL crudas)

```powershell
docker exec -it semapa-cassandra cqlsh
> USE semapa;
> <pegar la query>
```

---

# PARTE 1 — Las 25 consultas técnicas

> **Convención**: cada consulta tiene **(a)** la pregunta del PDF, **(b)** el endpoint del backend, y **(c)** la CQL cruda para `cqlsh`.
>
> ⚠️ Cassandra no soporta JOIN ni GROUP BY arbitrario. Cuando la consulta requiere agregación compleja, el backend la hace en JS sobre el resultado de un `SELECT` plano. La query "cruda" que dejamos aquí es el `SELECT` base — la agregación se aclara abajo.

---

## Q1 — Consumo total por distrito en rangos de 8 horas

**Pregunta:** ¿Consumo promedio por distrito en un rango de 8 horas?

**Endpoint:** `GET /api/consultas/1?periodo=2026-03`

**CQL base:**
```sql
SELECT distrito, fecha_hora, lectura_m3
FROM lecturas_por_medidor_mes
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** agrupar por `(distrito, franja_horaria)` donde franja es `00:00-08:00 / 08:00-16:00 / 16:00-24:00` según `fecha_hora.getHours()`.

---

## Q2 — Comparativa de consumo entre las 4 últimas semanas por distrito

**Pregunta:** ¿Comparativa de consumo entre las 4 últimas semanas de 3 o más distritos?

**Endpoint:** `GET /api/consultas/2?periodo=2026-03`

**CQL base:**
```sql
SELECT distrito, fecha_hora, lectura_m3
FROM lecturas_por_medidor_mes
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** pivot por `(semana_del_mes, distrito)`. Las semanas se calculan con `Math.ceil(fecha_hora.getDate() / 7)` → S1, S2, S3, S4.

---

## Q3 — Contratos con consumo excesivo (Residencial > 45 m³)

**Pregunta:** ¿Identificación de los contratos con consumo excesivo? (Residencial: 300 L × 30 días × 5 hab = 45 m³)

**Endpoint:** `GET /api/consultas/3?periodo=2026-03`

**CQL crudo:**
```sql
SELECT numero_contrato, tarifa_alias, consumo_m3
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
  AND tarifa_alias IN ('R1','R2','R3','R4')
  AND consumo_m3 > 45
ALLOW FILTERING;
```

**Fórmula exceso:** `((consumo - 45) / 45) × 100`

---

## Q4 — Medidores activos por distrito y zona

**Pregunta:** ¿Cuántos medidores están actualmente activos en cada distrito y zona?

**Endpoint:** `GET /api/consultas/4`

**CQL crudo:**
```sql
SELECT distrito, zona, COUNT(*) AS medidores_activos
FROM medidores_por_distrito_zona
WHERE estado = 'activo'
GROUP BY distrito, zona
ALLOW FILTERING;
```
> En Cassandra el `COUNT(*) GROUP BY` solo funciona si las columnas son parte del PK. Aquí `(distrito, zona, estado)` SÍ son parte del PK, así que esta query funciona directo.

---

## Q5 — Medidores fuera de servicio por distrito y zona

**Pregunta:** ¿Cuántos medidores están fuera de servicio?

**Endpoint:** `GET /api/consultas/5`

**CQL crudo:**
```sql
SELECT distrito, zona, COUNT(*) AS fuera_de_servicio
FROM medidores_por_distrito_zona
WHERE estado = 'fuera_servicio'
GROUP BY distrito, zona
ALLOW FILTERING;
```

---

## Q6 — Modelos de medidor con mayor tasa de fallos

**Pregunta:** ¿Qué modelos tienen mayor tasa de fallos?

**Endpoint:** `GET /api/consultas/6?periodo=2026-03`

**CQL base:**
```sql
SELECT modelo, descripcion_error, cantidad
FROM errores_por_modelo_mes
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** `SUM(cantidad) GROUP BY (modelo, descripcion_error)`, orden descendente.

---

## Q7 — Consumo promedio mensual en m³ por tarifa por distrito (matriz)

**Pregunta:** ¿Consumo promedio mensual en m³ por tarifa (Residencial, Comercial, etc.) por distrito?

**Endpoint:** `GET /api/consultas/7?periodo=2026-03`

**CQL base:**
```sql
SELECT periodo, distrito, tarifa_alias, consumo_m3
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** `AVG(consumo) GROUP BY (distrito, categoria)`. Mapeo tarifa→categoría:
- R1, R2, R3, R4 → Residencial
- C → Comercial · CE → Comercial Especial
- I → Industrial · P → Preferencial · S → Social

---

## Q8 — Zonas con consumo anómalo (cero o > 200 m³) por modelo

**Pregunta:** ¿Qué zonas tienen más medidores con consumo anómalo?

**Endpoint:** `GET /api/consultas/8?periodo=2026-03`

**CQL base 1:**
```sql
SELECT numero_contrato, zona, consumo_m3
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
  AND (consumo_m3 = 0 OR consumo_m3 > 200)
ALLOW FILTERING;
```

**CQL base 2 (para cruzar con modelo):**
```sql
SELECT numero_contrato, modelo FROM medidores_por_serie;
```

**Agregación (JS):** cruzar por `numero_contrato`, agrupar por modelo, contar contratos anómalos por modelo y listar las primeras zonas.

---

## Q9 — Lecturas fallidas por tipo de medidor (matriz error × modelo)

**Pregunta:** ¿Cuántas lecturas fallidas o inconsistentes se reportaron en el último mes por tipo de medidor?

**Endpoint:** `GET /api/consultas/9?periodo=2026-03`

**CQL crudo:**
```sql
SELECT periodo, modelo, codigo_error, descripcion_error, cantidad
FROM errores_por_modelo_mes
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Pivot (JS):** filas = código error, columnas = modelos, celdas = cantidad.

---

## Q10 — Porcentaje de medidores con más de 4 años de antigüedad

**Pregunta:** ¿Qué porcentaje de los medidores tienen más de 4 años?

**Endpoint:** `GET /api/consultas/10`

**CQL crudo:**
```sql
SELECT fecha_instalacion FROM medidores_por_serie;
```

**Cálculo (JS):**
```
viejos = count(fecha_instalacion < hoy - 4 años)
porcentaje = viejos / total × 100
```

---

## Q11 — Consumo por zona y categoría residencial (R1, R2, R3, R4)

**Pregunta:** ¿Qué zonas presentan mayor consumo per cápita por categoría residencial?

**Endpoint:** `GET /api/consultas/11?periodo=2026-03`

**CQL crudo:**
```sql
SELECT zona, tarifa_alias, consumo_m3
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
  AND tarifa_alias IN ('R1','R2','R3','R4')
ALLOW FILTERING;
```

**Pivot (JS):** filas = zona, columnas = R1/R2/R3/R4, celda = SUM(consumo_m3).

---

## Q12 — Top 3 clientes con mayor consumo por distrito (mes activo)

**Pregunta:** Imprima los 3 clientes/servicios que más consumen agua por cada Distrito.

**Endpoint:** `GET /api/consultas/12?periodo=2026-03`

**CQL crudo (alternativa Cassandra con vista materializada):**
```sql
-- Si existiera la tabla top_consumidores_por_distrito_mes:
SELECT distrito, consumo_m3, nombre_titular, numero_contrato
FROM top_consumidores_por_distrito_mes
WHERE periodo = '2026-03'
LIMIT 3;
-- (Esta tabla existe pero no se popula en el loader actual)

-- Alternativa que SÍ funciona ahora:
SELECT periodo, distrito, numero_contrato, nombre_titular, consumo_m3
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** agrupar por distrito, ordenar por consumo DESC, tomar top 3 de cada uno.

---

## Q13 — Zonas que requieren renovación (más errores reportados)

**Pregunta:** ¿Qué zonas requieren renovación basados en la cantidad de errores?

**Endpoint:** `GET /api/consultas/13?periodo=2026-03`

**CQL base:**
```sql
SELECT distrito, zona, codigo_error, descripcion_error, cantidad
FROM errores_por_distrito_zona
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** `SUM(cantidad) GROUP BY (distrito, zona, codigo_error)`, orden descendente.

---

## Q14 — [Sorpresa 1] Distribución de contratos por tipo de persona × tarifa

**Pregunta:** Consulta sorpresa 1 — la respondemos con: ¿cuántos contratos tiene cada categoría tarifaria, divididos entre personas naturales y jurídicas?

**Endpoint:** `GET /api/consultas/14`

**CQL crudo:**
```sql
SELECT tipo_persona, tarifa_alias FROM contratos_por_numero;
```

**Agregación (JS):** pivot `tarifa × {naturales, juridicas, total}`.

---

## Q15 — Errores por zona en un distrito específico (parámetro)

**Pregunta:** ¿Qué zonas tienen mayor cantidad de errores reportados en las lecturas dado un distrito X = "MOLLE"?

**Endpoint:** `GET /api/consultas/15?periodo=2026-03&distrito=MOLLE`

**CQL crudo:**
```sql
-- Primero resolver subalcaldía a sus distritos
SELECT id_distrito, nombre, subalcaldia FROM catalogo_distritos
WHERE subalcaldia = 'MOLLE' ALLOW FILTERING;
-- Devuelve: Distrito 3, Distrito 4

-- Luego buscar errores en esos distritos
SELECT distrito, zona, codigo_error, descripcion_error, cantidad
FROM errores_por_distrito_zona
WHERE periodo = '2026-03'
  AND distrito IN ('Distrito 3', 'Distrito 4')
ALLOW FILTERING;
```

**Característica del endpoint:** acepta nombre de subalcaldía ("MOLLE") O nombre directo de distrito ("Distrito 3"). El backend mapea automáticamente.

---

## Q16 — [Sorpresa 2] Cobertura antenas LoRaWAN

**Pregunta:** ¿Qué zonas tienen mayor cobertura de las antenas?

**Endpoint:** `GET /api/consultas/16`

**CQL base:**
```sql
SELECT radiobase, distrito, zona
FROM medidores_por_radiobase_zona;
```

**Agregación (JS):** `COUNT(*) GROUP BY (radiobase, zona)`, orden descendente.

---

## Q17 — Demanda proyectada de agua a 5 años por distrito (2.6%/año)

**Pregunta:** ¿Cuál será la demanda proyectada de agua para los siguientes 5 años por distrito, según crecimiento poblacional?

**Endpoint:** `GET /api/consultas/17?periodo=2026-03`

**CQL base:**
```sql
SELECT distrito, consumo_m3
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Proyección (JS):** para cada distrito, `base = SUM(consumo_m3)` y proyectar:
- año 1 = base × 1.026^1
- año 2 = base × 1.026^2
- ...
- año 5 = base × 1.026^5

---

## Q18 — [Sorpresa 4] Contratos sin consumo registrado en el período

**Pregunta:** Lista de contratos que no tienen ninguna lectura procesada para el período actual.

**Endpoint:** `GET /api/consultas/18?periodo=2026-03`

**CQL bases:**
```sql
SELECT numero_contrato, nombre_titular, distrito, zona, tarifa_alias
FROM contratos_por_numero;

SELECT numero_contrato, periodo
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Cruce (JS):** `contratos NOT IN consumos_del_periodo`.

---

## Q19 — Impacto cambio tarifa Preferencial (P) → Residencial R4

**Pregunta:** ¿Cómo impactaría un cambio de tarifa P a R4 en los ingresos proyectados?

**Endpoint:** `GET /api/consultas/19?periodo=2026-03`

**CQL crudo:**
```sql
SELECT consumo_m3, monto_bs
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
  AND tarifa_alias = 'P'
ALLOW FILTERING;
```

**Cálculo (JS):**
```
precio_P  = 4.58 $us/m³
precio_R4 = 8.69 $us/m³
ingreso_actual  = consumo_total × precio_P
ingreso_sim_R4  = consumo_total × precio_R4
incremento = ingreso_sim_R4 - ingreso_actual
```

---

## Q20 — Medidores que no reportaron consumo (sin lectura en período)

**Pregunta:** ¿Cuáles son los medidores que no reportaron su consumo? (zona, distrito, dirección, número de serie)

**Endpoint:** `GET /api/consultas/20?periodo=2026-03`

**CQL bases:**
```sql
SELECT numero_serie, distrito, zona, numero_contrato
FROM medidores_por_serie;

SELECT numero_serie
FROM lecturas_por_medidor_mes
WHERE periodo = '2026-03'
ALLOW FILTERING;

SELECT numero_contrato, direccion FROM contratos_por_numero;
```

**Cruce (JS):** `medidores WHERE numero_serie NOT IN lecturas_del_periodo`, enriquecer con dirección del contrato.

---

## Q21 — Proyección de ingresos por tipo de tarifa del mes actual

**Pregunta:** ¿Cuál es la proyección de ingresos por consumo de agua por tipo de tarifa para este mes?

**Endpoint:** `GET /api/consultas/21?periodo=2026-03`

**CQL crudo:**
```sql
SELECT tarifa_alias, consumo_m3, monto_bs
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Agregación (JS):** `SUM(consumo), SUM(monto) GROUP BY tarifa_alias`. Mapeo a categoría incluido.

---

## Q22 — Clientes con consumo mínimo residencial (≤ 12 m³)

**Pregunta:** ¿Cuánto y a quiénes debemos cobrar el consumo mínimo de la categoría Residencial?

**Endpoint:** `GET /api/consultas/22?periodo=2026-03`

**CQL crudo:**
```sql
SELECT numero_contrato, nombre_titular, tarifa_alias, consumo_m3, monto_bs
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
  AND tarifa_alias IN ('R1','R2','R3','R4')
  AND consumo_m3 <= 12
ALLOW FILTERING;
```

**Lógica:** estos pagan solo el **cargo fijo** (no hay consumo facturable adicional).

---

## Q23 — Ingresos por tipo de tarifa expresados en pies³ (ft³)

**Pregunta:** ¿Cuál es la proyección de ingresos por consumo de agua por tipo de tarifa en pies³?

**Endpoint:** `GET /api/consultas/23?periodo=2026-03`

**CQL crudo:**
```sql
SELECT tarifa_alias, consumo_m3, monto_bs
FROM consumo_mensual_por_contrato
WHERE periodo = '2026-03'
ALLOW FILTERING;
```

**Conversión (JS):** `1 m³ = 35.3147 ft³`

---

## Q24 — [Sorpresa] Balance financiero: ingresos esperados por período

**Pregunta:** ¿Cuál es el balance financiero (facturado, cobrado, pendiente, vencido) por período?

**Endpoint:** `GET /api/consultas/24`

**CQL crudo:**
```sql
SELECT periodo, monto_bs, estado_facturacion
FROM consumo_mensual_por_contrato
ALLOW FILTERING;
```

**Agregación (JS):** por período, `SUM(monto_bs)` separando por `estado_facturacion`:
- `pagado` + `pagado_atrasado` → cobrado_bs
- `pendiente` → pendiente_bs
- `vencido` → vencido_bs

**Tasa de recuperación:** `cobrado / facturado × 100`

---

## Q25 — Resumen general del sistema SEMAPA

**Pregunta:** Vista panorámica de toda la operación SEMAPA.

**Endpoint:** `GET /api/consultas/25`

**CQL bases (5 queries combinadas):**
```sql
SELECT estado FROM medidores_por_serie;
SELECT estado FROM contratos_por_numero;
SELECT periodo, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING;
SELECT poblacion FROM catalogo_distritos;
SELECT zona FROM catalogo_zonas;
```

**Devuelve KPIs:** total medidores (activos/inactivos/fuera servicio), total contratos, total zonas, total distritos, población beneficiaria, consumo total, ingresos acumulados, consumo per cápita.

---

# PARTE 2 — Guía narrativa (preguntas estratégicas)

> Estas preguntas aparecen como títulos de bloques en el PDF (págs 4-8). NO tienen respuesta numérica única — se responden **narrando frente al dashboard**.
>
> Para cada una: **(a)** dónde mirar en el dashboard, **(b)** un guion modelo.

---

## DASHBOARD 1 — Alcaldía Municipal

### "¿Estamos ampliando el acceso al agua?" (Cobertura del servicio)

**Dónde mirar:** Mapa GIS de distritos + KPI cobertura + tabla de zonas vulnerables.

**Guion modelo:**
> "Según el dashboard de Alcaldía, tenemos cobertura activa en los 15 distritos de Cochabamba con un total de **100.000 contratos** registrados. La distribución por subalcaldía muestra que TUNARI, MOLLE y ADELA ZAMUDIO concentran el mayor número de usuarios. Las zonas con menor cobertura son las del extremo sur (ITOCTA), lo que sugiere oportunidad de expansión para alcanzar más hogares."

### "¿Qué zonas tienen brechas de acceso?" (Equidad territorial)

**Dónde mirar:** Heatmap distrital + tabla "distritos con menor disponibilidad".

**Guion modelo:**
> "El consumo promedio por habitante varía significativamente entre distritos. ALEJO CALATAYUD y VALLE HERMOSO muestran consumo per cápita por debajo del promedio municipal, lo que indica una brecha de acceso. El índice de desigualdad hídrica (calculable como ratio entre el distrito de mayor y menor consumo) nos muestra una diferencia de hasta X veces."

### "¿La ciudad está consumiendo más agua de la disponible?" (Sostenibilidad)

**Dónde mirar:** Serie temporal mensual de consumo + KPI consumo total.

**Guion modelo:**
> "El consumo total mensual ha mostrado una **tendencia ascendente** entre febrero y abril 2026 (visible en el gráfico de Facturación Mensual). El consumo per cápita está en X m³/mes, por debajo del estándar OMS de 300 L/persona/día. Sin embargo, la **proyección a 5 años** (consulta Q17) muestra un crecimiento del 2.6% anual que podría llevar al sistema cerca de su capacidad."

### "¿Qué efecto tiene el clima sobre la demanda?" (Impacto climático)

**Dónde mirar:** ComposedChart "Consumo vs Temperatura" + alertas por sobreconsumo.

**Guion modelo:**
> "El dashboard muestra correlación entre temperatura y demanda hídrica. En meses cálidos como abril, el consumo se incrementa aproximadamente X% respecto a meses frescos. Las zonas críticas por estrés hídrico (identificadas con alerta roja) son aquellas donde el consumo supera la disponibilidad estimada de la red."

### "¿Nuestra infraestructura digital está funcionando?" (Infraestructura inteligente)

**Dónde mirar:** KPI medidores activos / inactivos / fuera de servicio + % sensores con fallas.

**Guion modelo:**
> "Tenemos **100.000 medidores IoT instalados**, de los cuales aproximadamente el **X% están activos** (visible en el KPI de medidores). El % de sensores con fallas se mantiene en torno al **0.5%**, dentro del rango esperado según el PDF. La calidad de señal LoRaWAN varía por radiobase — el Q16 muestra que LoRaWan-Teleferico cubre la mayoría de zonas."

---

## DASHBOARD 2 — Gerencia / Directorio SEMAPA

### "¿Qué tan saludable está la red IoT?" (Estado del parque de medidores)

**Dónde mirar:** Dashboard de Administración → KPI Total Errores + BarChart Errores por Modelo + KPIs medidores por estado.

**Guion modelo:**
> "El parque IoT muestra señales mixtas: el **X% de medidores está activo**, pero detectamos un patrón en los errores donde el modelo **Siconia WATER WM-NB** y **OY1320 LoRaWAN** concentran más fallos (visible en el BarChart 'Errores por Modelo'). Los 3 tipos de error principales son falla eléctrica, conectividad de red y configuración del sensor. La edad promedio de medidores está en Y años, con un **5.21% con más de 4 años** (consulta Q10) que podrían requerir renovación."

### "¿Dónde debemos enviar la inspección?" (Gestión de anomalías)

**Dónde mirar:** Dashboard de Administración → Top 10 Distritos Afectados + tabla anomalías.

**Guion modelo:**
> "El gráfico 'Top 10 Distritos Afectados' nos señala dónde concentrar las inspecciones. Las zonas con consumo anómalo (cero o excesivo, ver Q8) son focos de revisión: cero indica posible medidor dañado o vivienda desocupada, excesivo sugiere fuga oculta. Específicamente, las zonas COÑA COÑA, HIPODROMO y MESADILLA muestran mayor incidencia."

### "¿Estamos comunicando bien al ciudadano?" (Eficiencia comercial)

**Dónde mirar:** Dashboard de Contabilidad → sección Preavisos Emitidos.

**Guion modelo:**
> "Emitimos **1.472 preavisos** en el período actual, distribuidos en tres canales: **email (43%), SMS (33%) y WhatsApp (24%)**. La tasa de entrega global es del **X%**, siendo email el canal con mejor performance. Los preavisos están dirigidos a los contratos con `estado_facturacion = 'vencido'` o `'pendiente'`, lo que muestra que nuestro sistema de cobranza preventiva está activamente trabajando."

---

## DASHBOARD 3 — Contabilidad SEMAPA

### "¿Cuánto estamos cobrando?" (Facturación)

**Dónde mirar:** ComposedChart "Monto Facturado Mensual" + BarChart "Facturación por Distrito".

**Guion modelo:**
> "Facturamos **Bs X** en el período 2026-04, con una variación del **+Y%** respecto al mes anterior (visible en el gráfico mensual). La facturación por distrito muestra que Distrito 8, 5 y 1 concentran los mayores ingresos. El **ticket promedio** está en Bs Z por contrato, calculado como facturación total / número de contratos activos."

### "¿Cuánto realmente estamos cobrando?" (Recaudación)

**Dónde mirar:** Q24 (balance financiero) + KPI Ingresos Totales.

**Guion modelo:**
> "Del total facturado, el **X% está pagado** (con o sin atraso). La consulta Q24 nos da el desglose preciso: facturado, cobrado, pendiente y vencido por período. La **tasa de recuperación** del período más reciente está en aproximadamente Y%."

### "¿Dónde está nuestro riesgo financiero?" (Morosidad)

**Dónde mirar:** Sección Cartera Vencida (aging buckets) + tabla Gestión de Deudores.

**Guion modelo:**
> "Tenemos **1.472 contratos vencidos** en el período 2026-02, concentrados en el bucket **61-90 días** (porque las facturas de febrero llevan 64 días vencidas). El bucket más crítico (90+ días) tiene Bs X en riesgo. La cartera vencida total asciende a **Bs Y**, equivalente al Z% de la facturación. Los grandes deudores están listados en la tabla con su dirección para gestión de cobranza."

### "¿Qué canal cobra mejor?" (Preavisos)

**Dónde mirar:** Sección Preavisos por canal en Contabilidad.

**Guion modelo:**
> "Comparando los 3 canales, **email tiene la mayor tasa de entrega (90%)**, seguido por SMS (87.5%) y WhatsApp (81.7%). WhatsApp tiene menor entrega pero potencialmente mayor tasa de apertura — sería interesante medir conversión a pago en una siguiente iteración. La efectividad combinada nos da un tasa global del 87.2%."

### "¿Qué decisiones tarifarias debemos tomar?" (Proyección financiera)

**Dónde mirar:** Q19 (impacto cambio P→R4) + Q21 (ingresos por tarifa).

**Guion modelo:**
> "La consulta Q19 nos permite simular el impacto de **migrar tarifa Preferencial a Residencial R4**: con N contratos en categoría P consumiendo X m³, el cambio elevaría los ingresos en **Bs Y**. Sin embargo, hay que evaluar el impacto social — la tarifa P aplica a hospitales y colegios estatales. La distribución actual de ingresos por tarifa (Q21) muestra que el segmento **Comercial** aporta el mayor volumen, seguido de Residencial R4."

---

# Anexo — Tips para la defensa

1. **Si el ingeniero pregunta una de las 25**: ve a `http://localhost:5173/consultas`, busca la consulta por número y dale clic. Si el frontend está caído, abre `cqlsh` y pega el CQL crudo de este documento.

2. **Si pregunta algo no listado en las 25**: combina dos consultas. Por ejemplo, "¿cuánto cobramos por zona?" → Q21 (ingresos por tarifa) + Q4 (medidores por zona) cruzando manualmente.

3. **Si pregunta "explica esta query"**: las que tienen `ALLOW FILTERING` son las que no usan el partition key — son aceptables en dev pero en producción se optimizan creando una **vista materializada** o una nueva tabla con el partition key adecuado.

4. **Para defender conceptos de Cassandra**:
   - **Wide-column store**: el ejemplo más claro es `lecturas_por_medidor_mes` — cada partición (`numero_serie, periodo`) tiene muchas filas (una por timestamp), modelo column-family.
   - **Partition key**: la primera tupla del PRIMARY KEY. Determina en qué nodo vive la fila.
   - **Clustering columns**: las siguientes. Determinan el orden dentro de la partición.
   - **Replication factor**: cuántas copias hay. Hoy 1, en clúster 2 nodos se sube a 2.
   - **Consistency level**: `LOCAL_ONE` para dev, `QUORUM` para producción con 2+ nodos.
   - **Por qué no hay JOIN**: Cassandra desnormaliza — preferimos tablas redundantes que el cruce en runtime.

5. **Si el ingeniero pide cargar SU CSV en vivo**: el procedimiento es:
   ```powershell
   # Copiar el CSV al lugar correcto:
   Copy-Item "ruta/del/csv/del/ingeniero.csv" "Recursos/03 Practica 5 Recursos lecturas_iot.csv"

   # Truncar las tablas afectadas:
   docker exec semapa-cassandra cqlsh -e "USE semapa; TRUNCATE lecturas_por_medidor_mes; TRUNCATE consumo_mensual_por_contrato; TRUNCATE notificaciones_por_contrato;"

   # Recargar:
   Set-Location scripts-data
   pnpm run cargar-csvs
   ```
   Tarda ~5-8 min para CSVs grandes. Las 25 consultas seguirán funcionando inmediatamente después.
