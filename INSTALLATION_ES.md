# Logistics Yard Control (LYC) — Instalación final

## Qué contiene
LYC es una aplicación PWA para control de seguridad del patio, con operación local/offline y sincronización con servidor cuando vuelve la conexión.

Incluye:
- ENTRADA y SALIDA como reportes independientes.
- Fotos de inspección tomadas en tiempo real con cámara.
- Firma del conductor.
- Control de sellos.
- Control de llaves Pick/Drop y custodio.
- Entrega de turno y checklist de equipo.
- Entrada/salida de personal con evidencia fotográfica.
- QR para Truck, Trailer, personal y Load.
- Mantenimiento y violaciones con importes fijos.
- Cola offline y sincronización bidireccional.
- PostgreSQL, autenticación de guardias, auditoría y almacenamiento de evidencias S3.

## Requisitos del servidor
- Docker y Docker Compose.
- Un dominio que apunte al servidor.
- Un bucket S3 compatible con HTTPS.
- Credenciales AWS/S3 con permiso para las evidencias de LYC.

## Configuración privada
1. Copiar `.env.example` a `.env`.
2. Cambiar **todos** los valores de ejemplo.
3. Configurar exactamente los 8 guardias reales en `LYC_GUARD_CREDENTIALS_JSON`.
4. Usar PIN de 4 a 8 dígitos para cada guardia.
5. No publicar ni compartir el archivo `.env`.

## CORS del bucket de evidencias
El archivo `s3-cors.json` contiene la plantilla. Cambiar `https://YOUR-LYC-DOMAIN` por el dominio real de LYC y aplicar esa regla al bucket.

## Arranque
Desde la carpeta final:

```bash
node scripts/production-preflight.js
docker compose build
docker compose up -d
```

Después de levantar los servicios, Caddy obtiene/renueva HTTPS automáticamente para el dominio configurado.

## Importante
No se incluyen contraseñas, PIN reales, claves AWS ni dominios reales. Esos datos deben introducirse durante la instalación en el entorno privado de producción.
