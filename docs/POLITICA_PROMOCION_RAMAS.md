# Política de promoción entre ramas

## 1. Propósito

Este documento define los ambientes del proyecto, la correspondencia entre ramas y ambientes, y las reglas que se deben cumplir para promover cambios de una rama a otra.

## 2. Ambientes y ramas

|  Rama  |  Ambiente  | Propósito |
|--------|----------- |----------------------------------------------------------------------------|
| `DEV`  | Desarrollo | Integración de los cambios de desarrollo provenientes de ramas de feature. |
| `QA`   | Pruebas    | Verificación de calidad de los cambios ya integrados en DEV.               |
| `main` | Producción (PROD) | Versión estable y liberada del producto.                            |

## 3. Flujo de promoción

feature/* → `DEV` → `QA` → `main`

- Todo cambio se desarrolla en una rama de feature creada a partir de `DEV`.
- Ningún cambio se hace directamente en `DEV`, `QA` ni `main`.
- La promoción entre ramas se hace únicamente mediante Pull Request (PR).
- No se permite omitir ramas: un cambio llega a `QA` solo desde `DEV`, y a `main` solo desde `QA`.

## 4. Reglas de protección (aplican por igual a `DEV`, `QA` y `main`)

- Pull Request obligatorio para integrar cambios.
- Mínimo 1 aprobación antes de hacer merge.
- Las aprobaciones se descartan cuando se suben nuevos commits al PR.
- Force push deshabilitado.
- Eliminación de la rama deshabilitada.
- Las reglas aplican también a los administradores; nadie puede saltárselas.
- Los merges hacia `QA` y `main` se bloquean si el pipeline falla.

## 5. Condiciones para promover entre ramas

### 5.1 feature → `DEV`

- El PR tiene un título y una descripción que explican el cambio.
- Otro integrante del equipo (distinto del autor) revisa el PR y lo aprueba.
- Los comentarios de la revisión están resueltos.

### 5.2 `DEV` → `QA`

- Los cambios en `DEV` están listos para ser verificados.
- Otro integrante del equipo (distinto del autor) revisa el PR y lo aprueba.
- El pipeline se ejecuta y termina correctamente.
- Los comentarios de la revisión están resueltos.

### 5.3 `QA` → `main`

- Los cambios fueron verificados en `QA`.
- Otro integrante del equipo (distinto del autor) revisa el PR y lo aprueba.
- El pipeline se ejecuta y termina correctamente.
- Los comentarios de la revisión están resueltos.

## 6. Revisión de Pull Requests

- El revisor es un integrante del equipo distinto del autor del PR.
- La revisión debe evaluar el contenido del cambio y dejar comentarios sobre lo revisado; no basta con aprobar sin comentarios.
- El autor atiende los comentarios y, si sube nuevos commits, el PR requiere una nueva aprobación.

## 7. Bloqueo por fallo del pipeline

- Si el pipeline falla en un PR dirigido a `QA` o `main`, el merge queda bloqueado.
- El merge solo se habilita cuando el pipeline vuelve a ejecutarse y termina correctamente.
