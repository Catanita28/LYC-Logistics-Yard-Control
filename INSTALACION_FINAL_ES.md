# INSTALACIÓN FINAL DE LYC 2.248 — GUÍA PASO A PASO

## Antes de comenzar
LYC no es solamente una página que se abre en el iPad. La versión final usa un servidor para guardar y sincronizar los datos y las evidencias.

Necesitas:
- Un servidor o computadora que pueda ejecutar Docker y Docker Compose.
- Un dominio para LYC, por ejemplo `lyc.tudominio.com`.
- Un bucket S3 privado para las fotos.
- Las credenciales del proveedor S3.
- Los 8 guardias reales y sus PIN iniciales.

**Si no tienes servidor, dominio o S3, no intentes inventarlos. Un técnico/administrador puede preparar esas tres cosas y luego seguir esta guía.**

---

# PARTE 1 — Preparar el servidor

### 1. Copiar el paquete
Descomprime el archivo final de LYC en una carpeta del servidor.

### 2. Crear la configuración privada
Copia:

`.env.example` → `.env`

Abre `.env` y cambia TODOS los valores de ejemplo.

### 3. Dominio
En `LYC_DOMAIN` escribe el dominio real que apuntará al servidor.

Ejemplo:

`LYC_DOMAIN=lyc.tudominio.com`

El DNS del dominio debe apuntar al servidor donde correrá LYC.

### 4. Contraseña de la base de datos
Usa una contraseña aleatoria fuerte de al menos 16 caracteres.

Ejemplo de formato solamente:

`LYC_DB_PASSWORD=UNA-CONTRASEÑA-LARGA-Y-ALEATORIA`

No uses el ejemplo literalmente.

### 5. Los 8 guardias
En `LYC_GUARD_CREDENTIALS_JSON` deben aparecer exactamente los 8 guardias reales.

Cada uno necesita:
- guardId: identificador numérico de 4–8 dígitos.
- role: normalmente `Security`, salvo que corresponda otro rol.
- pin: PIN inicial de 4–8 dígitos.

Los PIN son temporales de instalación: deben entregarse de forma privada y no publicarse.

### 6. S3
Completa:
- `AWS_REGION`
- `LYC_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

El bucket debe ser privado.

Si se usa un proveedor compatible con S3 que no sea AWS, también se configura `LYC_S3_ENDPOINT` y debe utilizar HTTPS en producción.

### 7. No compartas `.env`
El archivo `.env` contiene secretos. No lo mandes por WhatsApp, no lo subas a GitHub y no lo compartas públicamente.

---

# PARTE 2 — Preparar el bucket de fotos

El archivo `s3-cors.json` trae la plantilla de CORS.

Antes de aplicarla:
1. Cambia `https://YOUR-LYC-DOMAIN` por el dominio real de LYC.
2. Aplica la regla CORS al bucket privado.
3. Verifica que las credenciales utilizadas por LYC puedan crear/verificar los objetos necesarios.

---

# PARTE 3 — Comprobar la configuración

Desde la carpeta de LYC ejecuta:

`node scripts/production-preflight.js`

Debe aparecer:

`PRODUCTION PREFLIGHT: PASS`

Si aparece `FAIL`, **no continúes**. El mensaje indicará qué configuración falta.

---

# PARTE 4 — Instalar LYC

Ejecuta:

`docker compose build`

Después:

`docker compose up -d`

Docker levantará:
- PostgreSQL.
- Migración de la base de datos.
- Servidor LYC.
- Caddy para HTTPS y para servir la aplicación.

Caddy gestiona HTTPS automáticamente cuando el dominio apunta correctamente al servidor y los puertos 80/443 están disponibles.

---

# PARTE 5 — Primera prueba

En un iPad o computadora, abre el dominio de LYC usando HTTPS.

Ejemplo:

`https://lyc.tudominio.com`

### Prueba 1 — Inicio de turno
1. Selecciona el guardia.
2. Introduce su PIN.
3. Comprueba que el turno quede atribuido al guardia correcto.

### Prueba 2 — ENTRADA
Haz una entrada de prueba.

Comprueba:
- Truck correcto.
- Trailer correcto.
- Conductor correcto.
- Carga correcta.
- Origen/destino.
- Millas.
- Sello.
- Fotos nuevas tomadas con la cámara.
- Firma del conductor.
- Hora y guardia correctos.

### Prueba 3 — SALIDA
Haz una salida de prueba independiente.

**No reutilices las fotos de la entrada.** La salida debe tomar fotos nuevas en ese momento.

### Prueba 4 — QR
Prueba un QR de Truck, Trailer, personal y Load.

Comprueba que el escaneo encuentre el registro maestro y rellene los datos conocidos.

### Prueba 5 — Llaves
Prueba Pick y Drop.

En Drop verifica que quede registrado quién recibió la llave.

### Prueba 6 — Relevo
Haz un relevo entre dos guardias y comprueba que queden registrados quien entrega, quien recibe y el checklist.

### Prueba 7 — Personal
Registra una entrada/salida de personal y comprueba las evidencias tomadas en tiempo real.

### Prueba 8 — Offline
Esta es MUY importante.

1. Abre LYC con Internet.
2. Inicia sesión.
3. Desconecta Internet.
4. Haz una operación de prueba.
5. Comprueba que LYC continúe trabajando y guarde la operación localmente.
6. Vuelve a conectar Internet.
7. Comprueba que la cola se sincronice.

### Prueba 9 — Evidencias
Comprueba en el almacenamiento S3 que las evidencias lleguen correctamente después de sincronizar.

### Prueba 10 — Cierre de turno
Finaliza el turno y comprueba que quede registrado correctamente.

---

# PARTE 6 — Cuando la prueba termine

Si todas las pruebas anteriores pasan, LYC puede pasar a operación real.

Para el uso diario:
- Cada guardia usa su propio PIN.
- No compartir PIN entre guardias.
- Cada ENTRADA es su propio reporte.
- Cada SALIDA es su propio reporte.
- Las fotos de movimiento se toman en tiempo real.
- No borrar ni modificar evidencias fuera del sistema.
- Si Internet falla, seguir trabajando: LYC conserva las operaciones localmente y sincroniza al regresar la conexión.

## Regla de oro
**No declares una prueba exitosa si no se vio el resultado en el dispositivo y en el servidor.**
