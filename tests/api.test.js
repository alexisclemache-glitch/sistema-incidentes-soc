process.env.NODE_ENV = "test";

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/db");

const incidentePrueba = {
  id: 123,
  titulo: "Acceso no autorizado",
  descripcion: "Actividad sospechosa detectada",
  severidad: "Alta",
  estado: "Abierto"
};

async function conConsultaSimulada(consulta, ejecutar) {
  const consultaOriginal = pool.query;
  pool.query = consulta;
  try {
    return await ejecutar();
  } finally {
    pool.query = consultaOriginal;
  }
}

after(async () => {
  await pool.end();
});

test("GET /salud confirma que la API responde y la consulta de salud funciona", async () => {
  const res = await conConsultaSimulada(
    async () => ({ rows: [{ "?column?": 1 }] }),
    () => request(app).get("/salud")
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.estado, "UP");
  assert.equal(res.body.baseDeDatos, "Conectada");
});

test("GET /api/incidentes retorna los incidentes registrados", async () => {
  const res = await conConsultaSimulada(
    async () => ({ rows: [incidentePrueba] }),
    () => request(app).get("/api/incidentes")
  );

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [incidentePrueba]);
});

test("POST /api/incidentes valida que el título sea obligatorio", async () => {
  const res = await request(app)
    .post("/api/incidentes")
    .send({ titulo: "" });

  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test("POST /api/incidentes crea un incidente válido", async () => {
  const res = await conConsultaSimulada(
    async (_sql, parametros) => {
      assert.equal(parametros[0], incidentePrueba.titulo);
      assert.equal(parametros[2], incidentePrueba.severidad);
      return { rows: [incidentePrueba] };
    },
    () => request(app)
      .post("/api/incidentes")
      .send({
        titulo: incidentePrueba.titulo,
        descripcion: incidentePrueba.descripcion,
        severidad: incidentePrueba.severidad
      })
  );

  assert.equal(res.status, 201);
  assert.equal(res.body.id, incidentePrueba.id);
  assert.equal(res.body.titulo, incidentePrueba.titulo);
});

test("DELETE /api/incidentes/:id elimina un incidente existente", async () => {
  const res = await conConsultaSimulada(
    async () => ({ rowCount: 1 }),
    () => request(app).delete(`/api/incidentes/${incidentePrueba.id}`)
  );

  assert.equal(res.status, 204);
});

test("DELETE /api/incidentes/:id rechaza un ID inválido", async () => {
  const res = await request(app).delete("/api/incidentes/0");

  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});
