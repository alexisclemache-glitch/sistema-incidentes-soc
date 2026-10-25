const { pool } = require("../db");

const UsuarioModel = {
  async buscarPorEmail(email) {
    const { rows } = await pool.query(
      "SELECT id, email, password, nombre, rol FROM usuarios WHERE email = $1",
      [email]
    );
    return rows[0] || null;
  },

  async crear({ email, passwordHash, nombre }) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (email, password, nombre, rol)
       VALUES ($1, $2, $3, 'ANALISTA')
       RETURNING id, email, nombre, rol`,
      [email, passwordHash, nombre]
    );
    return rows[0];
  }
};

module.exports = UsuarioModel;
