# Pruebas de carga

## 1. Alcance

Este documento registra la prueba de carga del backend de Hotel Booking sobre un ambiente desplegado en cloud, sus métricas y la comparación con los requerimientos no funcionales del entregable E1.

## 2. Escenario

| Elemento | Definición |
|----------|------------|
| Herramienta | k6, ejecutado con Docker (imagen `grafana/k6`) desde una computadora del equipo |
| Script | `k6/carga.js` |
| Ambiente bajo prueba | QA en Render: `https://hotel-booking-backend-qa-acs-2026.onrender.com` |
| Fecha de ejecución | 27 de octubre de 2026 |
| Endpoints críticos | `GET /api/room/getrooms`, `GET /api/booking/get-all-details` y `GET /api/roomcategory/getroomcategories` |
| Comportamiento de cada usuario virtual | Consulta los tres endpoints en cada iteración y espera entre 1 y 2 segundos antes de repetir |
| Rampa | De 0 a 50 usuarios virtuales en 2 minutos |
| Sostenimiento | 50 usuarios virtuales durante 6 minutos (el mínimo exigido es 5) |
| Bajada | De 50 a 0 usuarios virtuales en 1 minuto |
| Duración de la fase de carga | 9 minutos (540 segundos) |
| Calentamiento | Antes de la rampa, el script despierta el backend de Render con reintentos. Esas solicitudes no cuentan en las métricas ni en los umbrales |
| Verificación de cada respuesta | Código HTTP 200 y cuerpo con `"success":true` |

El ambiente de QA se eligió para no afectar a PROD durante la carga. Es un ambiente en cloud, con el mismo tipo de servicio gratuito de Render que PROD.

## 3. Requerimientos del E1 que se comparan

| Código | Criterio del E1 | Cómo se mide en la prueba |
|--------|-----------------|---------------------------|
| RNF-02 (Desempeño) | El 95 % de las solicitudes a los endpoints de consulta (por ejemplo `/api/room/getrooms` y `/api/booking/get-all-details`) debe responder en 2 segundos o menos con hasta 50 usuarios virtuales concurrentes | Percentil 95 del tiempo de respuesta menor o igual a 2000 ms en cada endpoint, con 50 usuarios virtuales |
| RNF-01 (Disponibilidad) | El sistema debe estar disponible al menos el 95 % del tiempo | Indicador durante la prueba: tasa de error menor o igual a 5 % |

## 4. Resultados

### 4.1 Por endpoint

| Endpoint | Solicitudes | Promedio (ms) | Percentil 95 (ms) | Máximo (ms) |
|----------|-------------|---------------|-------------------|-------------|
| `GET /api/room/getrooms` | 10,306 | 226.0 | 308.9 | 3,180.3 |
| `GET /api/booking/get-all-details` | 10,306 | 230.2 | 303.2 | 4,477.3 |
| `GET /api/roomcategory/getroomcategories` | 10,306 | 229.0 | 303.8 | 3,179.8 |

### 4.2 Total

| Métrica | Valor |
|---------|-------|
| Solicitudes totales | 30,918 |
| Iteraciones completas | 10,306 (0 interrumpidas) |
| Usuarios virtuales máximos | 50 |
| Throughput | 57.26 solicitudes por segundo (30,918 solicitudes en la fase de carga de 540 s) |
| Tiempo de respuesta promedio | 228.4 ms |
| Percentil 95 del tiempo de respuesta | 305.0 ms |
| Tasa de error | 0.00 % |

## 5. Comparación con los requerimientos del E1

| Requerimiento | Criterio | Resultado medido | Veredicto |
|---------------|----------|------------------|-----------|
| RNF-02 en `getrooms` | Percentil 95 menor o igual a 2000 ms | 308.9 ms | **Se cumple** |
| RNF-02 en `get-all-details` | Percentil 95 menor o igual a 2000 ms | 303.2 ms | **Se cumple** |
| RNF-02 en `getroomcategories` | Percentil 95 menor o igual a 2000 ms | 303.8 ms | **Se cumple** |
| RNF-01 (indicador) | Tasa de error menor o igual a 5 % | 0.00 % | **Se cumple** como indicador |

## 6. Conclusión

**RNF-02 (desempeño): se cumple.** Con 50 usuarios virtuales concurrentes, el percentil 95 del tiempo de respuesta de los tres endpoints de consulta estuvo entre 303.2 ms y 308.9 ms, unas 6.5 veces por debajo del límite de 2000 ms que fija el E1. El promedio de los tres endpoints fue de unos 230 ms y no hubo diferencias relevantes entre ellos.

**RNF-01 (disponibilidad): se cumple como indicador, pero no se puede concluir su cumplimiento completo.** Durante los 9 minutos de la fase de carga no hubo ninguna respuesta fallida: 0 errores en 30,918 solicitudes. Eso es consistente con el 95 % de disponibilidad que exige el E1, pero ese requerimiento se mide durante un período largo de monitoreo, y esta prueba cubre solo una ventana corta.

El sistema, en el ambiente de QA, soporta la carga definida por el E1 sin degradar sus tiempos de respuesta ni producir errores.

## 7. Limitaciones

- **Ambiente de QA, no de PROD.** La base de QA tiene pocos datos (3 categorías y 6 habitaciones, más los datos que generan las pruebas de API), por lo que `get-all-details` devolvió menos filas que las que devolvería PROD. Los tiempos en PROD con más datos podrían ser mayores.
- **Picos aislados.** El tiempo máximo llegó a 4,477.3 ms en `get-all-details` y a unos 3,180 ms en los otros dos endpoints, por encima de 2 segundos. El E1 exige el percentil 95 y no el máximo, por lo que no incumple el requerimiento. No se analizó la causa de estos picos.
- **Origen de la carga.** k6 se ejecutó desde una computadora del equipo, por lo que los tiempos incluyen la latencia de red hacia Render y el consumo de la máquina que genera la carga.
- **El throughput lo fija el modelo de carga.** Cada usuario virtual espera entre 1 y 2 segundos entre iteraciones, por lo que las 57.26 solicitudes por segundo son consecuencia de esa pausa y no la capacidad máxima del servidor. Esta prueba comprueba el cumplimiento a 50 usuarios, no busca el punto de saturación.
- **Solo consultas.** Los tres endpoints son de lectura, por lo que no se midió el desempeño de las operaciones que escriben datos.
- **Servicio gratuito de Render.** La instancia se duerme tras un tiempo sin tráfico. El calentamiento del script evita que ese arranque contamine las métricas, pero en uso real la primera solicitud tras la inactividad puede tardar más.

## 8. Evidencia

- Script: `k6/carga.js`.
- Resumen de resultados: `k6/resultados/resumen_carga.json`.
- Resultados completos de k6: `k6/resultados/resumen_carga_completo.json`.
- Captura de la salida de k6 al terminar la prueba, con el veredicto de cada requerimiento.
