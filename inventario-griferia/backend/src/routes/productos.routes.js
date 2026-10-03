const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Listar productos con categoría y proveedor
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.nombre_categoria AS categoria_nombre, pr.nombre_proveedor AS proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
      ORDER BY p.id_producto
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM productos WHERE id_producto = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { codigo_producto, nombre_producto, descripcion, id_categoria, id_proveedor, stock_actual, stock_minimo, precio_compra, precio_venta, estado } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO productos (codigo_producto, nombre_producto, descripcion, id_categoria, id_proveedor, stock_actual, stock_minimo, precio_compra, precio_venta, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [codigo_producto, nombre_producto, descripcion, id_categoria, id_proveedor, stock_actual ?? 0, stock_minimo ?? 5, precio_compra ?? 0, precio_venta ?? 0, estado || 'activo']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { codigo_producto, nombre_producto, descripcion, id_categoria, id_proveedor, stock_actual, stock_minimo, precio_compra, precio_venta, estado } = req.body;
    const { rows } = await pool.query(
      `UPDATE productos SET codigo_producto=$1, nombre_producto=$2, descripcion=$3, id_categoria=$4, id_proveedor=$5,
       stock_actual=$6, stock_minimo=$7, precio_compra=$8, precio_venta=$9, estado=$10 WHERE id_producto=$11 RETURNING *`,
      [codigo_producto, nombre_producto, descripcion, id_categoria, id_proveedor, stock_actual, stock_minimo, precio_compra, precio_venta, estado, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM productos WHERE id_producto = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Producto eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
