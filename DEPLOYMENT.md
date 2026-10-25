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
Render y abre la URL del servicio web; no uses la URL de GitHub Pages para
registrar incidentes.

1. Sube este repositorio a GitHub.
2. En Render, crea un **Blueprint** y selecciona el repositorio. Render leerá
   `render.yaml` para crear el servicio Node.js y la base PostgreSQL.
3. Espera a que el despliegue termine y abre la URL `onrender.com` del servicio.
   La ruta `/salud` debe responder con el estado `UP`.

Render configura `DATABASE_URL` entre los servicios. No publiques esa URL ni
la agregues al código fuente.
