require("dotenv").config();
const app = require("./app");
const { inicializarBaseDeDatos } = require("./db");

const PORT = process.env.PORT || 3000;

inicializarBaseDeDatos()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor SOC ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Fallo al iniciar BD:", err);
    process.exit(1);
  });