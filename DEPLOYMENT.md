# Despliegue en Render

## Ejecución local

La aplicación requiere una instancia PostgreSQL activa también cuando se ejecuta
en local. Crea una base de datos llamada `incidentes_db`, copia `.env.example`
a `.env`, reemplaza `YOUR_PASSWORD` por la contraseña de tu usuario PostgreSQL
y ejecuta `npm start`. El servidor crea las tablas necesarias al iniciar.

No subas el archivo `.env` ni compartas sus credenciales.

## Render

La aplicación Express sirve tanto la API como la interfaz web. Para evitar el
HTTP 405 de GitHub Pages, despliega el servicio web y PostgreSQL juntos en
Render.

1. Sube este repositorio a GitHub.
2. En Render, crea un **Blueprint** y selecciona el repositorio. Render leerá
   `render.yaml` para crear el servicio Node.js y la base PostgreSQL.
3. Espera a que el despliegue termine y abre la URL `onrender.com` del servicio.
   La ruta `/salud` debe responder con el estado `UP`.

Render configura `DATABASE_URL` entre los servicios. No publiques esa URL ni
la agregues al código fuente.

## Interfaz en Vercel y API en Render

También puedes alojar solo la interfaz estática en Vercel y dejar Express y
PostgreSQL en Render:

1. Despliega primero el Blueprint de Render y confirma que `https://<servicio>.onrender.com/salud`
   responda con el estado `UP`.
2. En Vercel, importa este repositorio como proyecto estático. Usa el directorio
   `public` como directorio de salida y no configures un comando de compilación.
3. En `public/js/config.js`, configura `window.SOC_API_BASE_URL` con la URL base
   pública de Render, por ejemplo `https://<servicio>.onrender.com` (sin `/api`).
   Guarda y vuelve a desplegar el proyecto de Vercel.

El frontend usa esa URL para listar, registrar y eliminar incidentes. Si se abre
desde Render, usa automáticamente el mismo origen; desde Live Server, usa la API
local en `http://localhost:3000`. No pongas la URL de la base de datos ni otras
credenciales en `config.js`.
