# Pruebas de API

## 1. Alcance

Este documento describe las pruebas de API del backend de Hotel Booking: la colección de Postman, sus solicitudes y aserciones, el flujo de negocio encadenado, la ejecución automatizada con Newman dentro del pipeline de Jenkins y los hallazgos encontrados.

Estas son pruebas de API: envían solicitudes HTTP al backend desplegado y verifican sus respuestas. No son pruebas unitarias; las pruebas unitarias con Jest y Vitest están documentadas en `docs/PRUEBAS_UNITARIAS.md`.

## 2. Herramientas y archivos

| Elemento | Detalle |
|----------|---------|
| Herramienta de pruebas | Postman (colección versionada en el repositorio) |
| Ejecución automatizada | Newman 6.2.2, ejecutado desde el pipeline de Jenkins |
| Colección | `postman/hotel-booking.postman_collection.json` |
| Environment | `postman/hotel-booking.postman_environment.json` |
| API bajo prueba | `https://hotel-booking-backend-acs-2026.onrender.com` (prefijo `/api`) |

La URL base se define en la variable `base_url` del environment. Las demás variables las genera y las guarda la propia colección en cada ejecución.

## 3. Resumen

| Concepto | Valor |
|----------|-------|
| Solicitudes | 24 |
| Aserciones automáticas | 72 (3 por solicitud: código de respuesta, esquema y contenido) |
| Flujo completo encadenado | Solicitudes 1 a 17 |
| Casos negativos | Solicitudes 18 a 22 |
| Consultas independientes | Solicitudes 23 y 24 |

El total supera el mínimo de 15 solicitudes con aserciones automáticas.

## 4. Aserciones

Cada solicitud verifica tres aspectos:

- **Código de respuesta:** el código HTTP esperado (201, 200 o 400). Si falla, el mensaje de la aserción incluye el cuerpo de la respuesta del servidor para facilitar el diagnóstico.
- **Esquema:** la respuesta cumple un esquema JSON (`pm.response.to.have.jsonSchema`) con los campos obligatorios y sus tipos.
- **Contenido:** los valores de la respuesta son los esperados (por ejemplo, el mensaje, el estado de la reserva o el estado de la habitación).

## 5. Flujo de negocio encadenado

El flujo cubre el ciclo completo de una reserva de habitación (solicitudes 1 a 17). Cada solicitud usa datos que guardó una solicitud anterior:

1. Un usuario se registra e inicia sesión (1 y 2).
2. Se consulta una categoría de habitación, se crea una habitación nueva y se comprueba que queda disponible (3, 4 y 5).
3. Se crea un cliente y se consulta su identificador (6 y 7).
4. Se crea la reserva de esa habitación para ese cliente y se comprueba que queda en estado `pending` y que la habitación pasa a `occupied` (8 y 9).
5. Se edita la reserva (10).
6. Se registra el check-in y se comprueba que la reserva aparece con estado `checked_in` (11 y 12).
7. Se registra el check-out y se comprueba que la habitación vuelve a `available` (13 y 14).
8. Se elimina la habitación y el cliente creados, y se cierra la sesión (15, 16 y 17).

El flujo crea sus propios datos (usuario, habitación, cliente y reserva) y no depende de datos existentes en la base de datos, salvo de una categoría de habitación.

### 5.1 Variables encadenadas

| Variable | La guarda | La usan |
|----------|-----------|---------|
| `sufijo` | Script previo de la colección (valor único por ejecución) | 1, 2, 4, 6, 18, 24 |
| `fechaEntrada` y `fechaSalida` | Script previo de la colección (hoy + 2 días y hoy + 4 días, formato `AAAA-MM-DDTHH:mm`) | 8, 10, 19 |
| `fechaPasadaEntrada` y `fechaPasadaSalida` | Script previo de la colección (hoy - 5 días y hoy - 2 días) | 20 |
| `categoriaId` | Solicitud 3 | 4 |
| `habitacionId` | Solicitud 5 | 8, 10, 14, 15 |
| `clienteId` | Solicitud 7 | 8, 16 |
| `reservaId` | Solicitud 9 | 10, 11, 12, 13 |

## 6. Solicitudes

### 6.1 Flujo completo de una reserva

| # | Solicitud | Método y ruta | Código | Contenido verificado |
|---|-----------|---------------|--------|----------------------|
| 1 | Crear usuario | `POST /api/auth/signup` | 201 | `message` es "User created successfully" y el usuario tiene el nombre enviado |
| 2 | Iniciar sesión | `POST /api/auth/signin` | 200 | El usuario es el correcto, la respuesta no incluye `password` y existe la cookie `access_token` |
| 3 | Consultar categorías de habitación | `GET /api/roomcategory/getroomcategories` | 200 | Hay al menos una categoría; se guarda `categoriaId` |
| 4 | Crear habitación | `POST /api/room/create` | 201 | `message` es "Room created successfully" |
| 5 | Consultar habitaciones | `GET /api/room/getrooms` | 200 | La habitación creada tiene estado `available`; se guarda `habitacionId` |
| 6 | Crear cliente | `POST /api/customer/create` | 201 | `message` es "Customer created successfully" |
| 7 | Consultar clientes | `GET /api/customer/getcustomers` | 200 | El cliente creado aparece por su correo; se guarda `clienteId` |
| 8 | Crear reserva | `POST /api/booking/create` | 200 | `success` es true y `message` es "Booking created successfully" |
| 9 | Consultar reservas | `GET /api/booking/get-all-details` | 200 | La reserva tiene `booking_status` "pending" y `room_status` "occupied"; se guarda `reservaId` |
| 10 | Editar reserva | `PUT /api/booking/edit` | 200 | `message` es "Booking edited successfully" |
| 11 | Registrar check-in | `POST /api/booked/checkin` | 200 | `message` es "Check-in completed successfully" |
| 12 | Consultar reservas con check-in | `GET /api/booking/get-checked-in-details` | 200 | La reserva aparece con `booking_status` "checked_in" |
| 13 | Registrar check-out | `POST /api/booked/checkout` | 200 | `message` es "Check-out completed successfully" |
| 14 | Verificar habitación liberada | `GET /api/room/getrooms` | 200 | La habitación creada vuelve a `available` |
| 15 | Eliminar habitación | `DELETE /api/room/delete/:habitacionId` | 200 | `message` es "Room deleted successfully" |
| 16 | Eliminar cliente | `DELETE /api/customer/delete/:clienteId` | 200 | `message` es "Customer deleted successfully" |
| 17 | Cerrar sesión | `POST /api/auth/signout` | 200 | `message` es "User signed out successfully" |

### 6.2 Casos negativos

| # | Solicitud | Método y ruta | Código | Contenido verificado |
|---|-----------|---------------|--------|----------------------|
| 18 | Inicio de sesión con credenciales inválidas | `POST /api/auth/signin` | 400 | `success` es false y `message` es "Invalid credentials" |
| 19 | Crear reserva sin `room_id` | `POST /api/booking/create` | 400 | `message` es "Room ID is required" |
| 20 | Crear reserva con fecha de salida pasada | `POST /api/booking/create` | 400 | `message` es "Check-out date should be future date" |
| 21 | Crear cliente con campos incompletos | `POST /api/customer/create` | 400 | `message` es "Please fill in all fields" |
| 22 | Check-in sin `booking_id` | `POST /api/booked/checkin` | 400 | `message` es "Booking ID is required." |

### 6.3 Consultas independientes

| # | Solicitud | Método y ruta | Código | Contenido verificado |
|---|-----------|---------------|--------|----------------------|
| 23 | Consultar detalle de habitaciones | `GET /api/room/getroom-all-details` | 200 | `success` es true y la lista de habitaciones no está vacía |
| 24 | Consultar usuarios | `GET /api/user/getusers` | 200 | El usuario creado en la solicitud 1 está en la lista |

## 7. Ejecución dentro del pipeline

Las pruebas de API se ejecutan en el pipeline de Jenkins, en la etapa "Pruebas de API con Newman" del `Jenkinsfile`, después de las etapas de pruebas unitarias.

- **Job:** `hotel-booking-pipeline` (Multibranch Pipeline), rama `feature/newman-pipeline`.
- **Preparación:** la etapa crea la carpeta `newman` y hace una solicitud de calentamiento con `curl` a la URL base, con reintentos, porque el backend desplegado en Render puede tardar en despertar.
- **Comando:** `npx --yes newman@6.2.2 run postman/hotel-booking.postman_collection.json -e postman/hotel-booking.postman_environment.json --reporters cli,junit --reporter-junit-export newman/resultados.xml --timeout-request 120000`
- **Falla del build:** si alguna aserción falla, Newman termina con código de error, la etapa falla y el build termina en estado fallido.
- **Reportes:** el pipeline publica `newman/resultados.xml` como resultados de pruebas (JUnit) y archiva la carpeta `newman` como artefacto del build.

### 7.1 Evidencia de la ejecución

- **Build:** rama `feature/newman-pipeline`, revisión `9d60ddf30268010cdd8e7792b623d4c6b936f348`, 22 de octubre de 2026.
- **Solicitudes:** 24 ejecutadas, 0 fallidas.
- **Aserciones:** 72 ejecutadas, 0 fallidas.
- **Resultado final del build:** `Finished: SUCCESS`.
- **Artefactos archivados:** carpeta `newman`.

## 8. Hallazgos

Durante la construcción de la colección contra el backend desplegado se encontraron los siguientes puntos.

| # | Hallazgo | Detalle |
|---|----------|---------|
| H1 | `GET /api/booked/checked-details` responde 400 | El controlador consulta la vista `CheckedDetails`, que no está definida en los scripts SQL del repositorio (`New DB.sql` y `SalfordDB.sql`). |
| H2 | `GET /api/booked/checked-out-details` | Consulta la misma vista `CheckedDetails`, por lo que se espera el mismo error. No se ejecutó contra el ambiente desplegado. |
| H3 | `GET /api/details/details-overview` responde 500 | Falla en el ambiente desplegado; la respuesta solo indica "An error occurred while fetching overview details." y no permite determinar la causa. |
| H4 | `POST /api/booking/create` falla con fechas en formato ISO con sufijo `Z` | Con fechas como `2026-10-24T07:29:59.000Z` el backend respondió 500. Con el formato del formulario del frontend (`AAAA-MM-DDTHH:mm`) responde 200. |

Los endpoints de H1, H2 y H3 no forman parte de la colección: se sustituyeron por endpoints equivalentes que sí funcionan (solicitudes 12 y 23), para que la colección verifique el comportamiento correcto del sistema. Los pruebas unitarias de `booked.controller` no detectan H1 porque simulan la base de datos.

## 9. Limitaciones

- Las pruebas se ejecutan contra el backend desplegado, no contra una base de datos de pruebas aislada. El flujo elimina la habitación y el cliente que crea, pero el usuario y la reserva de prueba permanecen en la base de datos.
- Los endpoints de categorías de habitación con carga de imágenes, `google`, y las rutas de edición y cancelación de check-in no están cubiertos por la colección.
