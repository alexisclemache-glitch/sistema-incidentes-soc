# Manual de usuario

## 1. Acceso

Abre la URL pública del Web Service de Render. La dirección de entrega se
completa cuando el servicio esté desplegado y se haya probado:

**URL de la aplicación:** pendiente de despliegue verificado.

La ruta `/salud` es una comprobación técnica, no la pantalla de inicio de
sesión. Debe responder `UP` cuando la API y PostgreSQL estén disponibles.

## 2. Crear una cuenta de analista

1. En la pantalla de inicio, selecciona **Crear una cuenta de analista**.
2. Escribe nombre, correo y una contraseña de al menos 12 caracteres.
3. Pulsa **Crear cuenta**. El sistema inicia la sesión automáticamente.

El registro público crea una cuenta de analista, no una cuenta de administrador.

## 3. Iniciar sesión como administrador

Usa el correo y la contraseña definidos como `ADMIN_EMAIL` y `ADMIN_PASSWORD`
en el entorno del servicio. No hay credenciales predeterminadas. Si olvidaste
la contraseña, el responsable del despliegue debe cambiar `ADMIN_PASSWORD` en
Render y reiniciar el servicio.

## 4. Registrar un incidente

Con una sesión iniciada:

1. Completa fecha, hora y ubicación.
2. Escribe el título y selecciona severidad.
3. Completa detalles, impacto, acciones, testigos y datos del reportero.
4. Pulsa **Guardar incidente**.
5. Confirma que aparezca el mensaje de éxito y el registro en la tabla.

La información descriptiva se guarda como texto asociado al incidente. El
sistema escapa el contenido en pantalla usando `textContent`.

## 5. Consultar, editar y eliminar

- Los registros aparecen en **Incidentes registrados**.
- Pulsa **Editar** para cambiar título, descripción, severidad y estado. Los
  valores válidos de severidad son `Baja`, `Media`, `Alta` y `Crítica`; los
  estados válidos son `Abierto`, `En progreso` y `Cerrado`.
- Pulsa **Eliminar** y confirma para borrar un registro.
- Un analista ve y modifica sus propios incidentes. El administrador puede
  consultar y modificar los incidentes de todas las cuentas.

## 6. Cerrar sesión

Pulsa **Cerrar sesión** en la parte superior. La sesión del navegador se borra.
Los tokens expiran automáticamente a las ocho horas.

## 7. Solución de problemas

| Síntoma | Acción |
|---|---|
| No se pudo conectar con la API | Abre la URL del Web Service de Render, no la dirección de la base de datos ni `127.0.0.1`. Comprueba primero `<URL>/salud`. |
| `/salud` devuelve `503` | La aplicación no puede consultar PostgreSQL. Revisa el estado y `DATABASE_URL` dentro de Render; no compartas esa URL. |
| El servicio no inicia por `JWT_SECRET` | En el entorno del Web Service de Render configura un secreto aleatorio de al menos 32 bytes y vuelve a desplegar. |
| Login rechaza las credenciales | Confirma el `ADMIN_EMAIL` y cambia `ADMIN_PASSWORD` en Render si no recuerdas la contraseña. |
| CORS bloquea el navegador | Si la interfaz está en otro dominio, configura `CORS_ORIGINS` con el origen exacto (esquema y dominio, sin ruta). |
| Cambié `.env`, pero Render no cambia | `.env` solo configura la computadora local. En Render, actualiza las variables en el panel del servicio. |

No envíes capturas ni mensajes que contengan contraseñas, tokens, `JWT_SECRET`
o credenciales de PostgreSQL. Si una credencial se expone, rótala de inmediato.
