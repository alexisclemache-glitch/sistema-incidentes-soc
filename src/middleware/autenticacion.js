const jwt = require("jsonwebtoken");

async function requerirAutenticacion(req, res, next) {
  const [tipo, token] = (req.get("authorization") || "").split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ error: "Se requiere iniciar sesión." });
  }

  try {
    const carga = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "sistema-incidentes-soc",
      audience: "sistema-incidentes-soc"
    });
    const id = Number(carga.sub);
    if (!Number.isSafeInteger(id) || id < 1 || !["ADMIN", "ANALISTA"].includes(carga.rol)) {
      return res.status(401).json({ error: "La sesión no es válida." });
    }

    req.usuario = { id, email: carga.email, nombre: carga.nombre, rol: carga.rol };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "La sesión no es válida o ha expirado." });
    }
    next(error);
  }
}

module.exports = { requerirAutenticacion };
