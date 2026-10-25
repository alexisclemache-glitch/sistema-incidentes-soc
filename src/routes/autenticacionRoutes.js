const express = require("express");
const {
  registrar,
  iniciarSesion,
  obtenerSesion
} = require("../controllers/autenticacionController");
const { requerirAutenticacion } = require("../middleware/autenticacion");

const router = express.Router();

router.post("/registro", registrar);
router.post("/sesion", iniciarSesion);
router.get("/sesion", requerirAutenticacion, obtenerSesion);

module.exports = router;
