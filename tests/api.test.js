process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/test";
process.env.JWT_SECRET = "test-secret-with-at-least-thirty-two-bytes";
process.env.RENDER_EXTERNAL_URL = "https://soc-render.example";

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/db");

const analista = { id: 7, email: "analista@example.com", nombre: "Analista", rol: "ANALISTA" };
const incidentePrueba = {
  id: 123,
  titulo: "Acceso no autorizado",
  descripcion: "Actividad sospechosa detectada",
  severidad: "Alta",
  estado: "Abierto",
  usuario_id: analista.id
};
const tokenAnalista = jwt.sign(
  { email: analista.email, nombre: analista.nombre, rol: analista.rol },
  process.env.JWT_SECRET,
  {
    subject: String(analista.id),
    issuer: "sistema-incidentes-soc",
    audience: "sistema-incidentes-soc"
  }
);
const usuarioAdmin = { id: 1, email: "admin@example.com", nombre: "Admin", rol: "ADMIN" };
const tokenAdmin = jwt.sign(
  { email: usuarioAdmin.email, nombre: usuarioAdmin.nombre, rol: usuarioAdmin.rol },
  process.env.JWT_SECRET,
  {
    subject: String(usuarioAdmin.id),
    issuer: "sistema-incidentes-soc",
    audience: "sistema-incidentes-soc"
  }
);

async function conConsultaSimulada(consulta, ejecutar) {
  const consultaOriginal = pool.query;
  pool.query = consulta;
  try {
    return await ejecutar();
  } finally {
    pool.query = consultaOriginal;
  }
}

function conSesion(supertestRequest) {
  return supertestRequest.set("Authorization", `Bearer ${tokenAnalista}`);
}

function conSesionAdmin(supertestRequest) {
  return supertestRequest.set("Authorization", `Bearer ${tokenAdmin}`);
}

after(async () => {
  await pool.end();
});

test("GET /salud confirma que la API y la base de datos responden", async () => {
  const res = await conConsultaSimulada(
    async () => ({ rows: [{ "?column?": 1 }] }),
    () => request(app).get("/salud")
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "UP");
  assert.equal(res.body.baseDeDatos, "Conectada");
});

test("GET /salud devuelve 503 sin exponer detalles de la base de datos", async () => {
  const res = await conConsultaSimulada(
    async () => { throw new Error("detalle interno"); },
    () => request(app).get("/salud")
  );

  assert.equal(res.status, 503);
  assert.equal(res.body.estado, "DOWN");
  assert.equal(res.body.error, "Base de datos no disponible.");
});

test("CORS permite solicitudes de la URL pública del mismo servicio Render", async () => {
  const res = await request(app)
    .options("/api/auth/sesion")
    .set("Origin", process.env.RENDER_EXTERNAL_URL)
    .set("Access-Control-Request-Method", "POST");

  assert.equal(res.status, 204);
  assert.equal(res.headers["access-control-allow-origin"], process.env.RENDER_EXTERNAL_URL);
});

test("CORS rechaza orígenes no configurados", async () => {
  const res = await request(app)
    .get("/salud")
    .set("Origin", "https://origen-no-autorizado.example");

  assert.equal(res.status, 403);
});

test("GET /api/incidentes requiere autenticación", async () => {
  const res = await request(app).get("/api/incidentes");

  assert.equal(res.status, 401);
});

test("GET /api/incidentes retorna solo los incidentes propios de un analista", async () => {
  const res = await conConsultaSimulada(
    async (sql, parametros) => {
      assert.match(sql, /usuario_id = \$2/);
      assert.deepEqual(parametros, [false, analista.id]);
      return { rows: [incidentePrueba] };
    },
    () => conSesion(request(app).get("/api/incidentes"))
  );

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [incidentePrueba]);
});

test("GET /api/incidentes permite al administrador consultar todos los registros", async () => {
  const res = await conConsultaSimulada(
    async (_sql, parametros) => {
      assert.deepEqual(parametros, [true, usuarioAdmin.id]);
      return { rows: [incidentePrueba] };
    },
    () => conSesionAdmin(request(app).get("/api/incidentes"))
  );

  assert.equal(res.status, 200);
});

test("POST /api/incidentes valida campos y opciones permitidas", async () => {
  const res = await conSesion(request(app)
    .post("/api/incidentes")
    .send({ titulo: "", severidad: "Extrema" }));

  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test("POST /api/incidentes crea un incidente para el usuario autenticado", async () => {
  const res = await conConsultaSimulada(
    async (_sql, parametros) => {
      assert.equal(parametros[0], incidentePrueba.titulo);
      assert.equal(parametros[2], incidentePrueba.severidad);
      assert.equal(parametros[4], analista.id);
      return { rows: [incidentePrueba] };
    },
    () => conSesion(request(app)
      .post("/api/incidentes")
      .send({
        titulo: incidentePrueba.titulo,
        descripcion: incidentePrueba.descripcion,
        severidad: incidentePrueba.severidad
      }))
  );

  assert.equal(res.status, 201);
  assert.equal(res.body.id, incidentePrueba.id);
});

test("PUT /api/incidentes/:id actualiza los campos autorizados", async () => {
  const res = await conConsultaSimulada(
    async (_sql, parametros) => {
      assert.deepEqual(parametros, ["Título actualizado", null, null, "Cerrado", 123, false, analista.id]);
      return { rows: [{ ...incidentePrueba, titulo: parametros[0], estado: parametros[3] }] };
    },
    () => conSesion(request(app)
      .put("/api/incidentes/123")
      .send({ titulo: "Título actualizado", estado: "Cerrado" }))
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "Cerrado");
});

test("DELETE /api/incidentes/:id elimina solo un incidente autorizado", async () => {
  const res = await conConsultaSimulada(
    async (_sql, parametros) => {
      assert.deepEqual(parametros, [123, false, analista.id]);
      return { rowCount: 1 };
    },
    () => conSesion(request(app).delete("/api/incidentes/123"))
  );

  assert.equal(res.status, 204);
});

test("DELETE /api/incidentes/:id rechaza un ID inválido", async () => {
  const res = await conSesion(request(app).delete("/api/incidentes/0"));

  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test("POST /api/auth/registro valida datos antes de consultar la base de datos", async () => {
  const res = await request(app)
    .post("/api/auth/registro")
    .send({ email: "incorrecto", password: "corta", nombre: "" });

  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test("POST /api/auth/registro crea una cuenta analista y nunca devuelve la contraseña", async () => {
  const res = await conConsultaSimulada(
    async (sql, parametros) => {
      if (sql.includes("SELECT id, email, password")) return { rows: [] };
      assert.match(sql, /VALUES \(\$1, \$2, \$3, 'ANALISTA'\)/);
      assert.equal(parametros[0], "nuevo@example.com");
      assert.equal(await bcrypt.compare("contraseña-segura", parametros[1]), true);
      return {
        rows: [{
          id: 42,
          email: parametros[0],
          nombre: parametros[2],
          rol: "ANALISTA"
        }]
      };
    },
    () => request(app)
      .post("/api/auth/registro")
      .send({
        email: "Nuevo@Example.com",
        password: "contraseña-segura",
        nombre: "Nuevo analista",
        rol: "ADMIN"
      })
  );

  assert.equal(res.status, 201);
  assert.equal(res.body.usuario.rol, "ANALISTA");
  assert.equal(Object.hasOwn(res.body.usuario, "password"), false);
  assert.ok(res.body.token);
});

test("POST /api/auth/sesion autentica una contraseña y firma un token", async () => {
  const passwordHash = await bcrypt.hash("contraseña-segura", 4);
  const res = await conConsultaSimulada(
    async () => ({
      rows: [{
        id: 15,
        email: "analista@example.com",
        nombre: "Analista",
        rol: "ANALISTA",
        password: passwordHash
      }]
    }),
    () => request(app)
      .post("/api/auth/sesion")
      .send({ email: "ANALISTA@example.com", password: "contraseña-segura" })
  );

  assert.equal(res.status, 200);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).sub, "15");
});
