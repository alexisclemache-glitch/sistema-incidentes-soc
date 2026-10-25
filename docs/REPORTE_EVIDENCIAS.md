# Reporte de configuración, pruebas y evidencias

**Proyecto:** Sistema de gestión de incidentes SOC/CSIRT

**Fecha de verificación local:** 24 de octubre de 2026

**Repositorio:** <https://github.com/alexisclemache-glitch/sistema-incidentes-soc>

**Rama verificada:** `main`

## 1. Resumen ejecutivo

La aplicación cuenta con configuración por entorno, logs de solicitudes, una
ruta de salud con verificación de PostgreSQL y pruebas automatizadas de API.
La validación local de código y la suite de pruebas terminaron correctamente.

**El servicio público no se considera operativo todavía.** Los logs de Render
compartidos durante la configuración muestran que el Web Service no inició
porque `JWT_SECRET` faltaba en el entorno de Render. La posterior validación del
`.env` local no prueba que ese secreto se haya configurado en Render ni que el
servicio se haya redesplegado. No se ha podido confirmar una URL pública
respondiendo salud correctamente.

## 2. Matriz de evidencias

| Requisito | Evidencia observada | Estado |
|---|---|---|
| Configuración por entorno | `src/server.js` valida `JWT_SECRET` (mínimo 32 bytes), las credenciales administrativas en producción, formato de correo y longitud de contraseña. `src/db.js` lee `DATABASE_URL` y `DB_SSL`. | Implementado; formato local validado. |
| CORS configurable | `src/app.js` usa `CORS_ORIGINS`, `PUBLIC_BASE_URL` y `RENDER_EXTERNAL_URL`. Hay pruebas de origen Render permitido y origen no autorizado rechazado. | Implementado y probado. |
| Logs | `src/app.js` habilita Morgan (`combined`) fuera de pruebas; registra errores de salud e incidencias del servidor. | Implementado; se observó salida de diagnóstico en pruebas. |
| Health check | `GET /salud` realiza `SELECT 1`; responde `200` cuando la consulta funciona y `503` cuando falla. `render.yaml` establece `healthCheckPath: /salud`. | Implementado; casos 200/503 probados con consultas simuladas. |
| Pruebas finales | Ejecución final de `npm test`: 15 tests, 15 passed, 0 failed. También pasaron `node --check` para los archivos principales y `git diff --check`. | Aprobado localmente. |
| Exclusión de secretos | `git check-ignore .env` confirmó que `.env` está ignorado por Git. La inspección local no mostró valores secretos. | Aprobado. |
| Despliegue Render | Log compartido por el usuario: compilación completada, inicio con `npm start` y salida de proceso 1 por `JWT_SECRET` ausente. | Fallido en la última evidencia de despliegue recibida. |
| Disponibilidad pública | No se recibió una URL de Web Service activa ni evidencia HTTP `200` de `<URL>/salud`. | Pendiente de verificación. |

## 3. Evidencia de configuración local

Se inspeccionaron los nombres y formatos de las variables de `.env` sin
imprimir sus valores:

- `DATABASE_URL`: presente y con esquema PostgreSQL.
- `JWT_SECRET`: longitud mínima de 32 bytes.
- `ADMIN_EMAIL`: formato de correo válido.
- `ADMIN_PASSWORD`: entre 12 y 72 bytes.
- `CORS_ORIGINS`: presente.
- `DB_SSL`: activado.
- No se detectaron claves duplicadas ni claves desconocidas.
- `.env` está ignorado por Git.

Esta inspección solo valida presencia y formato. **No demuestra** que las
credenciales funcionen, que PostgreSQL permita conexión ni que los valores se
hayan configurado en Render. No incluir secretos, contraseñas ni URL de
conexión en capturas o en la entrega.

## 4. Evidencia de pruebas

Comando ejecutado:

```text
npm test
```

Resultado final:

```text
tests 15
pass 15
fail 0
cancelled 0
skipped 0
```

Las pruebas verifican:

1. `/salud` responde `200` cuando la consulta simulada funciona.
2. `/salud` responde `503` sin revelar detalles internos cuando la consulta
   simulada falla.
3. CORS permite el origen público del servicio Render y rechaza un origen no
   permitido.
4. La API de incidentes requiere autenticación.
5. Un analista ve sus propios registros y el administrador puede listar todos.
6. Validación y operaciones de creación, actualización y eliminación.
7. Validación y emisión de sesión para registro e inicio de sesión.

Las consultas a PostgreSQL se simulan en esta suite. No es una prueba de
integración contra la base real ni una prueba end-to-end con navegador.

## 5. Evidencia del despliegue y estado de producción

En los logs de Render proporcionados durante la sesión se observó:

```text
Build successful
Running 'npm start'
Configuración inválida: JWT_SECRET es obligatorio y debe tener al menos 32 bytes.
Exited with status 1
```

El Blueprint asocia la base de datos y define el Web Service, pero el log
demuestra que esa ejecución de la aplicación no quedó activa. Aunque el `.env`
local se verificó después, las variables del entorno local son independientes
de las variables configuradas en Render.

**URL pública verificada:** ninguna disponible en las evidencias recibidas.

**Estado de `/salud` en producción:** no verificado.

No presentar una dirección de Render como funcional hasta completar la
verificación descrita abajo.

## 6. Pasos para cerrar la evidencia de producción

1. En Render, abrir el recurso **Web Service**
   `sistema-incidentes-soc` (no el recurso PostgreSQL).
2. En **Environment**, definir `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
   Mantener los valores en el panel de Render; no enviarlos por chat ni
   incorporarlos a JavaScript.
3. Guardar y volver a desplegar. Esperar a que el Web Service aparezca como
   **Live** y revisar que sus logs indiquen que inició, sin errores de
   configuración o conexión PostgreSQL.
4. Copiar la URL pública desde la página del Web Service y solicitar
   `https://<servicio>.onrender.com/salud`.
5. Guardar para la entrega una captura que muestre la URL sin parámetros
   sensibles y la respuesta `200` con `"estado":"UP"`. No incluir la pestaña
   Environment ni cadenas de conexión.
6. Probar en el navegador: registro/login, crear incidente, editarlo, recargar
   la página para verificar persistencia y eliminar el registro de prueba.
   Usar únicamente datos ficticios.
7. Actualizar la URL pendiente en la documentación de entrega y registrar la
   fecha y el resultado real.

## 7. Evidencias que se pueden adjuntar a la entrega

- Captura de la ejecución final `npm test` mostrando 15 pruebas exitosas.
- Captura de `/salud` en la URL pública respondiendo `200` y `UP` después del
  despliegue corregido.
- Captura de la aplicación mostrando un incidente ficticio antes y después de
  editarlo.
- Captura del log de Render de un despliegue exitoso, ocultando valores
  sensibles.
- Enlace al repositorio versionado y al commit que contenga el reporte.

Las capturas de Render compartidas hasta ahora demuestran la asociación de la
base y el fallo por `JWT_SECRET` ausente; no constituyen evidencia de un
despliegue exitoso.
