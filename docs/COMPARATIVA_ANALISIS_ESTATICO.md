# Comparativa del análisis estático: antes y después

## 1. Alcance y fuente

Este documento registra el segundo análisis estático del proyecto con SonarQube Cloud y lo compara con el estado inicial, que está en `docs/ANALISIS_ESTATICO.md`.

| Elemento | Primer análisis (estado inicial) | Segundo análisis (después de la remediación) |
|----------|----------------------------------|-----------------------------------------------|
| Herramienta | SonarQube Cloud (plan gratuito) | SonarQube Cloud (plan gratuito) |
| Proyecto | `hotel-booking-acs-2026` (organización `dmoralesa14-ux`) | `hotel-booking-acs-2026` (organización `dmoralesa14-ux`) |
| Rama | `main` | `main` |
| Commit analizado | `494b9d34` | `c6d5fa70` |
| Fecha | 24 de septiembre de 2026 | 25 de octubre de 2026 |
| Líneas de código | 11 mil | 9.7 mil |

En el plan gratuito solo se analiza la rama principal. Por eso el código corregido se promovió por el flujo feature → `DEV` → `QA` → `main`, con Pull Request y revisión de otro integrante en cada paso, y el segundo análisis lo ejecutó el pipeline de Jenkins sobre `main`.

**Severidades.** SonarQube Cloud usa los niveles Blocker, High, Medium, Low e Info. El nivel High equivale al antiguo Critical, por lo que "Blocker y Critical" se entiende aquí como Blocker y High.

**Cambio de alcance.** El segundo análisis usa `sonar-project.properties`, que analiza solo `backend` y `frontend/src` y deja fuera los scripts SQL y el resto del repositorio. Por eso las líneas de código bajaron de 11 mil a 9.7 mil, y parte de la reducción de issues viene de ese cambio de alcance y no de correcciones.

## 2. Remediación aplicada

De los 24 issues de severidad High del estado inicial, 8 se corrigieron en el código y 16 quedaron fuera del alcance del análisis.

### 2.1 Issues corregidos en el código (8)

| # | Archivo | Línea | Hallazgo | Corrección |
|---|---------|-------|----------|------------|
| 1 | `backend/Dockerfile` | 12 | Copia recursiva al contenedor | `COPY . .` se reemplazó por copias explícitas de `app.js`, `server.js`, `init-db.sh` y de las carpetas `config`, `controllers`, `migrations`, `models`, `routes` y `utils` |
| 2 | `frontend/Dockerfile` | 8 | Copia recursiva al contenedor | `COPY . .` se reemplazó por copias explícitas de los archivos de configuración y de la carpeta `src` |
| 3 | `frontend/src/dashboard_pages/DashRoomCategorys.jsx` | 382 | Función con 1 argumento llamada con 2 | Se quitó el segundo argumento, que la función ignoraba |
| 4 | `backend/controllers/auth.controller.js` | 36 | Funciones anidadas a más de 5 niveles | `signUp` se reescribió con `async/await` y una función auxiliar `hashPassword` |
| 5 | `backend/controllers/auth.controller.js` | 43 | Funciones anidadas a más de 5 niveles | Se corrigió con la misma reescritura de `signUp` |
| 6 | `frontend/src/dashboard_pages/DashBooked.jsx` | 201 | Complejidad cognitiva 16 (máximo 15) | La cadena de condiciones del estado de la reserva pasó al componente `StatusBadge` |
| 7 | `frontend/src/dashboard_pages/DashCheckOut.jsx` | 39 | Complejidad cognitiva 19 (máximo 15) | Las dos cadenas de condiciones pasaron al componente `StatusBadge` |
| 8 | `frontend/src/dashboard_pages/DashOverView.jsx` | 323 | Complejidad cognitiva 16 (máximo 15) | La cadena de condiciones pasó al componente `StatusBadge` |

El componente nuevo `frontend/src/components/StatusBadge.jsx` conserva los mismos colores y textos que tenían las condiciones originales. Después de los cambios, las 49 pruebas del backend y las 18 del frontend siguen aprobadas y el frontend compila.

### 2.2 Issues fuera del alcance del análisis (16)

Los 16 issues restantes eran literales de texto repetidos en `New DB.sql` (8 issues) y `SalfordDB.sql` (8 issues). No se corrigieron en el código, por esta justificación técnica:

- Son scripts de base de datos de MySQL, con procedimientos almacenados. MySQL no permite definir constantes de texto compartidas entre procedimientos almacenados.
- Reescribir los scripts para reemplazar los literales implicaría modificar la base de datos con riesgo de cambiar su comportamiento, sin beneficio funcional.
- El análisis del pipeline se acotó a `backend` y `frontend/src` mediante `sonar-project.properties`, así que estos scripts dejaron de analizarse y sus issues ya no aparecen.

## 3. Comparativa antes y después

Rama `main`, Overall Code.

| Métrica | Antes | Después | Cambio |
|---------|-------|---------|--------|
| Líneas de código | 11 mil | 9.7 mil | −1.3 mil (cambio de alcance) |
| Issues abiertos en total | 565 | 521 | −44 |
| Seguridad | 13 issues, calificación D | 7 issues, calificación C | −6 issues |
| Fiabilidad | 59 issues, calificación D | 60 issues, calificación C | +1 issue |
| Mantenibilidad | 506 issues, calificación A | 467 issues, calificación A | −39 issues |
| Security hotspots | 0 | 0 | Sin cambio |
| Duplicación | 44.6 % | 34.9 % | −9.7 puntos porcentuales |
| Cobertura | Sin datos | 5.4 % (sobre 5.8 mil líneas por cubrir) | +5.4 puntos porcentuales |
| Deuda técnica (tiempo) | Sin dato | 2 d 5 h | |
| Ratio de deuda técnica | 0.5 % | 0.4 % (calificación A) | −0.1 puntos porcentuales |
| Issues Blocker abiertos | 0 | 0 | Sin cambio |
| Issues High abiertos | 24 | 0 | −24 |
| Issues nuevos en el código nuevo | 0 | 0 | Sin cambio |
| Duplicación en el código nuevo | 5.13 % (sobre 39 líneas) | 0.3 % (sobre 1.3 mil líneas) | −4.83 puntos porcentuales |

Issues cerrados en los últimos 30 días, según el panel del proyecto: 1 de seguridad, 1 de fiabilidad y 23 de mantenibilidad.

**Fiabilidad.** El conteo subió de 59 a 60 issues, aunque la calificación mejoró de D a C. En la pestaña Activity el perfil de calidad "Sonar way comprehensive" tiene cambios registrados el 21 y el 25 de octubre, por lo que parte de la variación puede deberse a reglas actualizadas. No se determinó la causa exacta del issue adicional.

## 4. Verificación de severidades Blocker y High

Con el filtro severidad Blocker y High, estados Open y Confirmed, en la rama `main`, SonarQube Cloud devuelve **0 issues** ("No results found"). Los hallazgos Blocker y High quedaron en cero: 8 corregidos en el código y 16 fuera del alcance del análisis, con la justificación de la sección 2.2.

## 5. Issues de severidad Medium restantes

Con los filtros de calidad Seguridad y Fiabilidad y severidad Blocker, High y Medium, quedan 58 issues, todos de severidad Medium, con un esfuerzo estimado de 6 h 11 min.

| Tipo de issue | Cantidad |
|---------------|----------|
| Promesas sin esperar ni manejar su error | 43 |
| Uso de `isNaN` en lugar de `Number.isNaN` | 8 |
| Elementos interactivos no nativos sin rol ni soporte de teclado | 4 |
| Dockerfile e `init-db.sh`: `npm install` sin `--ignore-scripts`, dependencias sin versiones bloqueadas y uso de `npx` | 3 |
| **Total** | **58** |

Quedan fuera del alcance mínimo del entregable (Blocker y High) y se registran como deuda técnica pendiente.

## 6. Estado del quality gate en el segundo análisis

El quality gate aplicado es "Sonar way", el predeterminado de SonarQube Cloud.

| Análisis | Resultado | Condición fallida |
|----------|-----------|-------------------|
| Primer análisis | Failed | Duplicación del código nuevo: 5.13 % (máximo 3.0 %) |
| Segundo análisis | Failed | Cobertura del código nuevo: 28.17 % sobre 62 líneas nuevas por cubrir (mínimo 80.0 %) |

La condición de duplicación quedó resuelta: el código nuevo tiene 0.3 % de duplicación, dentro del máximo de 3.0 %. La cobertura del código nuevo pasó a ser la única condición fallida.
