const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const categoriasRoutes = require("./routes/categorias.routes");
const productosRoutes = require("./routes/productos.routes");
const proveedoresRoutes = require("./routes/proveedores.routes");
const clientesRoutes = require("./routes/clientes.routes");
const movimientosRoutes = require("./routes/movimientos.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const syncRoutes = require("./routes/sync.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Servir el frontend estático (carpeta del proyecto, un nivel arriba de backend)
app.use(express.static(path.join(__dirname, "..", "..")));

// Rutas API
app.use("/api/categorias", categoriasRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/movimientos", movimientosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/sync", syncRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "RKA API" });
});

module.exports = app;
