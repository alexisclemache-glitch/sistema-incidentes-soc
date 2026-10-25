require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");

const cadenaConexion = process.env.DATABASE_URL;

if (!cadenaConexion) {
  console.error("Falta la variable DATABASE_URL.");
  process.exit(1);
}

const usarSSL = process.env.DB_SSL === "true";

const pool = new Pool({
  connectionString: cadenaConexion,
  ssl: usarSSL ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } : false
});

async function inicializarBaseDeDatos() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Tabla de Usuarios (Autenticación y Roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(120) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'ANALISTA',
        creado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Tabla de Incidentes (CRUD)
    await client.query(`
      CREATE TABLE IF NOT EXISTS incidentes (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(120) NOT NULL,
        descripcion TEXT,
        severidad VARCHAR(20) NOT NULL DEFAULT 'Media',
        estado VARCHAR(30) NOT NULL DEFAULT 'Abierto',
        usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
        creado_en TIMESTAMPTZ DEFAULT NOW(),
        actualizado_en TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const { rows: cuentasLegacy } = await client.query(
      "SELECT id, password FROM usuarios WHERE email = $1",
      ["admin@soc.com"]
    );
    if (cuentasLegacy[0] && await bcrypt.compare("Admin123!", cuentasLegacy[0].password)) {
      const passwordInaccesible = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      await client.query(
        "UPDATE usuarios SET password = $1, rol = 'ANALISTA' WHERE id = $2",
        [passwordInaccesible, cuentasLegacy[0].id]
      );
      console.warn("Se deshabilitó la cuenta administrativa con credenciales predeterminadas.");
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME?.trim() || "Administrador SOC";
    if (Boolean(adminEmail) !== Boolean(adminPassword)) {
      throw new Error("ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse juntos.");
    }
    if (adminEmail && adminPassword) {
      if (Buffer.byteLength(adminPassword, "utf8") < 12 || Buffer.byteLength(adminPassword, "utf8") > 72) {
        throw new Error("ADMIN_PASSWORD debe tener entre 12 y 72 bytes.");
      }
      const passHash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        `INSERT INTO usuarios (email, password, nombre, rol)
         VALUES ($1, $2, $3, 'ADMIN')
         ON CONFLICT (email) DO UPDATE
         SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = 'ADMIN'`,
        [adminEmail, passHash, adminName]
      );
      console.log(`Cuenta administrativa configurada: ${adminEmail}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al inicializar la base de datos:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, inicializarBaseDeDatos };