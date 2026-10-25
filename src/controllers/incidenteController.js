const IncidenteModel = require("../models/incidenteModel");
const SEVERIDADES = ["Baja", "Media", "Alta", "Crítica"];
const ESTADOS = ["Abierto", "En progreso", "Cerrado"];

function validarIncidente(body, parcial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "El cuerpo de la solicitud debe ser un objeto.";
  }
  const permitidos = ["titulo", "descripcion", "severidad", "estado"];
  if (Object.keys(body).some((campo) => !permitidos.includes(campo))) {
    return "La solicitud contiene campos no permitidos.";
  }
  if (!parcial && (!Object.hasOwn(body, "titulo") || !Object.hasOwn(body, "severidad"))) {
    return "El título y la severidad son obligatorios.";
  }
  if (parcial && Object.keys(body).length === 0) {
    return "Indica al menos un campo para actualizar.";
  }
  if (Object.hasOwn(body, "titulo")
    && (typeof body.titulo !== "string" || !body.titulo.trim() || body.titulo.trim().length > 120)) {
    return "El título es obligatorio y no puede superar 120 caracteres.";
  }
  if (Object.hasOwn(body, "descripcion")
    && (typeof body.descripcion !== "string" || body.descripcion.length > 10000)) {
    return "La descripción debe ser texto y no puede superar 10000 caracteres.";
  }
  if (Object.hasOwn(body, "severidad") && !SEVERIDADES.includes(body.severidad)) {
    return "La severidad no es válida.";
  }
  if (Object.hasOwn(body, "estado") && !ESTADOS.includes(body.estado)) {
    return "El estado no es válido.";
  }
  return null;
}

function validarId(valor) {
  if (!/^[1-9]\d*$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) ? id : null;
}

async function listarIncidentes(req, res, next) {
  try {
    const incidentes = await IncidenteModel.obtenerTodos(req.usuario);
    res.json(incidentes);
  } catch (error) {
    next(error);
  }
}

async function crearIncidente(req, res, next) {
  try {
    const errorValidacion = validarIncidente(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const nuevoIncidente = await IncidenteModel.crear({
      titulo: req.body.titulo.trim(),
      descripcion: req.body.descripcion || "",
      severidad: req.body.severidad,
      estado: req.body.estado || "Abierto",
      usuarioId: req.usuario.id
    });

    res.status(201).json(nuevoIncidente);
  } catch (error) {
    next(error);
  }
}

async function actualizarIncidente(req, res, next) {
  try {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido." });
    const errorValidacion = validarIncidente(req.body, true);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const datos = { ...req.body };
    if (Object.hasOwn(datos, "titulo")) datos.titulo = datos.titulo.trim();
    const incidente = await IncidenteModel.actualizar(id, datos, req.usuario);
    if (!incidente) return res.status(404).json({ error: "Incidente no encontrado." });
    res.json(incidente);
  } catch (error) {
    next(error);
  }
}

async function eliminarIncidente(req, res, next) {
  try {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido." });

    const eliminados = await IncidenteModel.eliminar(id, req.usuario);
    if (eliminados === 0) {
      return res.status(404).json({ error: "Incidente no encontrado." });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarIncidentes,
  crearIncidente,
  actualizarIncidente,
  eliminarIncidente
};