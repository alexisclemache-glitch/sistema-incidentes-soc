const { pool } = require("../db");

const IncidenteModel = {
  async obtenerTodos(usuario) {
    const { rows } = await pool.query(`
      SELECT i.*, u.nombre AS reportado_por 
      FROM incidentes i 
      LEFT JOIN usuarios u ON i.usuario_id = u.id 
      WHERE ($1::boolean OR i.usuario_id = $2)
      ORDER BY i.id DESC
    `, [usuario.rol === "ADMIN", usuario.id]);
    return rows;
  },

  async crear(datos) {
    const { titulo, descripcion, severidad, estado, usuarioId } = datos;
    const { rows } = await pool.query(
      `INSERT INTO incidentes (titulo, descripcion, severidad, estado, usuario_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [titulo, descripcion, severidad, estado, usuarioId]
    );
    return rows[0];
  },

  async actualizar(id, datos, usuario) {
    const campos = ["titulo", "descripcion", "severidad", "estado"];
    const valores = campos.map((campo) => datos[campo] ?? null);
    const { rows } = await pool.query(
      `UPDATE incidentes SET
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        severidad = COALESCE($3, severidad),
        estado = COALESCE($4, estado),
        actualizado_en = NOW()
       WHERE id = $5 AND ($6::boolean OR usuario_id = $7)
       RETURNING *`,
      [...valores, id, usuario.rol === "ADMIN", usuario.id]
    );
    return rows[0] || null;
  },

  async eliminar(id, usuario) {
    const { rowCount } = await pool.query(
      "DELETE FROM incidentes WHERE id = $1 AND ($2::boolean OR usuario_id = $3)",
      [id, usuario.rol === "ADMIN", usuario.id]
    );
    return rowCount;
  }
};

module.exports = IncidenteModel;