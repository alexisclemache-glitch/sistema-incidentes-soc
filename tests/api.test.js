require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app"); // Nota: Asegúrate de exportar 'app' en server.js o app.js
const { pool, inicializarBaseDeDatos } = require("../src/db");

let incidenteId = null;

// Antes de correr las pruebas, inicializamos la base de datos
before(async () => {
  await inicializarBaseDeDatos();
});

// Al terminar las pruebas, cerramos la conexión al pool de PostgreSQL
after(async () => {
  await pool.end();
});

test("1. GET /salud responde 200 y confirma base de datos conectada", async () => {
  const res = await request(app).get("/salud");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.estado, "UP");
  assert.strictEqual(res.body.baseDeDatos, "Conectada");
});

test("2. GET /api/incidentes retorna un arreglo de incidentes", async () => {
  const res = await request(app).get("/api/incidentes");
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test("3. POST /api/incidentes valida que el título sea obligatorio (Debe retornar 400)", async () => {
  const res = await request(app)
    .post("/api/incidentes")
    .send({ descripcion: "Falta el título a propósito" });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
});

test("4. POST /api/incidentes crea un incidente exitosamente (Retorna 201)", async () => {
  const res = await request(app)
    .post("/api/incidentes")
    .send({
      titulo: "Prueba Automatizada Jest / Node Test",
      descripcion: "Validando inserción segura contra inyección SQL",
      severidad: "Alta"
    });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.id);
  assert.strictEqual(res.body.titulo, "Prueba Automatizada Jest / Node Test");
  
  // Guardamos el ID para la prueba de eliminación posterior
  incidenteId = res.body.id;
});

test("5. DELETE /api/incidentes/:id elimina el incidente creado", async () => {
  assert.ok(incidenteId, "Debe existir un ID de incidente previo");

  const res = await request(app).delete(`/api/incidentes/${incidenteId}`);
  assert.strictEqual(res.status, 204); // 204 No Content
});