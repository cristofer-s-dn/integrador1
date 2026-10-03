const express = require("express");
const pool = require("../config/db");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM proveedores ORDER BY id_proveedor");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM proveedores WHERE id_proveedor = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nombre_proveedor, ruc, telefono, correo, direccion, nombre } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO proveedores (nombre_proveedor, ruc, telefono, correo, direccion) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [nombre_proveedor || nombre, ruc, telefono, correo, direccion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nombre_proveedor, ruc, telefono, correo, direccion, nombre } = req.body;
    const { rows } = await pool.query(
      "UPDATE proveedores SET nombre_proveedor=$1, ruc=$2, telefono=$3, correo=$4, direccion=$5 WHERE id_proveedor=$6 RETURNING *",
      [nombre_proveedor || nombre, ruc, telefono, correo, direccion, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM proveedores WHERE id_proveedor = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Proveedor eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
