# Pipeline de integración y despliegue continuo

## 1. Alcance

Este documento describe el pipeline de Jenkins del proyecto Hotel Booking, definido en el `Jenkinsfile` de la raíz del repositorio. Ejecuta, en este orden: compilación, pruebas unitarias, análisis estático con verificación del quality gate, pruebas de API y despliegue al ambiente que corresponde a la rama.

## 2. Ambientes

Cada rama tiene su ambiente. El backend y el frontend de cada uno están en Render, y las bases de datos están en el mismo servicio de MySQL de Aiven.

| Rama | Ambiente | Backend (Render) | Frontend (Render) | Base de datos (Aiven) |
|------|----------|------------------|-------------------|-----------------------|
| `DEV` | DEV | `hotel-booking-backend-dev-acs-2026` | `hotel-booking-frontend-dev-acs-2026` | `hotel_dev` |
| `QA` | QA | `hotel-booking-backend-qa-acs-2026` | `hotel-booking-frontend-qa-acs-2026` | `hotel_qa` |
| `main` | PROD | `hotel-booking-backend-acs-2026` | `hotel-booking-frontend-acs-2026` | Base actual del servicio |
| `feature/*` | FEATURE (sin despliegue) | No se despliega | No se despliega | No aplica |

Las URLs de los servicios tienen la forma `https://<nombre-del-servicio>.onrender.com`.

### 2.1 Configuración de los ambientes DEV y QA

- Los backends son servicios web de Node de Render, con `backend/` como directorio raíz, `npm install` como comando de construcción y `npm start` como comando de inicio. Están conectados a su rama (`DEV` o `QA`).
- Las variables de entorno de cada backend son `NODE_ENV`, `DATABASE_URL` (apunta a su propia base), `JWT_SECRET_KEY` (una clave distinta por ambiente, generada por Render) y `FRONTEND_URL` (para CORS).
- Los frontends son sitios estáticos de Render, con `frontend` como directorio raíz, `npm install && npm run build` como comando de construcción y `dist` como directorio de publicación. Tienen tres reglas de reescritura: `/api/*` y `/uploads/*` hacia el backend de su ambiente, y `/*` hacia `/index.html`.
- Las bases `hotel_dev` y `hotel_qa` se crearon con el mismo esquema (tablas, vistas, procedimientos y funciones) y con datos iniciales: 3 categorías y 6 habitaciones por ambiente.
- El despliegue automático de Render está apagado en los seis servicios. Los servicios solo se despliegan desde el pipeline o con un despliegue manual.

## 3. Variables que calcula el pipeline según la rama

| Variable | `main` | `QA` | `DEV` | Otras ramas |
|----------|--------|------|-------|-------------|
| `AMBIENTE` | PROD | QA | DEV | FEATURE |
| `HOOK_SUFIJO` | `prod` | `qa` | `dev` | `dev` |
| `API_URL` | Backend de PROD | Backend de QA | Backend de DEV | Backend de DEV |
| `FRONTEND_URL` | Frontend de PROD | Frontend de QA | Frontend de DEV | Frontend de DEV |

Las pruebas de API de una rama de feature se ejecutan contra el ambiente de DEV.

## 4. Etapas del pipeline

| Orden | Etapa | Qué hace | Se ejecuta en |
|-------|-------|----------|---------------|
| 1 | Compilación | Backend: instala las dependencias y verifica la sintaxis de todos sus archivos `.js` con `node --check`. Frontend: instala las dependencias y ejecuta `npm run build`. | Todas las ramas |
| 2 | Pruebas unitarias del backend | Ejecuta Jest con cobertura (`npm test`). | Todas las ramas |
| 3 | Pruebas unitarias del frontend | Ejecuta Vitest con cobertura (`npm test`). | Todas las ramas |
| 4 | Análisis de SonarQube Cloud | Ajusta las rutas de los reportes de cobertura y ejecuta SonarScanner. | `main` |
| 5 | Quality gate de SonarQube Cloud | Consulta el resultado del quality gate y hace fallar el build si no es `OK`. | `main` |
| 6 | Pruebas de API con Newman | Ejecuta la colección de Postman contra la API del ambiente (`API_URL`). | Todas las ramas |
| 7 | Despliegue al ambiente | Lanza los Deploy Hooks de Render del backend y del frontend del ambiente. | `DEV`, `QA` y `main` |
| 8 | Verificación del ambiente | Consulta el backend y el frontend del ambiente hasta que responden con código 200. | `DEV`, `QA` y `main` |

Si una etapa falla, las siguientes no se ejecutan. Por eso un fallo en las pruebas, en el quality gate o en Newman impide el despliegue.

### 4.1 Compilación

El backend es Node.js y no se transpila, por lo que su compilación es la verificación de sintaxis de sus 46 archivos JavaScript. El frontend usa Vite y su compilación genera la carpeta `dist` que se publica en Render. La compilación instala las dependencias, y las etapas de pruebas unitarias reutilizan esa instalación.

### 4.2 Análisis estático y quality gate

El plan gratuito de SonarQube Cloud analiza solo la rama principal, por lo que las etapas 4 y 5 corren únicamente en `main`. El quality gate es "Sonar way" y su configuración, su historial y el detalle de la etapa de bloqueo están en `docs/QUALITY_GATE.md`.

### 4.3 Pruebas de API

La colección `postman/hotel-booking.postman_collection.json` tiene 24 solicitudes con 72 aserciones y se detalla en `docs/PRUEBAS_API.md`. El pipeline la ejecuta con Newman y pasa la URL del ambiente con `--env-var "base_url=$API_URL"`, por lo que la misma colección sirve para los tres ambientes. Antes de ejecutarla, el pipeline despierta el backend con una solicitud con reintentos, porque los servicios gratuitos de Render se duermen.

### 4.4 Despliegue

La etapa de despliegue usa Deploy Hooks de Render. Cada hook es un secreto guardado en Jenkins como credencial de tipo Secret text:

| Ambiente | Credencial del backend | Credencial del frontend |
|----------|------------------------|-------------------------|
| DEV | `render-hook-backend-dev` | `render-hook-frontend-dev` |
| QA | `render-hook-backend-qa` | `render-hook-frontend-qa` |
| PROD | `render-hook-backend-prod` | `render-hook-frontend-prod` |

El pipeline elige las credenciales con el valor de `HOOK_SUFIJO`, y Jenkins oculta el valor de los hooks en el registro del build.

### 4.5 Verificación del ambiente

Después de lanzar los hooks, el pipeline consulta cada 20 segundos, hasta 30 veces por dirección, estas dos direcciones del ambiente:

- `<API_URL>/api/roomcategory/getroomcategories`
- `<FRONTEND_URL>/`

Si alguna no responde con código 200 en ese tiempo, el build falla.

## 5. Flujo de promoción y despliegue

El código llega a cada ambiente por Pull Request con la revisión de otro integrante, según la política de `docs/POLITICA_PROMOCION_RAMAS.md`:

1. Una rama de feature se fusiona en `DEV`. Jenkins construye `DEV` y despliega en el ambiente DEV.
2. `DEV` se fusiona en `QA`. Jenkins construye `QA` y despliega en el ambiente QA.
3. `QA` se fusiona en `main`. Jenkins construye `main`, ejecuta también el análisis y el quality gate, y despliega en el ambiente PROD.

## 6. Limitaciones

- **Los hooks no informan cuándo termina el despliegue.** Un Deploy Hook de Render lanza el despliegue y responde enseguida. La verificación comprueba que el ambiente responde, pero no garantiza que ya tenga el código nuevo; durante un despliegue puede responder la versión anterior.
- **Las pruebas de API corren antes del despliegue.** Siguiendo el orden del entregable, Newman prueba la versión que ya está desplegada en el ambiente. La versión nueva se comprueba solo por disponibilidad en la etapa 8.
- **Análisis estático solo en `main`.** Es una limitación del plan gratuito de SonarQube Cloud. En `DEV` y `QA` esas etapas se omiten.
- **Los tres ambientes comparten el servicio de MySQL de Aiven.** Están separados por base de datos, pero no por servidor.
- **Los servicios gratuitos de Render se duermen** tras un periodo sin tráfico, por lo que la primera solicitud puede tardar y el pipeline incluye reintentos y esperas.
- **Newman crea datos de prueba** en la base de cada ambiente (un usuario y una reserva por ejecución) y elimina solo la habitación y el cliente que crea.

## 7. Evidencia de la ejecución en una rama de feature

Build #1 de `feature/despliegue-render` en Jenkins, con resultado final `SUCCESS` en 5 minutos 45 segundos.

| Etapa | Resultado | Duración |
|-------|-----------|----------|
| Compilación | Aprobada | 4 min 26 s |
| Pruebas unitarias del backend | Aprobada | 11 s |
| Pruebas unitarias del frontend | Aprobada | 22 s |
| Análisis de SonarQube Cloud | Omitida (solo `main`) | |
| Quality gate de SonarQube Cloud | Omitida (solo `main`) | |
| Pruebas de API con Newman | Aprobada | 16 s |
| Despliegue al ambiente | Omitida (solo `DEV`, `QA` y `main`) | |
| Verificación del ambiente | Omitida (solo `DEV`, `QA` y `main`) | |

Esto confirma el orden de las etapas y que las ramas de feature no despliegan. El despliegue y la verificación de cada ambiente quedan registrados en los builds de `DEV`, `QA` y `main`.
