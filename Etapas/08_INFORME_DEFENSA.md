# 08 — Informe Técnico y Defensa

## 1. Objetivo del documento

Preparar la explicación técnica del proyecto, el informe máximo de 2 páginas y la defensa oral de la práctica.

## 2. Estructura del informe técnico

El informe debe ser breve, técnico y directo.

```txt
1. Introducción
2. Arquitectura del sistema
3. Modelo de datos Cassandra
4. Generación de datos IoT
5. Consultas y dashboard
6. Facturación PDF
7. Justificación técnica
8. Conclusión
```

## 3. Introducción sugerida

```txt
El presente proyecto desarrolla una solución distribuida para la gestión inteligente del consumo de agua potable de SEMAPA, basada en el almacenamiento de lecturas IoT provenientes de medidores inteligentes. La solución utiliza Apache Cassandra como base de datos distribuida, un backend en Go para consultas y procesamiento, y un dashboard web en React para visualizar información operacional, contable y administrativa.
```

## 4. Arquitectura para explicar

```txt
CSV del docente → Generador de datos → Cassandra → Backend Go → Dashboard React → Facturación PDF
```

Explicación corta:

```txt
Los datos base se cargan desde los CSV entregados. Luego se generan infraestructuras, medidores y lecturas simuladas. Cassandra almacena los datos en tablas diseñadas por consulta. El backend consulta Cassandra y expone endpoints REST. El frontend consume la API y muestra dashboards. El módulo de facturación genera recibos PDF y simula el envío por distintos canales.
```

## 5. Justificación de Cassandra

Puntos para decir en defensa:

```txt
Cassandra fue elegida porque permite almacenar grandes volúmenes de datos distribuidos.
Es adecuada para series temporales como lecturas de medidores IoT.
Permite escalabilidad horizontal agregando nodos.
Su diseño se basa en consultas, por eso se crearon tablas específicas para cada necesidad.
La combinación de Partition Key y Clustering Columns permite distribuir y ordenar los datos.
```

## 6. Conceptos Cassandra que todos deben saber

### Wide-column store

Base de datos NoSQL que almacena datos en filas distribuidas con columnas, permitiendo alta escritura y escalabilidad.

### Column family

Equivale conceptualmente a una tabla en Cassandra.

### Partition Key

Parte de la clave primaria que define dónde se guardan los datos dentro del cluster.

### Clustering Columns

Columnas que ordenan los datos dentro de una misma partición.

### Alta disponibilidad

Capacidad del sistema para seguir funcionando aunque un nodo falle, gracias a la replicación.

### Escalabilidad horizontal

Capacidad de crecer agregando más nodos al cluster.

### MemTable

Estructura en memoria donde Cassandra escribe inicialmente.

### CommitLog

Registro en disco que asegura durabilidad ante fallos.

### SSTables

Archivos inmutables donde Cassandra guarda datos en disco.

### Compactación

Proceso que fusiona y reorganiza SSTables para mejorar rendimiento y limpiar datos obsoletos.

## 7. Justificación de Go

```txt
Go fue elegido para el backend por su buen rendimiento, simplicidad para crear APIs y capacidad de manejar procesos concurrentes. Esto es útil para simular y procesar lecturas de medidores IoT. Además, cuenta con driver para conectarse a Cassandra.
```

## 8. Justificación de React

```txt
React fue elegido para el dashboard porque permite construir interfaces interactivas, reutilizar componentes y conectarse fácilmente con APIs REST. Con React se implementan dashboards operacionales, contables y administrativos, incluyendo mapas y gráficos.
```

## 9. Justificación del modelado por consulta

```txt
A diferencia de una base relacional, Cassandra no está pensada para hacer joins complejos. Por eso, las tablas se diseñan según las consultas que el sistema necesita responder. Esto permite obtener respuestas rápidas para dashboards y reportes estratégicos.
```

## 10. Guion de defensa

### Paso 1: Contexto

```txt
SEMAPA enfrenta la necesidad de controlar grandes volúmenes de consumo de agua mediante medidores IoT. Para esto se propone una solución distribuida capaz de almacenar, consultar y visualizar lecturas históricas.
```

### Paso 2: Arquitectura

```txt
El sistema tiene cuatro capas: Cassandra para datos, backend Go para consultas, frontend React para dashboard y facturación PDF para recibos.
```

### Paso 3: Cassandra

```txt
La base fue diseñada por consulta. Se crearon tablas para lecturas por medidor, consumo por distrito, errores por modelo, ingresos por tarifa y facturación mensual.
```

### Paso 4: Simulación

```txt
Se generan personas, contratos, infraestructuras, medidores y lecturas. También se simulan errores y duplicados para representar problemas reales de IoT.
```

### Paso 5: Dashboard

```txt
El dashboard muestra consumo total, medidores activos, consumo por hora, mapa geográfico, ingresos por tarifa y errores técnicos.
```

### Paso 6: Facturación

```txt
El sistema calcula el consumo mensual, aplica la tarifa correspondiente y genera dos recibos: media carta y rollo térmico.
```

### Paso 7: Cierre

```txt
La solución permite convertir lecturas IoT en información útil para operación, administración, contabilidad y atención al usuario.
```

## 11. Preguntas probables del docente

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué Cassandra? | Porque maneja grandes volúmenes distribuidos y series temporales. |
| ¿Por qué no SQL? | Porque el caso requiere alta escritura y consultas específicas sobre lecturas masivas. |
| ¿Qué es Partition Key? | La parte de la clave que distribuye los datos entre nodos. |
| ¿Qué es Clustering Column? | La columna que ordena los datos dentro de una partición. |
| ¿Por qué una tabla por consulta? | Para evitar joins y lecturas costosas. |
| ¿Cómo manejan duplicados? | Se detectan por MAC + timestamp y se excluyen de agregados. |
| ¿Cómo manejan errores? | Se registran con status para análisis técnico. |
| ¿Qué muestra el dashboard? | Consumo, medidores, mapa, errores e ingresos. |
| ¿Cómo se genera factura? | Con consumo mensual + tarifa + PDF. |
| ¿Qué faltaría para producción? | Seguridad, autenticación, cluster real, APIs reales de mensajería y monitoreo. |

## 12. Demo recomendada

```txt
1. Mostrar Docker levantado.
2. Abrir Cassandra y mostrar keyspace.
3. Mostrar API /health.
4. Abrir dashboard operacional.
5. Mostrar mapa y KPIs.
6. Ejecutar una consulta estratégica.
7. Ir a facturación.
8. Generar recibo PDF.
9. Simular notificación.
10. Mostrar informe técnico.
```

## 13. Checklist de defensa

```txt
[ ] Informe máximo 2 páginas.
[ ] Arquitectura clara.
[ ] Conceptos Cassandra estudiados.
[ ] 5 consultas listas para mostrar.
[ ] Dashboard funcionando.
[ ] PDF funcionando.
[ ] Notificación simulada.
[ ] Repositorio ordenado.
[ ] Comandos de ejecución documentados.
[ ] Todos los integrantes saben explicar su parte.
```
