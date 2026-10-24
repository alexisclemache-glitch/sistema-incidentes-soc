const express = require("express");
const router = express.Router();
const { listarIncidentes, crearIncidente, eliminarIncidente } = require("../controllers/incidenteController");

router.get("/", listarIncidentes);
router.post("/", crearIncidente);
router.delete("/:id", eliminarIncidente);

module.exports = router;