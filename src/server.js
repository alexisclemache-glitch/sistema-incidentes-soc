require("dotenv").config();
const app = require("./app");
const { inicializarBaseDeDatos } = require("./db");

const PORT = process.env.PORT || 3000;

function validarConfiguracion() {
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
    throw new Error("JWT_SECRET es obligatorio y debe tener al menos 32 bytes.");
  }
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" && (!adminEmail || !adminPassword)) {
    throw new Error("ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios en producción.");
  }
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error("ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse juntos.");
  }
  if (adminEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)
    || adminEmail.length > 120)) {
    throw new Error("ADMIN_EMAIL debe ser una dirección válida de hasta 120 caracteres.");
  }
  if (adminPassword
    && (Buffer.byteLength(adminPassword, "utf8") < 12 || Buffer.byteLength(adminPassword, "utf8") > 72)) {
    throw new Error("ADMIN_PASSWORD debe tener entre 12 y 72 bytes.");
  }
  if (process.env.PUBLIC_BASE_URL && !process.env.PUBLIC_BASE_URL.startsWith("https://")) {
    throw new Error("PUBLIC_BASE_URL debe comenzar con https://.");
  }
}

try {
  validarConfiguracion();
} catch (error) {
  console.error("Configuración inválida:", error.message);
  process.exit(1);
}

inicializarBaseDeDatos()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor SOC escuchando en el puerto ${PORT}.`);
    });
  })
  .catch((err) => {
    console.error("Fallo al iniciar la base de datos:", err.message);
    process.exit(1);
  });