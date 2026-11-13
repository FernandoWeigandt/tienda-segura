# tienda-segura — Taller DevSecOps (pipeline seguro)

App Express mínima con un pipeline de GitHub Actions que corre cuatro puertas de
seguridad en cada pull request: **tests**, **npm audit (SCA)**, **Semgrep (SAST)**
y **Gitleaks (secretos)**.

Todo el proyecto ya está construido y verificado localmente. Lo único que queda
es lo que depende de tu cuenta de GitHub (crear el repo, `push`, abrir/mergear PRs).

## Estado del proyecto

| Rama | Contenido | Puerta que debe fallar | Verificado local |
|------|-----------|------------------------|------------------|
| `main` | app original + pipeline con las 4 puertas | — (todo verde) | `npm test` ✅ `npm audit` ✅ |
| `falla-secreto` | token `ghp_…` en `app.js` | Gitleaks | corre en Actions |
| `falla-codigo` | ruta `/calcular` con `eval()` | Semgrep | corre en Actions |
| `falla-libreria` | `lodash@4.17.15` | npm audit | ✅ 1 high local |
| `falla-test` | fórmula `1 + desc` | npm test | ✅ falla local (300 ≠ 100) |

## Paso 1 — Subir a GitHub

El repo local ya está inicializado con `main` y las cuatro ramas de falla.

1. Creá en github.com un repo **público** llamado `tienda-segura` (sin README, ya hay uno).
2. Conectá y subí `main`:

```bash
git remote add origin https://github.com/TU-USUARIO/tienda-segura.git
git push -u origin main
```

> Requiere que configures tus credenciales de GitHub (token/credential manager).
> Git no tiene una identidad propia configurada globalmente en esta máquina.

## Paso 2–3 — El pipeline

Está en `.github/workflows/pipeline.yml`. Corre en cada `pull_request`:

| Línea del pipeline | Qué comprueba | Concepto |
|---|---|---|
| `npm test` | que la lógica sigue funcionando | pruebas automáticas |
| `npm audit --audit-level=high` | vulnerabilidades conocidas en librerías | SCA |
| `semgrep scan --config auto --error` | patrones peligrosos en el código | SAST |
| `gitleaks/gitleaks-action@v2` | claves y contraseñas en código e historial | secretos |

El bloque `permissions` lo necesita Gitleaks para escribir su resultado en la PR.

## Paso 4 — Las cuatro fallas

Cada falla está en su rama. Para cada una: subí la rama y abrí una pull request.

```bash
git push -u origin falla-secreto
git push -u origin falla-codigo
git push -u origin falla-libreria
git push -u origin falla-test
```

En uno o dos minutos cada PR muestra la puerta correspondiente en rojo. Entrá a la
comprobación fallida y pulsá **Details** para ver el detalle.

## Paso 5 — Corregir y cerrar

### Falla 1 — el secreto (distinta: NO se arregla en la misma PR)
Borrar la línea no alcanza: Gitleaks revisa el historial de commits y el token sigue
ahí. **Cerrá la PR sin fusionar y borrá la rama** — como nunca llegó a `main`, el
secreto no se publicó. En un caso real, además, hay que **revocar la clave** y crear otra.

```bash
git push origin --delete falla-secreto   # tras cerrar la PR en GitHub
```

### Falla 2 — código inseguro
Reemplazá la ruta con `eval` por una que no ejecute texto del usuario, hacé commit y push:

```js
app.get("/calcular", (req, res) => {
  const resultado = Number(req.query.a) + Number(req.query.b);
  res.json({ resultado });
});
```

### Falla 3 — librería vieja
Quitá la dependencia que no usás y subí los dos archivos que cambian:

```bash
npm uninstall lodash
git add package.json package-lock.json && git commit -m "Quitar lodash" && git push
```

### Falla 4 — test roto
Volvé a poner el signo correcto en la fórmula (`1 - desc`), commit y push.

En las ramas 2, 3 y 4, cuando la PR quede en verde, **fusionala**.

## Retos extra

### Reto 1 — exigir el pipeline para fusionar
GitHub → **Settings → Branches (o Rules)** → regla para `main` → activá
**Require status checks to pass before merging** y elegí `verificar`. En cuentas
gratuitas puede no estar disponible en repos privados (por eso el repo es público).

### Reto 2 — Trivy (contenedor + configuración)
Ya está el `Dockerfile` (con `USER node` para no correr como root). Agregá al final
del job `verificar` en `pipeline.yml`:

```yaml
      - run: docker run --rm -v "$PWD":/src aquasec/trivy:latest config --exit-code 1 --severity HIGH,CRITICAL /src
```

En un proyecto real conviene fijar una versión de Trivy en lugar de `latest`.

### Reto 3 — ZAP (DAST, el más avanzado)
1. Agregá `app.listen(3000);` al final de `app.js`.
2. En el pipeline, iniciá la app en segundo plano: `- run: node app.js &`.
3. Corré el baseline scan de OWASP ZAP contra `http://localhost:3000` siguiendo la
   doc oficial de ZAP para GitHub Actions.

## Problemas frecuentes
- **Pipeline no corre**: el `.yml` debe estar en `.github/workflows/` y solo corre en PRs.
- **`npm ci` falla**: falta `package-lock.json` en el repo (acá ya está commiteado).
- **Error de YAML**: usá solo espacios, nunca tabulaciones.
- **Gitleaks pide licencia**: pasa si el repo es de una organización; usá repo personal.
- **Semgrep no detecta `eval`**: probá `--config p/javascript` en vez de `--config auto`.

