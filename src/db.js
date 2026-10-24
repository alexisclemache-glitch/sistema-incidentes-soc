require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const cadenaConexion = process.env.DATABASE_URL;

if (!cadenaConexion) {
  console.error("❌ Falta la variable DATABASE_URL en el archivo .env");
  process.exit(1);
}

const usarSSL = cadenaConexion.includes(".render.com") || process.env.DB_SSL === "true";

const pool = new Pool({
  connectionString: cadenaConexion,
  ssl: usarSSL ? { rejectUnauthorized: false } : false
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

    // Crear un usuario administrador por defecto si no existe
    const { rows } = await client.query("SELECT COUNT(*)::int AS total FROM usuarios");
    if (rows[0].total === 0) {
      const passHash = await bcrypt.hash("Admin123!", 10);
      await client.query(
        `INSERT INTO usuarios (email, password, nombre, rol) VALUES ($1, $2, $3, $4)`,
        ["admin@soc.com", passHash, "Administrador SOC", "ADMIN"]
      );
      console.log("✅ Usuario administrador creado por defecto: admin@soc.com / Admin123!");
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