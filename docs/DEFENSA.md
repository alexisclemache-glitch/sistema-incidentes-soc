# Guion de defensa y demostración

## Estado de entrega

- Repositorio versionado: <https://github.com/alexisclemache-glitch/sistema-incidentes-soc>.
- Rama revisada: `main`.
- Pruebas automatizadas: 15 pruebas pasan localmente con `npm test`.
- URL pública: **pendiente**. El último despliegue observado no arrancó porque
  Render no tenía `JWT_SECRET`. No presentar una URL como operativa hasta
  confirmar que la página `/salud` responde `UP`.
- No mostrar `.env`, contraseñas, tokens ni `DATABASE_URL` durante la defensa.

## Demostración (5 minutos)

### Preparación

1. Confirmar que Render muestra el Web Service como **Live**.
2. Abrir `<URL-del-servicio>/salud` y verificar HTTP 200 y `"estado":"UP"`.
3. Abrir la URL base en una ventana privada y tener a mano una cuenta de
   demostración. No usar una contraseña real en las diapositivas.
4. Tener una segunda cuenta de analista solo si ya se preparó y se validó antes.

### Flujo

1. Registrar un analista desde **Crear una cuenta de analista**.
2. Crear un incidente de prueba con datos sintéticos y severidad `Alta`.
3. Mostrar el incidente en la tabla y explicar que ya quedó persistido en
   PostgreSQL.
4. Editar el título/estado, por ejemplo cambiarlo a `En progreso`.
5. Eliminar el registro de prueba y confirmar la acción.
6. Cerrar sesión e iniciar sesión nuevamente para demostrar autenticación.
7. Si existen dos analistas, intentar comparar sus listas para ilustrar el
   aislamiento por propietario. No simular un resultado que no se haya probado.

Usar exclusivamente información ficticia; no introducir incidentes, nombres ni
datos de contacto reales.

## Preguntas frecuentes para la defensa

### ¿Cuál es la arquitectura?

Una aplicación de tres partes: navegador con HTML/CSS/JavaScript, API REST en
Node.js y Express, y PostgreSQL. En Render, el mismo Web Service sirve la
interfaz y la API; el Blueprint conecta el servicio con la base.

### ¿Cómo persiste la información?

Los controladores llaman modelos que ejecutan SQL parametrizado mediante el
pool `pg`. El esquema crea tablas `usuarios` e `incidentes`; las operaciones de
crear, actualizar y eliminar escriben en PostgreSQL.

### ¿Cómo se autentican los usuarios?

El servidor comprueba hashes bcrypt. Tras login o registro devuelve JWT con
emisor, audiencia y expiración de ocho horas. La interfaz lo envía como Bearer
token y lo conserva en `sessionStorage` durante la sesión del navegador.

### ¿Cómo se aplica autorización?

El registro público siempre crea rol `ANALISTA`. El token identifica la cuenta
y su rol. El modelo restringe listados, cambios y borrados por `usuario_id`, a
menos que el rol sea `ADMIN`. Las consultas SQL son parametrizadas.

### ¿Qué controles de seguridad se implementaron?

Validación de entradas, bcrypt, JWT firmado, Helmet, CORS con lista permitida,
HTTPS/HSTS en producción, TLS PostgreSQL en Render, tamaño máximo JSON, mensajes
de error de salud sin detalles internos y exclusión del `.env` de Git.

### ¿Qué cubren las pruebas?

Pruebas de rutas con Supertest y consultas de base simuladas: salud, CORS,
autenticación requerida, permisos por rol/propietario, CRUD, validación,
registro y login. No son una integración real contra PostgreSQL ni pruebas E2E
de navegador.

### ¿Cuáles son las limitaciones?

No hay rate limiting, recuperación de contraseña, segundo factor, revocación
inmediata del JWT, paginación, auditoría completa ni migraciones versionadas.
El editor de la interfaz usa `prompt`. Los roles modificados en base afectan a
tokens existentes al expirar. Para producción convendría incorporar esos
controles y pruebas de integración/E2E.

### ¿Qué ocurre si PostgreSQL deja de responder?

`/salud` devuelve HTTP 503 y un estado `DOWN` sin exponer el error interno.
Render puede usar esta ruta para marcar el servicio como no saludable.

## Cierre sugerido

“El prototipo muestra un flujo persistente de gestión de incidentes, separado
por autenticación y roles, con despliegue reproducible por Blueprint. Las
pruebas actuales validan el contrato de la API; antes de tratarlo como sistema
de producción, completaría limitación de intentos, auditoría, recuperación de
cuentas, migraciones y pruebas E2E.”
