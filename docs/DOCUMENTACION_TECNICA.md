# Documentación técnica

## 1. Descripción

Sistema web para registrar y administrar incidentes de un equipo SOC/CSIRT.
Incluye una interfaz servida como archivos estáticos, una API REST en Express y
almacenamiento relacional en PostgreSQL.

## 2. Arquitectura

```text
Navegador
  public/index.html + public/js/app.js + public/css/styles.css
        │ HTTPS, JSON, Bearer JWT
        ▼
Node.js / Express (src/server.js, src/app.js)
  ├── autenticación y autorización
  ├── validación, Helmet, CORS y Morgan
  └── modelos parametrizados
        │ TLS en Render
        ▼
PostgreSQL (usuarios, incidentes)
```

En el despliegue de servicio único, Express sirve la interfaz y la API desde el
mismo origen. El Blueprint de Render está definido en `render.yaml`. También se
puede publicar `public/` en un proveedor estático, configurando la URL pública
de la API en `public/js/config.js` y su origen en `CORS_ORIGINS`.

## 3. Componentes

| Ruta | Responsabilidad |
|---|---|
| `src/server.js` | Valida configuración, inicializa la base y escucha en `PORT`. |
| `src/app.js` | Configura Express, seguridad HTTP, CORS, logs, archivos estáticos y salud. |
| `src/routes/` | Rutas de autenticación e incidentes. |
| `src/controllers/` | Validación de solicitudes y respuestas HTTP. |
| `src/middleware/autenticacion.js` | Verifica JWT Bearer, emisor, audiencia, expiración y rol. |
| `src/models/` | Consultas parametrizadas a PostgreSQL. |
| `src/db.js` | Pool PostgreSQL, esquema e inicialización del administrador. |
| `public/` | Interfaz de usuario y cliente HTTP. |
| `tests/api.test.js` | Pruebas de API con base de datos simulada y Supertest. |

## 4. Modelo de datos

### `usuarios`

- `id`: identificador serial.
- `email`: correo único, máximo 120 caracteres.
- `password`: hash bcrypt; nunca se devuelve en las respuestas de autenticación.
- `nombre`: nombre visible, máximo 100 caracteres.
- `rol`: `ADMIN` o `ANALISTA`.
- `creado_en`: fecha de creación.

### `incidentes`

- `id`: identificador serial.
- `titulo`: texto obligatorio, máximo 120 caracteres.
- `descripcion`: texto opcional.
- `severidad`: `Baja`, `Media`, `Alta` o `Crítica`.
- `estado`: `Abierto`, `En progreso` o `Cerrado`.
- `usuario_id`: propietario, referencia a `usuarios`.
- `creado_en`, `actualizado_en`: marcas de tiempo.

El esquema se crea al iniciar mediante `CREATE TABLE IF NOT EXISTS`. No se usa
actualmente un gestor de migraciones versionadas.

## 5. API REST

Las rutas de incidentes requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Resultado |
|---|---|---|---|
| `POST` | `/api/auth/registro` | Público | Crea analista; `201`. |
| `POST` | `/api/auth/sesion` | Público | Valida credenciales y emite JWT. |
| `GET` | `/api/auth/sesion` | Autenticado | Devuelve los datos de la sesión. |
| `GET` | `/api/incidentes` | Autenticado | Admin: todos; analista: propios. |
| `POST` | `/api/incidentes` | Autenticado | Crea incidente del usuario autenticado; `201`. |
| `PUT` | `/api/incidentes/:id` | Autenticado | Actualiza campos admitidos si pertenece al usuario o es admin. |
| `DELETE` | `/api/incidentes/:id` | Autenticado | Elimina si pertenece al usuario o es admin; `204`. |
| `GET` | `/salud` | Público | Verifica PostgreSQL; `200` o `503`. |

Las consultas SQL usan parámetros. La validación de la API rechaza campos
desconocidos, IDs no positivos, títulos vacíos, severidades/estados no
permitidos y cargas JSON superiores a 1 MB.

## 6. Autenticación y autorización

- Las contraseñas se almacenan con bcrypt y coste 12.
- Las contraseñas nuevas deben tener entre 12 y 72 bytes UTF-8.
- Los tokens JWT duran ocho horas y comprueban `issuer` y `audience`.
- La interfaz guarda el token en `sessionStorage`; se elimina al cerrar sesión
  o detectar una respuesta `401`.
- El registro público solo asigna el rol `ANALISTA`. El administrador se crea o
  actualiza mediante `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- El propietario se usa en las consultas de lectura, actualización y borrado,
  no se acepta del cuerpo enviado por el cliente.
- Una instalación antigua con la contraseña administrativa predeterminada se
  deshabilita durante la inicialización.

## 7. Configuración por entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | URL de PostgreSQL; nunca se coloca en el frontend. |
| `JWT_SECRET` | Sí | Secreto aleatorio con mínimo 32 bytes. |
| `ADMIN_EMAIL` | En producción | Correo de la cuenta administrativa. |
| `ADMIN_PASSWORD` | En producción | Contraseña administrativa de 12–72 bytes. |
| `ADMIN_NAME` | No | Nombre visible del administrador. |
| `PORT` | No | Puerto HTTP; valor local predeterminado 3000. |
| `NODE_ENV` | No | `production` activa HSTS y requisito de HTTPS. |
| `DB_SSL` | No | `true` activa TLS hacia PostgreSQL. |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | Solo `false` desactiva validación del certificado; evitarlo. |
| `CORS_ORIGINS` | No | Lista separada por comas de orígenes adicionales permitidos. |
| `PUBLIC_BASE_URL` | No | Origen HTTPS público opcional para proxy/redirecciones. |
| `RENDER_EXTERNAL_URL` | Render | URL pública que Render proporciona al servicio. |

Crear un secreto local:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copiar `.env.example` a `.env` para desarrollo. El archivo `.env` está excluido
de Git y no debe enviarse, adjuntarse ni incluirse en capturas. En producción,
definir secretos en el panel de entorno del proveedor.

## 8. Transporte, registros y salud

- Helmet configura cabeceras HTTP; HSTS se activa en producción.
- En producción, la aplicación exige HTTPS y reconoce el proxy de Render.
- CORS acepta el origen del servicio Render y los orígenes enumerados en
  `CORS_ORIGINS`; las solicitudes de origen no permitido reciben `403`.
- Morgan registra solicitudes HTTP fuera de pruebas.
- `/salud` consulta `SELECT 1`, devuelve `200` si PostgreSQL responde y `503`
  con un mensaje sin detalles internos si falla.
- En Render, `healthCheckPath: /salud` conecta esta comprobación con el estado
  del servicio.

## 9. Pruebas

Ejecutar:

```powershell
npm test
```

La suite usa el test runner nativo de Node.js, Supertest y sustituciones
temporales de `pool.query`. Comprueba salud, CORS, autenticación requerida,
visibilidad por rol, creación, actualización, borrado, validación, registro y
login.

La suite **no** es una prueba de integración con una instancia real de
PostgreSQL, no es una prueba de navegador y no confirma que un servicio Render
esté desplegado.

## 10. Limitaciones conocidas y mejoras futuras

- No hay limitación de intentos (rate limiting) para login o registro.
- No hay flujo de recuperación de contraseña, segundo factor ni revocación
  inmediata de JWT; un token emitido dura hasta ocho horas.
- El rol está incluido en el JWT. Un cambio de rol no afecta tokens ya emitidos
  hasta su expiración.
- El listado no tiene paginación ni filtros.
- El navegador no dispone de una política CSP activa en Helmet.
- La actualización de la interfaz usa cuadros `prompt`; puede reemplazarse por
  un formulario accesible y con controles de selección.
- La inicialización del esquema no tiene migraciones reversibles.
- Se recomienda agregar rate limiting, auditoría de cambios, migraciones,
  pruebas de integración y una prueba E2E antes de un uso de producción con
  datos sensibles.

## 11. Despliegue y URL

El Blueprint asocia el Web Service con PostgreSQL. El servicio requiere
`JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en su entorno. La URL pública de
la aplicación se obtiene de la página del Web Service en Render, no de la
pantalla de la base de datos.

**URL pública:** pendiente de completar después de que Render informe el
despliegue exitoso. Verificar `https://<servicio>.onrender.com/salud` y
reemplazar este texto por la URL real antes de entregar.
