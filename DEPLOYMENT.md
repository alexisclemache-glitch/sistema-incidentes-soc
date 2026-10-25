# Configuración y despliegue

## Funcionalidad

- Los incidentes se almacenan en PostgreSQL y disponen de listar, crear,
  actualizar y eliminar.
- El registro público crea cuentas `ANALISTA`; cada analista solo puede consultar
  y modificar sus propios incidentes. Las cuentas `ADMIN` pueden gestionar
  todos los incidentes.
- El administrador inicial se aprovisiona con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
  No hay credenciales de administrador predeterminadas; al iniciar, también se
  deshabilita la antigua cuenta conocida `admin@soc.com` si conserva la
  contraseña predeterminada.
- La API requiere tokens Bearer JWT con una vigencia de ocho horas. La interfaz
  conserva el token solo durante la sesión actual del navegador.
- Los errores de validación se devuelven como HTTP 400. `/salud` comprueba la
  conexión a PostgreSQL y devuelve HTTP 503 cuando la base de datos no está
  disponible.

## Ejecución local

1. Crea una base PostgreSQL llamada `incidentes_db`.
2. Copia `.env.example` a `.env` y configura `DATABASE_URL`, un `JWT_SECRET`
   aleatorio de al menos 32 bytes, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. La
   contraseña administrativa debe tener entre 12 y 72 bytes.
3. Instala las dependencias con `npm ci` y ejecuta `npm start`.

Puedes generar un secreto con
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
Configura `CORS_ORIGINS` con los orígenes exactos que sirven la interfaz,
separados por comas y sin rutas. Por ejemplo:
`http://localhost:5500,https://mi-interfaz.vercel.app`.

`DB_SSL` activa TLS para la conexión PostgreSQL. Mantén la verificación del
certificado activa; `DB_SSL_REJECT_UNAUTHORIZED=false` solo debe usarse cuando
un proveedor requiera explícitamente omitirla.

No subas `.env` ni compartas sus credenciales.

## Despliegue en Render

1. Crea un Blueprint en Render para este repositorio. `render.yaml` crea el
   servicio Node.js y la base PostgreSQL.
2. Configura los secretos `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el
   servicio. Render solicita los valores marcados como `sync: false`.
3. Si la interfaz está alojada en otro dominio, configura `CORS_ORIGINS` con el
   origen completo de esa interfaz, por ejemplo `https://mi-interfaz.vercel.app`.
4. Espera a que el despliegue termine y comprueba
   `https://<servicio>.onrender.com/salud`. Debe responder con `"estado":"UP"`.

Render termina TLS HTTPS en su proxy. La aplicación confía en ese proxy, aplica
HSTS en producción y redirige a HTTPS cuando detecta tráfico HTTP. `DATABASE_URL`
se conecta por TLS en Render. No publiques esa URL ni la agregues al frontend.

## Frontend estático en Vercel y API en Render

1. Despliega primero el servicio y la base de Render y comprueba la ruta
   `/salud`.
2. En Vercel, despliega el directorio `public` como sitio estático, sin comando
   de compilación.
3. En `public/js/config.js`, define
   `window.SOC_API_BASE_URL = 'https://<servicio>.onrender.com';` (sin `/api`).
   La URL es pública y no debe contener secretos. Vuelve a desplegar Vercel.
4. Configura el entorno `CORS_ORIGINS` del servicio Render con el origen
   exacto del dominio Vercel y vuelve a desplegar la API.

La URL de API se configura explícitamente porque Vercel sirve estos archivos
como estáticos y no sustituye automáticamente variables de entorno del servidor
dentro del JavaScript del navegador. Si se abre el sitio desde el propio
servicio Render, se utiliza el mismo origen; desde Live Server se intenta
`http://localhost:3000`.

## Rutas principales

- `POST /api/auth/registro` — crea una cuenta de analista.
- `POST /api/auth/sesion` — inicia sesión y devuelve un token JWT.
- `GET /api/auth/sesion` — valida el token y devuelve la cuenta actual.
- `GET /api/incidentes`, `POST /api/incidentes`,
  `PUT /api/incidentes/:id`, `DELETE /api/incidentes/:id` — CRUD autenticado.
- `GET /salud` — estado del servicio y la base de datos.
