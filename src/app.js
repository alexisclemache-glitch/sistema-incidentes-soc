const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const incidenteRoutes = require("./routes/incidenteRoutes");
const { pool } = require("./db");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/salud", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ estado: "UP", baseDeDatos: "Conectada", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ estado: "DOWN", error: error.message });
  }
});

app.use("/api/incidentes", incidenteRoutes);

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;