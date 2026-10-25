const express = require("express");
const router = express.Router();
const {
  listarIncidentes,
  crearIncidente,
  actualizarIncidente,
  eliminarIncidente
} = require("../controllers/incidenteController");
const { requerirAutenticacion } = require("../middleware/autenticacion");

router.use(requerirAutenticacion);
router.get("/", listarIncidentes);
router.post("/", crearIncidente);
router.put("/:id", actualizarIncidente);
router.delete("/:id", eliminarIncidente);

module.exports = router;