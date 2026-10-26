# Quality gate de SonarQube Cloud

## 1. Configuración

| Elemento | Detalle |
|----------|---------|
| Herramienta | SonarQube Cloud (plan gratuito) |
| Proyecto | `hotel-booking-acs-2026` (organización `dmoralesa14-ux`) |
| Quality gate aplicado | Sonar way, el predeterminado de SonarQube Cloud |
| Rama evaluada | `main` (en el plan gratuito solo se analiza la rama principal) |
| Código evaluado | Código nuevo (New Code), desde el primer análisis del proyecto |

El quality gate se mantuvo en "Sonar way" sin modificarlo. Para aprobarlo no se bajaron sus umbrales: se agregaron pruebas hasta cumplirlos.

### 1.1 Condiciones del código nuevo

| Condición | Umbral |
|-----------|--------|
| Cobertura | Mayor o igual a 80.0 % |
| Líneas duplicadas | Menor o igual a 3.0 % |

El resumen del proyecto muestra "No conditions set" para los issues nuevos y los security hotspots, por lo que el gate no los evalúa. La severidad Blocker y High se controla aparte, con la remediación documentada en `docs/COMPARATIVA_ANALISIS_ESTATICO.md`.

## 2. Historial de resultados

| Análisis | Commit | Resultado | Condición fallida |
|----------|--------|-----------|-------------------|
| 1. Estado inicial | `494b9d34` | Failed | Duplicación del código nuevo: 5.13 % sobre 39 líneas nuevas (máximo 3.0 %) |
| 2. Después de la remediación | `c6d5fa70` | Failed | Cobertura del código nuevo: 28.17 % sobre 62 líneas por cubrir (mínimo 80.0 %) |
| 3. Después de las primeras pruebas de cobertura | `d598810a` | Failed | Cobertura del código nuevo: 62.67 % sobre 62 líneas por cubrir (mínimo 80.0 %) |
| 4. Después de las segundas pruebas de cobertura | `main` posterior a la corrección del Jenkinsfile | **Passed** | Ninguna. Cobertura del código nuevo: 83.12 % |

La duplicación del código nuevo pasó de 5.13 % a 0.3 % en el análisis 2 y a 0.28 % en el análisis 3, dentro del máximo de 3.0 %.

## 3. Cómo se aprobó

### 3.1 Primera tanda de pruebas (de 28.17 % a 62.67 %)

Se escribieron pruebas para el código nuevo de la remediación:

- `frontend/src/components/StatusBadge.test.jsx`: 9 pruebas del componente `StatusBadge`, que dejan el componente en 100 % de cobertura.
- `backend/tests/auth.signup.errors.test.js`: 3 pruebas de los errores de `signUp` (falla de la sal, falla del cifrado y falla de la base de datos).

### 3.2 Por qué todavía fallaba

El código nuevo para SonarQube Cloud incluye todas las líneas que cambiaron desde su primer análisis, no solo las de la remediación. Eso incluye cambios anteriores del equipo, como el botón de Google (`OAuth.jsx`) y la ruta de las imágenes de las categorías en las páginas públicas.

### 3.3 Segunda tanda de pruebas (de 62.67 % a 83.12 %)

- `frontend/src/components/OAuth.test.jsx`: 5 pruebas del botón de Google (oculto sin clave de Firebase, inicio de sesión correcto, rechazo del servidor y falla de la ventana de Google).
- `frontend/src/pages/PaginasPublicas.test.jsx`: 3 pruebas de `AboutUs`, `Booking` y `Home`, que consultan las categorías y comprueban la imagen servida desde `/uploads`.

### 3.4 Pruebas antes y después

| Capa | Antes | Después |
|------|-------|---------|
| Backend | 49 | 52 |
| Frontend | 18 | 35 |
| **Total** | **67** | **87** |

Se mantienen sin cobertura 5 líneas de JSX de páginas grandes del panel de administración (`DashBooked`, `DashCheckOut`, `DashOverView` y `DashRoomCategorys`), porque cubrirlas exigiría renderizar páginas de 300 a 900 líneas con red y Redux. Con las pruebas anteriores el gate se aprobó sin ellas.

## 4. Bloqueo por quality gate en el pipeline

El `Jenkinsfile` tiene una etapa "Quality gate de SonarQube Cloud", que corre solo en la rama `main`, justo después del análisis:

1. Lee la dirección de la tarea de análisis en `.scannerwork/report-task.txt`.
2. Consulta la tarea cada 10 segundos, hasta 30 veces, hasta que su estado es `SUCCESS`, y toma su `analysisId`. Si el estado es `FAILED` o `CANCELED`, el build falla.
3. Consulta el estado del quality gate de ese análisis (`api/qualitygates/project_status`).
4. Si el estado no es `OK`, termina con error y el build falla. La etapa de Newman, que viene después, no se ejecuta.

La consulta directa a la API se usa porque SonarQube Cloud no puede avisar a Jenkins por webhook, ya que Jenkins corre en `localhost`.

### 4.1 Incidente durante la verificación

En la primera ejecución de esta etapa el build falló aunque el análisis terminó bien. El host configurado en Jenkins termina en barra (`https://sonarcloud.io/`), y el script construyó la dirección con doble barra (`https://sonarcloud.io//api/...`), lo que devolvió una respuesta vacía. Se corrigió quitando la barra final del host, y el script ahora imprime la respuesta completa de SonarQube Cloud para diagnosticar cualquier fallo.

### 4.2 Evidencia de la aprobación

En el **Console Output** del build de `main` aparecen estas líneas:

- `Estado del análisis en SonarQube Cloud: SUCCESS`
- `Quality gate de SonarQube Cloud: OK`

Con el quality gate en `OK`, el build continúa a la etapa de Newman.

## 5. Hallazgos pendientes

El entregable no exige corregirlos. Se registran como deuda técnica:

- 58 issues de severidad Medium en seguridad y fiabilidad (6 h 11 min de esfuerzo estimado), detallados en `docs/COMPARATIVA_ANALISIS_ESTATICO.md`.
- 16 issues de severidad High en los scripts SQL, fuera del alcance del análisis, con la justificación técnica de esa misma comparativa.
