# LYC — GitHub + Render

LYC está preparado (v2.248) para un despliegue real usando un repositorio GitHub y un Web Service Docker de Render.

## Arquitectura de despliegue

- **GitHub:** código fuente y control de versiones.
- **Render Web Service:** ejecuta el backend Node.js y sirve el frontend PWA desde `public/`.
- **Render Postgres:** base de datos persistente.
- **S3 compatible:** almacenamiento permanente de fotografías y firmas de evidencia.
- **Mismo origen:** la aplicación usa el mismo dominio para la PWA y `/v1/*`, por lo que no necesita Caddy ni una URL de API separada en Render.

## Render Blueprint

`render.yaml` crea:

1. `lyc-logistics-yard-control` — Web Service Docker.
2. `lyc-postgres` — PostgreSQL 17.

El servicio ejecuta la migración antes de iniciar el servidor. La conexión PostgreSQL de Render usa la URL interna del mismo region y no fuerza TLS; el cliente acepta TLS explícitamente solo cuando `PGSSL=require` está configurado:

`node migrate.js && node server.js`

Esto evita depender de un servicio de migración separado en Render.

## Secretos que Render debe pedir

No se guardan en GitHub. El Blueprint usa `sync: false` para:

- `LYC_GUARD_CREDENTIALS_JSON` — exactamente 8 guardias, con IDs y PIN reales.
- `LYC_S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `LYC_S3_ENDPOINT` — opcional para S3 compatible; si se deja vacío, LYC usa Amazon S3.

Nunca colocar estos valores en `render.yaml`, GitHub ni archivos `.env` versionados.

## Importante para la primera prueba

El plan Free sirve para probar el despliegue, pero Render indica que los servicios Free se duermen después de 15 minutos sin tráfico y que Free Postgres expira después de 30 días. No usar esa configuración como producción permanente.

## Health check

Render usa:

`GET /v1/health`

Debe responder HTTP 200 únicamente cuando PostgreSQL esté disponible y el almacenamiento de objetos esté configurado.

## Flujo recomendado

1. Crear repositorio privado en GitHub.
2. Subir este proyecto al repositorio.
3. En Render: **New → Blueprint** y seleccionar el repositorio.
4. Render leerá `render.yaml`.
5. Introducir los seis secretos solicitados.
6. Aplicar el Blueprint.
7. Revisar los logs del primer deploy.
8. Abrir la URL `.onrender.com`.
9. Probar login de guardia, Entrada, Salida, cámara, firma, QR, sincronización y evidencia.

No marcar LYC como producción definitiva hasta completar esas pruebas en el entorno real.
