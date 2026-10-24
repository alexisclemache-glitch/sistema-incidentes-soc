const { pool } = require("../db");

const IncidenteModel = {
  // Obtener todos los incidentes con el nombre de usuario que lo reportó
  async obtenerTodos() {
    const { rows } = await pool.query(`
      SELECT i.*, u.nombre AS reportado_por 
      FROM incidentes i 
      LEFT JOIN usuarios u ON i.usuario_id = u.id 
      ORDER BY i.id DESC
    `);
    return rows;
  },

  // Crear un nuevo incidente en la base de datos (con consultas parametrizadas contra Inyección SQL)
  async crear(datos) {
    const { titulo, descripcion, severidad, usuarioId } = datos;
    const severidadesValidas = ["Baja", "Media", "Alta", "Crítica"];
    const sev = severidadesValidas.includes(severidad) ? severidad : "Media";

    const { rows } = await pool.query(
      `INSERT INTO incidentes (titulo, descripcion, severidad, estado, usuario_id) 
       VALUES ($1, $2, $3, 'Abierto', $4) RETURNING *`,
      [titulo.trim(), descripcion || "", sev, usuarioId || null]
    );
    return rows[0];
  },

  // Eliminar un incidente por su ID
  async eliminar(id) {
    const { rowCount } = await pool.query("DELETE FROM incidentes WHERE id = $1", [id]);
    return rowCount;
  }
};

module.exports = IncidenteModel;