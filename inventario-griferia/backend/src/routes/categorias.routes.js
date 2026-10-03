const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Listar categorías
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categorias ORDER BY id_categoria");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener categoría por id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categorias WHERE id_categoria = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear categoría
router.post("/", async (req, res) => {
  try {
    const { nombre_categoria, descripcion, nombre } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO categorias (nombre_categoria, descripcion) VALUES ($1,$2) RETURNING *",
      [nombre_categoria || nombre, descripcion || ""]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar categoría
router.patch("/:id", async (req, res) => {
  try {
    const { nombre_categoria, descripcion } = req.body;
    const { rows } = await pool.query(
      "UPDATE categorias SET nombre_categoria = COALESCE($1, nombre_categoria), descripcion = COALESCE($2, descripcion) WHERE id_categoria = $3 RETURNING *",
      [nombre_categoria, descripcion, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM categorias WHERE id_categoria = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "No encontrado" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
