const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const incidenteRoutes = require("./routes/incidenteRoutes");
const autenticacionRoutes = require("./routes/autenticacionRoutes");
const { pool } = require("./db");

const app = express();
const allowedOrigins = [
  process.env.PUBLIC_BASE_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.CORS_ORIGINS || ""
]
  .filter(Boolean)
  .flatMap((origins) => origins.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 31536000, includeSubDomains: true }
    : false
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origen no permitido por CORS."));
  }
}));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" || req.secure) return next();

  const publicUrl = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!publicUrl) {
    return res.status(426).json({ error: "Se requiere una conexión HTTPS." });
  }
  const destino = new URL(req.originalUrl, publicUrl);
  if (destino.protocol !== "https:") {
    return res.status(500).json({ error: "PUBLIC_BASE_URL debe usar HTTPS." });
  }
  res.redirect(308, destino.toString());
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/salud", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      estado: "UP",
      baseDeDatos: "Conectada",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Fallo la verificación de salud:", error.message);
    res.status(503).json({ estado: "DOWN", error: "Base de datos no disponible." });
  }
});

app.use("/api/auth", autenticacionRoutes);
app.use("/api/incidentes", incidenteRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode;
  if (status === 400) return res.status(400).json({ error: "La solicitud JSON no es válida." });
  if (status === 413) return res.status(413).json({ error: "La solicitud supera el límite de 1 MB." });
  if (err.message === "Origen no permitido por CORS.") {
    return res.status(403).json({ error: "Origen no permitido." });
  }
  console.error("Error de solicitud:", err.stack || err);
  res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;