# Pruebas unitarias

## 1. Alcance

Este documento describe las pruebas unitarias del proyecto: el framework usado, su distribución entre backend y frontend, el uso de dobles de prueba, el incremento de cobertura sobre los módulos críticos y la ejecución dentro del pipeline de Jenkins.

Todas las pruebas de este documento son pruebas unitarias: verifican una unidad de código de forma aislada mediante un framework de pruebas. No incluye pruebas de API ni de servicios, que corresponden a otro nivel de prueba y a otro entregable.

## 2. Frameworks

| Capa | Framework | Comando |
|------|-----------|---------|
| Backend (Node.js y Express) | Jest 29 | `npm test` (`jest --coverage`) |
| Frontend (React y Vite) | Vitest 2.1.9 con React Testing Library y jsdom | `npm test` (`vitest run --coverage`) |

## 3. Resumen

| Capa | Archivos de prueba | Pruebas |
|------|--------------------|---------|
| Backend | 5 | 49 |
| Frontend | 4 | 18 |
| **Total** | **9** | **67** |

El total supera el mínimo de 30 pruebas unitarias distribuidas entre backend y frontend.

## 4. Distribución de las pruebas

### 4.1 Backend (49 pruebas)

| Archivo de prueba | Módulo crítico (E2) | Pruebas |
|-------------------|---------------------|---------|
| `backend/tests/booking.controller.test.js` | Reservas | 16 |
| `backend/tests/booked.controller.test.js` | Check-in / Check-out | 12 |
| `backend/tests/auth.controller.test.js` | Autenticación y sesión | 10 |
| `backend/tests/room.controller.test.js` | Disponibilidad de habitaciones | 8 |
| `backend/tests/verifyUser.test.js` | Autenticación y sesión (middleware) | 3 |

### 4.2 Frontend (18 pruebas)

| Archivo de prueba | Unidad probada | Pruebas |
|-------------------|----------------|---------|
| `frontend/src/redux/user/userSlice.test.js` | Estado de sesión de usuario | 11 |
| `frontend/src/redux/theme/themeSlice.test.js` | Estado del tema | 3 |
| `frontend/src/components/PrivateRoute.test.jsx` | Protección de rutas del panel | 2 |
| `frontend/src/components/ThemeProvider.test.jsx` | Proveedor del tema | 2 |

## 5. Dobles de prueba

Los controladores y el middleware del backend dependen de la base de datos, de librerías de cifrado y de tokens. En las pruebas esas dependencias se reemplazan con dobles creados con `jest.fn()` para verificar solo la lógica de cada unidad.

| Archivo | Dependencia aislada | Tipo de doble | Pruebas que lo usan |
|---------|---------------------|---------------|---------------------|
| `booking.controller.test.js` | `models.sequelize.query` (acceso a MySQL) | Stub y mock | "crea la reserva y responde 200 con datos válidos"; "responde 500 cuando falla la base de datos"; "cancela la reserva y responde 200" |
| `auth.controller.test.js` | `models.User`, `bcrypt` y `jsonwebtoken` | Stub y mock | "con credenciales válidas emite el token en una cookie httpOnly y no devuelve la contraseña"; "crea el usuario con la contraseña cifrada y responde 201"; "responde 400 cuando la contraseña es incorrecta y no emite token" |
| `verifyUser.test.js` | `jsonwebtoken.verify` | Stub y mock | "responde 401 cuando el token no es válido"; "con un token válido guarda el usuario en la petición y llama a next" |

Los mismos dobles se usan en el resto de las pruebas de los módulos `booked.controller` y `room.controller`, que reemplazan `models.sequelize.query`.

### 5.1 Justificación del aislamiento

- **Base de datos (`models.sequelize.query` y `models.User`):** la prueba unitaria verifica la lógica del controlador (validaciones y respuestas HTTP). Con la base real también se estaría probando MySQL y los procedimientos almacenados, lo que corresponde a otro nivel de prueba. Con el doble las pruebas son rápidas y deterministas, no dependen de red, credenciales ni datos existentes, y permiten forzar errores de base de datos con `mockRejectedValue`.
- **`bcrypt`:** genera una sal aleatoria, por lo que el hash cambia en cada ejecución y no se puede comparar con un valor fijo. Además, es costoso en tiempo.
- **`jsonwebtoken`:** el token incluye la fecha de emisión, por lo que varía en cada ejecución. Con el doble se verifica con qué datos y con qué clave se firma o se verifica el token, y se simulan tokens válidos o inválidos sin depender de su expiración.

### 5.2 Tipo de doble

- **Stub:** `mockResolvedValue`, `mockRejectedValue` y `mockImplementation` definen lo que devuelve cada dependencia.
- **Mock:** `toHaveBeenCalledWith` verifica cómo la unidad invocó a su dependencia (el procedimiento llamado, los parámetros y el estado enviado).

Las pruebas del frontend no usan dobles: trabajan con un store de Redux real y un enrutador en memoria, sin dependencias externas que aislar.

## 6. Incremento de cobertura sobre los módulos críticos

**Línea base (sección 2.4):** el proyecto de origen no trae pruebas automatizadas: 0 pruebas, sin cobertura reportada y sin comando de ejecución. La cobertura de línea base de cada módulo crítico es 0 %.

**Criterio:** incremento mínimo de 20 puntos porcentuales sobre los módulos críticos identificados en el E2. Se usa el porcentaje de líneas (% Lines) de Jest.

| Módulo crítico (E2) | Archivo | Línea base | Cobertura final | Incremento (p. p.) |
|---------------------|---------|------------|-----------------|--------------------|
| Reservas | `booking.controller.js` | 0 % | 69.35 % | +69.35 |
| Check-in / Check-out | `booked.controller.js` | 0 % | 93.75 % | +93.75 |
| Autenticación y sesión | `auth.controller.js` | 0 % | 78.18 % | +78.18 |
| Autenticación y sesión | `verifyUser.js` | 0 % | 100 % | +100 |
| Disponibilidad de habitaciones | `room.controller.js` | 0 % | 90.9 % | +90.9 |
| Conjunto de módulos críticos | All files | 0 % | 80.97 % | +80.97 |

El menor incremento es +69.35 puntos porcentuales (Reservas), por lo que todos los módulos críticos superan el mínimo exigido de 20 puntos porcentuales.

Los archivos medidos son los definidos en `collectCoverageFrom` del `package.json` del backend. Los módulos críticos del E2 pertenecen al backend; el frontend no forma parte de esta medición.

## 7. Ejecución dentro del pipeline

Las pruebas se ejecutan en el pipeline de Jenkins, definido en el `Jenkinsfile` de la raíz del repositorio.

- **Job:** `hotel-booking-pipeline` (Multibranch Pipeline), con la rama `feature/pipeline-jenkins`.
- **Etapas:** "Pruebas unitarias del backend" y "Pruebas unitarias del frontend". Cada una instala las dependencias y ejecuta `npm test`.
- **Falla del build:** si alguna prueba falla, el comando devuelve error y el pipeline termina en estado fallido.
- **Reportes de cobertura:** al finalizar, el pipeline archiva las carpetas `backend/coverage` y `frontend/coverage` como artefactos del build.

### 7.1 Evidencia de la ejecución

- **Build:** #1 de `feature/pipeline-jenkins`, revisión `3f07159fa2b09efb523abeb7e3d7649e0b1ff7b4`, ejecutado el 21 de octubre de 2026.
- **Backend:** 5 suites aprobadas de 5 y 49 pruebas aprobadas de 49.
- **Frontend:** 4 archivos de prueba aprobados de 4 y 18 pruebas aprobadas de 18.
- **Resultado final del build:** `Finished: SUCCESS`.
- **Artefactos archivados:** `backend/coverage` y `frontend/coverage`.
