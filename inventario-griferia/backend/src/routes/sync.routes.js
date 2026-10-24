const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Devuelve los datos en el mismo formato que usa el frontend (appData),
// para que la página pueda cargarse desde la base de datos.
router.get("/", async (req, res) => {
  try {
    const cats = await pool.query("SELECT id_categoria AS id, nombre_categoria AS nombre, descripcion FROM categorias ORDER BY id_categoria");
    const provs = await pool.query("SELECT id_proveedor AS id, nombre_proveedor AS nombre, telefono, correo AS email, direccion FROM proveedores ORDER BY id_proveedor");
    const prods = await pool.query(`
      SELECT p.id_producto AS id, p.codigo_producto AS codigo, p.nombre_producto AS nombre,
             p.descripcion, p.id_categoria AS "categoriaId", p.id_proveedor AS "proveedorId",
             p.stock_actual AS stock, p.stock_minimo AS "stockMinimo", p.precio_venta AS precio,
             p.precio_compra AS "precioCompra", p.precio_compra AS precio_compra, p.precio_venta AS "precioVenta"
      FROM productos p ORDER BY p.id_producto`);
    const clis = await pool.query("SELECT id_cliente AS id, nombre, contacto, telefono, correo AS email, direccion FROM clientes ORDER BY id_cliente");
    const movs = await pool.query(`
      SELECT m.id_movimiento AS id, m.fecha_hora AS fecha, t.nombre_tipo AS tipo,
             m.id_producto AS "productoId", m.cantidad, mo.nombre_motivo AS motivo,
             COALESCE(u.nombres, 'Admin') AS usuario
      FROM movimientos m
      LEFT JOIN tipo_movimiento t ON t.id_tipo_movimiento = m.id_tipo_movimiento
      LEFT JOIN motivo_movimiento mo ON mo.id_motivo = m.id_motivo
      LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario_registro
      ORDER BY m.fecha_hora DESC`);

    // Normalizar ids a string y campos a tipos del frontend
    const norm = (rows, idFields) => rows.map((r) => {
      const o = { ...r };
      for (const f of idFields) if (o[f] != null) o[f] = String(o[f]);
      return o;
    });

    res.json({
      productos: norm(prods.rows, ["id", "categoriaId", "proveedorId"]),
      categorias: norm(cats.rows, ["id"]),
      proveedores: norm(provs.rows, ["id"]),
      clientes: norm(clis.rows, ["id"]),
      movimientos: norm(movs.rows, ["id", "productoId"]),
      configuracion: {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sincroniza (reemplaza) los datos enviados por el frontend en PostgreSQL.
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { categorias = [], proveedores = [], productos = [], clientes = [], movimientos = [] } = req.body || {};

    await client.query("BEGIN");
    await client.query("TRUNCATE movimientos, producto_proveedor, productos, clientes, proveedores, categorias RESTART IDENTITY CASCADE");

    // 1) Categorías
    const mapCat = {};
    for (const c of categorias) {
      const r = await client.query(
        "INSERT INTO categorias (nombre_categoria, descripcion) VALUES ($1,$2) RETURNING id_categoria",
        [c.nombre || c.nombre_categoria || "", c.descripcion || ""]
      );
      mapCat[c.id] = r.rows[0].id_categoria;
    }

    // 2) Proveedores
    const mapProv = {};
    for (const p of proveedores) {
      const r = await client.query(
        "INSERT INTO proveedores (nombre_proveedor, ruc, telefono, correo, direccion) VALUES ($1,$2,$3,$4,$5) RETURNING id_proveedor",
        [p.nombre || p.nombre_proveedor || "", p.ruc || "", p.telefono || "", p.email || p.correo || "", p.direccion || ""]
      );
      mapProv[p.id] = r.rows[0].id_proveedor;
    }

    // 3) Clientes
    for (const c of clientes) {
      await client.query(
        "INSERT INTO clientes (nombre, contacto, telefono, correo, direccion) VALUES ($1,$2,$3,$4,$5)",
        [c.nombre || "", c.contacto || "", c.telefono || "", c.email || c.correo || "", c.direccion || ""]
      );
    }

    // 4) Productos
    const mapProd = {};
    for (const p of productos) {
      const catId = mapCat[p.categoriaId] || null;
      const provId = mapProv[p.proveedorId] || null;
      const r = await client.query(
        "INSERT INTO productos (codigo_producto, nombre_producto, descripcion, id_categoria, id_proveedor, stock_actual, stock_minimo, precio_venta, precio_compra, estado) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_producto",
        [p.codigo || p.codigo_producto || "", p.nombre || p.nombre_producto || "", p.descripcion || "", catId, provId, p.stock ?? p.stock_actual ?? 0, p.stockMinimo ?? p.stock_minimo ?? 5, p.precio ?? p.precio_venta ?? p.precioVenta ?? 0, p.precio_compra ?? p.precioCompra ?? 0, p.estado || "activo"]
      );
      mapProd[p.id] = r.rows[0].id_producto;
    }

    // 5) Movimientos
    for (const m of movimientos) {
      const prodId = mapProd[m.productoId] || mapProd[m.id_producto] || null;
      if (!prodId) continue;

      const tipoRes = await client.query("SELECT id_tipo_movimiento FROM tipo_movimiento WHERE nombre_tipo = $1", [m.tipo || "salida"]);
      const idTipo = tipoRes.rows[0]?.id_tipo_movimiento || null;

      let idMotivo = null;
      if (m.motivo) {
        const motRes = await client.query("SELECT id_motivo FROM motivo_movimiento WHERE nombre_motivo = $1", [m.motivo]);
        idMotivo = motRes.rows[0]?.id_motivo || null;
      }

      let idUsuario = null;
      if (m.usuario) {
        const uRes = await client.query("SELECT id_usuario FROM usuarios WHERE LOWER(usuario_login) = LOWER($1) OR LOWER(nombres) = LOWER($1) LIMIT 1", [m.usuario]);
        idUsuario = uRes.rows[0]?.id_usuario || null;
      }

      await client.query(
        "INSERT INTO movimientos (fecha_hora, id_tipo_movimiento, id_producto, cantidad, id_motivo, observacion, id_usuario_registro) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [m.fecha || m.fecha_hora || new Date(), idTipo, prodId, m.cantidad ?? 0, idMotivo, m.observacion || m.motivo || "", idUsuario]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, message: "Datos sincronizados con PostgreSQL" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
