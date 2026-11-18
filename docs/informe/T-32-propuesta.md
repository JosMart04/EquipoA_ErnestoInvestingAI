# T-32: publicación automática autorizada

Josué autorizó el 17-nov-2026: **«Sí, autorizar el bot programado»**, ante la
pregunta que explicitó los horarios, validación y escritura exclusiva de
`data_real/**` sobre `main`. La revisión automática había rechazado esa
escritura persistente por falta de autorización suficientemente explícita;
la respuesta posterior resuelve el bloqueo.

El workflow `.github/workflows/actualizar-datos.yml` del PR #22 configura:

- Lunes a viernes, 22:15 UTC: modo `diario`.
- Domingo, 06:00 UTC: modo `cortes`.
- Ejecución manual: `diario`, `cortes` o `completo`.
- Job exclusivamente en `refs/heads/main`, permisos de escritura de contenido
  y Pages limitados a ese job. Checkout con credenciales para el push del bot.
- Generación en staging, validación de 01–13 y de todos los snapshots, artefacto
  conservado siete días y `git add -A -- data_real`.
- Comprobación adicional de que todos los archivos staged pertenecen a
  `data_real/`; commit con identidad de GitHub Actions y push **sin force**.
  Si main avanzó durante el cálculo, falla y conserva el artefacto.
- Tras un push correcto, solicitud de reconstrucción del Pages existente.
  No cambia la fuente ni la configuración del sitio.

La consulta al repositorio confirmó Pages desde `main`, raíz `/`, tipo
`legacy`. Un commit con `GITHUB_TOKEN` [no inicia Pages por sí solo](https://docs.github.com/en/actions/concepts/security/github_token);
por eso se usa el [endpoint oficial de reconstrucción](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build),
que requiere `pages: write`.

Validación estática: actionlint 1.7.12, binario oficial con SHA-256 verificado.
La configuración entrará en vigor después del merge del PR con CI verde.
No se ha ejecutado un cron ni publicado cambios en main desde esta rama.
