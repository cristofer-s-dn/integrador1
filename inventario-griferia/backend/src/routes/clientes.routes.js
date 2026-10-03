const express = require("express");
const pool = require("../config/db");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clientes ORDER BY id_cliente");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clientes WHERE id_cliente = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nombre, contacto, telefono, correo, email, direccion } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO clientes (nombre, contacto, telefono, correo, direccion) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [nombre, contacto, telefono, correo || email, direccion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nombre, contacto, telefono, correo, email, direccion } = req.body;
    const { rows } = await pool.query(
      "UPDATE clientes SET nombre=$1, contacto=$2, telefono=$3, correo=$4, direccion=$5 WHERE id_cliente=$6 RETURNING *",
      [nombre, contacto, telefono, correo || email, direccion, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM clientes WHERE id_cliente = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "No encontrado" });
    res.json({ message: "Cliente eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
