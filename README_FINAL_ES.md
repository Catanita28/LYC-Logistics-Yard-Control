# LYC — Logistics Yard Control
## Versión final de instalación: 2.248

LYC es una aplicación PWA de control de seguridad para patio logístico. Está diseñada para trabajar en línea y continuar operando sin Internet, guardando localmente y sincronizando cuando la conexión regresa.

### Incluye
- ENTRADA y SALIDA como reportes independientes.
- 9–10 fotos de inspección tomadas con cámara en tiempo real.
- Firma del conductor.
- Truck, Trailer, conductor, carga, origen, destino, millas y sello.
- Control independiente de sellos.
- Control de llaves Pick/Drop, número de llave, solicitante, posición, custodio y receptor.
- Relevo de seguridad y checklist de equipo.
- Entrada/salida de personal con evidencia fotográfica del vehículo y documento.
- QR para Truck, Trailer, personal y Load.
- Mantenimiento con estados Reported / In review / Repaired.
- Violación de cabina no limpia: $250 fijo.
- Llave no devuelta/perdida: $350 fijo.
- Los importes de las violaciones no los puede modificar el guardia.
- 8 guardias con PIN personal y atribución de operaciones.
- Cola offline, recuperación y sincronización bidireccional.
- PostgreSQL para datos del servidor.
- Autenticación de guardias con sesiones de servidor.
- Auditoría y almacenamiento de evidencias en S3.
- PWA instalable en iPad/iPhone y otros dispositivos compatibles.

## IMPORTANTE
Esta carpeta es el paquete final de software, pero la instalación de producción necesita datos que solamente puede proporcionar el propietario/administrador del servidor:

1. Dominio de LYC.
2. Contraseña segura de PostgreSQL.
3. Los 8 guardias reales y sus PIN iniciales.
4. Bucket privado S3 compatible.
5. Credenciales IAM/S3 con permisos para las evidencias.

No hay credenciales reales dentro de este paquete.

## Instalación
Consulta `INSTALACION_FINAL_ES.md`. Está escrita para seguirla paso a paso sin tener que modificar el código de LYC.
