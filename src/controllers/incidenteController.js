const IncidenteModel = require("../models/incidenteModel");

// 1. GET - Listar incidentes
async function listarIncidentes(req, res, next) {
  try {
    const incidentes = await IncidenteModel.obtenerTodos();
    res.json(incidentes);
  } catch (error) {
    next(error);
  }
}

// 2. POST - Crear incidente
async function crearIncidente(req, res, next) {
  try {
    const { titulo, descripcion, severidad } = req.body;

    // Validación de entrada
    if (!titulo || typeof titulo !== "string" || titulo.trim() === "") {
      return res.status(400).json({ error: "El campo 'titulo' es obligatorio y debe ser texto." });
    }

    const nuevoIncidente = await IncidenteModel.crear({
      titulo,
      descripcion,
      severidad,
      usuarioId: req.usuario ? req.usuario.id : null
    });

    res.status(201).json(nuevoIncidente); // Código 201 (Created)
  } catch (error) {
    next(error);
  }
}

// 3. DELETE - Eliminar incidente
async function eliminarIncidente(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const eliminados = await IncidenteModel.eliminar(id);
    if (eliminados === 0) {
      return res.status(404).json({ error: "Incidente no encontrado." });
    }

    res.status(204).send(); // Código 204 (No Content)
  } catch (error) {
    next(error);
  }
}

module.exports = { listarIncidentes, crearIncidente, eliminarIncidente };