# T-32: publicación automática pendiente de autorización

Implementado: `.github/workflows/actualizar-datos.yml`, ejecución manual,
`contents: read`, sin credenciales persistidas, generación/validación y
artefacto `datos-reales-validados` para publicación mediante PR.

Propuesta concreta para completar el bot del PLAN_MAESTRO §6.5:

- Ejecutar de lunes a viernes a las 22:15 UTC en modo diario y domingos a
  las 06:00 UTC en modo cortes.
- Solo sobre `refs/heads/main`, permiso `contents: write` y checkout con
  credenciales para ese job.
- Tras validar los 13 JSON y los cortes, añadir exclusivamente `data_real/**`,
  crear commit de datos con identidad `github-actions[bot]` y ejecutar
  `git push origin HEAD:main` sin force. Un fallo de validación o conflicto
  detiene la publicación.

La revisión automática rechazó activar esta escritura programada en main
porque excede la autorización clara de implementar/probar el pipeline.
Requiere autorización explícita para esos efectos persistentes. Esta
propuesta es documentación; no activa cron ni escritura remota.
