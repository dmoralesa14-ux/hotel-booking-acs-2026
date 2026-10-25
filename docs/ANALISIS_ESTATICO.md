# Análisis estático de código

## 1. Alcance y fuente

Este documento registra el análisis estático del código del proyecto con SonarQube Cloud: el estado inicial, la remediación de los hallazgos de mayor severidad, la comparativa antes y después y el quality gate.

| Elemento | Detalle |
|----------|---------|
| Herramienta | SonarQube Cloud |
| Proyecto analizado | `hotel-booking-acs-2026` (organización `dmoralesa14-ux`) |
| Rama | `main` |
| Análisis del estado inicial | Commit `494b9d34` |
| Tamaño | Aproximadamente 11 mil líneas de código |
| Integración | Pipeline de Jenkins con la etapa "Análisis de SonarQube Cloud" |

## 2. Estado inicial

Valores del resumen del proyecto (Overall Code) en la rama `main`.

| Métrica | Valor inicial |
|---------|---------------|
| Quality gate | Failed (1 condición fallida) |
| Bugs (Reliability) | 59 issues abiertos, calificación D |
| Vulnerabilidades (Security) | 13 issues abiertos, calificación D |
| Code smells (Maintainability) | 506 issues abiertos, calificación A |
| Security hotspots | 0 |
| Duplicación | 44.6 % |
| Cobertura | Sin datos (el análisis de cobertura no estaba configurado) |
| Issues abiertos en total | 565 |
| Issues aceptados | 0 |

El total de 565 issues es menor que la suma de las tres categorías (59 + 13 + 506 = 578) porque SonarQube Cloud cuenta un mismo issue en más de una categoría cuando afecta a más de una cualidad del software.

### 2.1 Quality gate en el código nuevo

El quality gate falla por una sola condición, en el código nuevo (New Code):

| Condición | Valor | Requerido |
|-----------|-------|-----------|
| Líneas duplicadas (%) | 5.1 % (5.13 % sobre 39 líneas nuevas) | ≤ 3.0 % |

En el código nuevo hay 0 issues nuevos.

### 2.2 Seguridad por severidad

Los 13 issues de seguridad se distribuyen así: severidad High 15 %, Medium 38 % y Low 46 %. El gráfico no muestra el nivel Blocker.

### 2.3 Deuda técnica

Esfuerzo estimado para corregir los 24 issues de severidad High: 2 h 55 min.

## 3. Issues de severidad alta (Blocker y High)

SonarQube Cloud usa los niveles Blocker, High, Medium, Low e Info. El nivel High equivale al antiguo Critical. El filtro aplicado fue severidad High con estados Open y Confirmed: **24 issues** (2 h 55 min de esfuerzo).

### 3.1 Resumen por tipo

| Tipo de issue | Categoría | Cantidad | Esfuerzo |
|---------------|-----------|----------|----------|
| Copia recursiva que podría agregar datos sensibles al contenedor (Dockerfile) | Seguridad | 2 | 40 min |
| Función llamada con más argumentos de los que espera | Fiabilidad | 1 | 10 min |
| Literal duplicado que debería ser una constante | Mantenibilidad | 16 | 1 h 4 min |
| Funciones anidadas a más de 5 niveles | Mantenibilidad | 2 | 40 min |
| Complejidad cognitiva superior a 15 | Mantenibilidad | 3 | 21 min |
| **Total** | | **24** | **2 h 55 min** |

### 3.2 Detalle de los 24 issues

| # | Archivo | Línea | Categoría | Mensaje | Esfuerzo |
|---|---------|-------|-----------|---------|----------|
| 1 | `backend/Dockerfile` | 12 | Seguridad | Copying recursively might inadvertently add sensitive data to the container. Make sure it is safe here. | 20 min |
| 2 | `frontend/Dockerfile` | 8 | Seguridad | Copying recursively might inadvertently add sensitive data to the container. Make sure it is safe here. | 20 min |
| 3 | `frontend/src/dashboard_pages/DashRoomCategorys.jsx` | 382 | Fiabilidad | This function expects 1 argument, but 2 were provided. | 10 min |
| 4 | `New DB.sql` | 50 | Mantenibilidad | Define a constant instead of duplicating this literal 5 times. | 4 min |
| 5 | `New DB.sql` | 264 | Mantenibilidad | Define a constant instead of duplicating this literal 25 times. | 4 min |
| 6 | `New DB.sql` | 486 | Mantenibilidad | Define a constant instead of duplicating this literal 7 times. | 4 min |
| 7 | `New DB.sql` | 486 | Mantenibilidad | Define a constant instead of duplicating this literal 5 times. | 4 min |
| 8 | `New DB.sql` | 526 | Mantenibilidad | Define a constant instead of duplicating this literal 7 times. | 4 min |
| 9 | `New DB.sql` | 582 | Mantenibilidad | Define a constant instead of duplicating this literal 4 times. | 4 min |
| 10 | `New DB.sql` | 606 | Mantenibilidad | Define a constant instead of duplicating this literal 4 times. | 4 min |
| 11 | `New DB.sql` | 802 | Mantenibilidad | Define a constant instead of duplicating this literal 4 times. | 4 min |
| 12 | `SalfordDB.sql` | 49 | Mantenibilidad | Define a constant instead of duplicating this literal 5 times. | 4 min |
| 13 | `SalfordDB.sql` | 263 | Mantenibilidad | Define a constant instead of duplicating this literal 25 times. | 4 min |
| 14 | `SalfordDB.sql` | 485 | Mantenibilidad | Define a constant instead of duplicating this literal 7 times. | 4 min |
| 15 | `SalfordDB.sql` | 485 | Mantenibilidad | Define a constant instead of duplicating this literal 5 times. | 4 min |
| 16 | `SalfordDB.sql` | 525 | Mantenibilidad | Define a constant instead of duplicating this literal 7 times. | 4 min |
| 17 | `SalfordDB.sql` | 581 | Mantenibilidad | Define a constant instead of duplicating this literal 4 times. | 4 min |
| 18 | `SalfordDB.sql` | 605 | Mantenibilidad | Define a constant instead of duplicating this literal 4 times. | 4 min |
| 19 | `SalfordDB.sql` | 801 | Mantenibilidad | Define a constant instead of duplicating this literal 4 times. | 4 min |
| 20 | `backend/controllers/auth.controller.js` | 36 | Mantenibilidad | Refactor this code to not nest functions more than 5 levels deep. | 20 min |
| 21 | `backend/controllers/auth.controller.js` | 43 | Mantenibilidad | Refactor this code to not nest functions more than 5 levels deep. | 20 min |
| 22 | `frontend/src/dashboard_pages/DashBooked.jsx` | 201 | Mantenibilidad | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. | 6 min |
| 23 | `frontend/src/dashboard_pages/DashCheckOut.jsx` | 39 | Mantenibilidad | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. | 9 min |
| 24 | `frontend/src/dashboard_pages/DashOverView.jsx` | 323 | Mantenibilidad | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. | 6 min |

### 3.3 Dónde se concentran

- Los scripts SQL (`New DB.sql` y `SalfordDB.sql`) concentran 16 de los 24 issues, todos por literales duplicados.
- Los dos `Dockerfile` concentran los issues de seguridad de severidad High.
- El código de aplicación tiene 6 issues: 1 de fiabilidad en el frontend, 2 de anidamiento en el controlador de autenticación y 3 de complejidad cognitiva en el frontend.
