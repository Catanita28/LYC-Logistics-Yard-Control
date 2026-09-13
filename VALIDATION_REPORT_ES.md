# LYC 2.248 — Validación

- Smoke test estático: **91/91 PASSED**.
- Los 3 bloques JavaScript embebidos de `public/index.html` pasan `node --check`.
- `server.js` pasa `node --check`.
- `migrate.js` pasa `node --check`.
- `scripts/smoke-test.js` pasa `node --check`.
- `scripts/production-preflight.js` pasa `node --check`.
- Production preflight probado con una configuración de prueba válida de 8 guardias: **PASS**.
- Se corrigió el contrato de respuesta del upload de evidencias para que coincida con el cliente.
- Se corrigió la sincronización para que la validación exclusiva de movimiento no bloquee registros de llaves, sellos, personal, mantenimiento, turnos, etc.
- Se corrigió la compatibilidad de S3 AWS con direccionamiento virtual para el endpoint AWS predeterminado.
- Se corrigieron los IDs iniciales de los 8 guardias para que sean numéricos y compatibles con autenticación de servidor.
- Se corrigió la persistencia central `put()` para construir el registro antes de calcular sus metadatos de auditoría.
- Frontend público aislado en `public/`.
- Iconos PWA presentes en `public/icons/`.

## Limitación de esta validación
Este entorno de construcción no tiene Docker ni una instancia PostgreSQL/S3 de producción, por lo que no se afirma que un despliegue externo haya sido ejecutado aquí. El paquete final está preparado para ese despliegue y falla de forma segura si faltan sus secretos/configuración.
