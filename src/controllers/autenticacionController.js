const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UsuarioModel = require("../models/usuarioModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCredenciales(email, password) {
  return typeof email === "string"
    && email.length <= 120
    && EMAIL_REGEX.test(email)
    && typeof password === "string"
    && Buffer.byteLength(password, "utf8") >= 12
    && Buffer.byteLength(password, "utf8") <= 72;
}

function emitirToken(usuario) {
  const token = jwt.sign(
    { email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET,
    {
      subject: String(usuario.id),
      issuer: "sistema-incidentes-soc",
      audience: "sistema-incidentes-soc",
      expiresIn: "8h"
    }
  );
  return {
    token,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    }
  };
}

async function registrar(req, res, next) {
  try {
    const { email, password, nombre } = req.body || {};
    if (!validarCredenciales(email, password)
      || typeof nombre !== "string"
      || !nombre.trim()
      || nombre.trim().length > 100) {
      return res.status(400).json({
        error: "Indica un correo válido, un nombre y una contraseña de 12 a 72 bytes."
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const existente = await UsuarioModel.buscarPorEmail(emailNormalizado);
    if (existente) return res.status(409).json({ error: "El correo ya está registrado." });

    const passwordHash = await bcrypt.hash(password, 12);
    const usuario = await UsuarioModel.crear({
      email: emailNormalizado,
      passwordHash,
      nombre: nombre.trim()
    });
    res.status(201).json(emitirToken(usuario));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "El correo ya está registrado." });
    }
    next(error);
  }
}

async function iniciarSesion(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string"
      || email.length > 120
      || typeof password !== "string"
      || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    }

    const usuario = await UsuarioModel.buscarPorEmail(email.trim().toLowerCase());
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    res.json(emitirToken(usuario));
  } catch (error) {
    next(error);
  }
}

function obtenerSesion(req, res) {
  res.json({ usuario: req.usuario });
}

module.exports = { registrar, iniciarSesion, obtenerSesion };
