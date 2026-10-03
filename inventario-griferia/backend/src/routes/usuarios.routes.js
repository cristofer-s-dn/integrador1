const express = require("express");
const pool = require("../config/db");
const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Mapeo de roles: etiqueta de la interfaz <-> nombre en la base de datos       */
/* -------------------------------------------------------------------------- */
const ROL_UI_A_DB = {
  Administrador: "administrador",
  Vendedor: "vendedor",
  "Jefe General": "jefe_general",
  "Jefa de Tienda": "jefa_tienda",
  "Subjefe de Tienda": "subjefe_tienda",
  "Personal de Almacén": "personal_almacen",
};

const ROL_DB_A_UI = Object.fromEntries(
  Object.entries(ROL_UI_A_DB).map(([ui, db]) => [db, ui])
);

/**
 * Devuelve el id_rol en BD a partir de la etiqueta de rol del frontend
 * ("Personal de Almacén") o de un id numérico enviado directamente.
 */
async function resolverIdRol(rol, idRol) {
  if (idRol !== undefined && idRol !== null && idRol !== "") {
    const n = Number(idRol);
    if (Number.isFinite(n)) return n;
  }
  if (!rol) return null;

  const slug = ROL_UI_A_DB[rol] || (ROL_DB_A_UI[rol] ? rol : null);
  if (!slug) return null;

  const { rows } = await pool.query(
    "SELECT id_rol FROM roles WHERE nombre_rol = $1 LIMIT 1",
    [slug]
  );
  return rows[0] ? rows[0].id_rol : null;
}

const SELECT_USUARIOS = `
    SELECT u.id_usuario, u.nombres, u.apellidos, u.tipo_de_documento, u.dni,
           u.usuario_login, u.contrasena, u.correo, u.nacionalidad, u.estado,
           u.fecha_creacion, u.ultimo_acceso, u.id_rol, r.nombre_rol
      FROM usuarios u
      LEFT JOIN roles r ON r.id_rol = u.id_rol`;

/** Convierte una fila de BD al modelo que consume el frontend. */
function mapUsuario(row) {
  if (!row) return null;
  return {
    id: row.id_usuario,
    nombres: row.nombres || "",
    apellidos: row.apellidos || "",
    tipoDocumento: row.tipo_de_documento || "dni",
    numDocumento: row.dni || "",
    usuario: row.usuario_login || "",
    contrasena: row.contrasena || "",
    email: row.correo || "",
    nacionalidad: row.nacionalidad || "Peruana",
    estado: !row.estado || row.estado === "activo" ? "Activo" : "Inactivo",
    idRol: row.id_rol,
    rol: ROL_DB_A_UI[row.nombre_rol] || row.nombre_rol || "",
    creadoEn: row.fecha_creacion,
    ultimoAcceso: row.ultimo_acceso,
  };
}

function errorDeLlave(err, res) {
  if (err.code === "23505") {
    const campo = (err.detail || "").replace(/^Key \((.+?)\)=.*$/, "$1");
    return res.status(409).json({
      error: `Ya existe un usuario con ese dato (${campo || "valor duplicado"}).`,
    });
  }
  return res.status(500).json({ error: err.message });
}

/* -------------------------------------------------------------------------- */
/* GET /api/usuarios  -> listado completo (Gestión de Usuarios / Roles)         */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_USUARIOS} ORDER BY u.id_usuario`);
    res.json(rows.map(mapUsuario));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/usuarios/:id                                                       */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_USUARIOS} WHERE u.id_usuario = $1`, [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(mapUsuario(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/usuarios  -> crear colaborador                                    */
/* -------------------------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const {
      nombres, apellidos, tipoDocumento, tipo_de_documento,
      numDocumento, dni, nacionalidad, email, correo,
      usuario, usuario_login, contrasena, rol, id_rol,
    } = req.body;

    const idRol = await resolverIdRol(rol, id_rol);

    const { rows } = await pool.query(
      `INSERT INTO usuarios
         (nombres, apellidos, tipo_de_documento, dni, usuario_login, contrasena,
          correo, nacionalidad, id_rol, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'activo')
       RETURNING id_usuario`,
      [
        nombres,
        apellidos || "",
        tipoDocumento || tipo_de_documento || "dni",
        numDocumento || dni || "",
        usuario || usuario_login,
        contrasena,
        email || correo || null,
        nacionalidad || "Peruana",
        idRol,
      ]
    );

    const { rows: creados } = await pool.query(
      `${SELECT_USUARIOS} WHERE u.id_usuario = $1`,
      [rows[0].id_usuario]
    );
    res.status(201).json(mapUsuario(creados[0]));
  } catch (err) {
    errorDeLlave(err, res);
  }
});

/* -------------------------------------------------------------------------- */
/* PUT /api/usuarios/:id  -> editar colaborador                                */
/* -------------------------------------------------------------------------- */
router.put("/:id", async (req, res) => {
  try {
    const {
      nombres, apellidos, tipoDocumento, tipo_de_documento,
      numDocumento, dni, nacionalidad, email, correo,
      usuario, usuario_login, contrasena, rol, id_rol, estado,
    } = req.body;

    const idRol = await resolverIdRol(rol, id_rol);
    const est = (estado || "Activo").toString().toLowerCase() === "activo"
      ? "activo"
      : "inactivo";

    const { rowCount } = await pool.query(
      `UPDATE usuarios
          SET nombres          = COALESCE($1, nombres),
              apellidos        = COALESCE($2, apellidos),
              tipo_de_documento = COALESCE($3, tipo_de_documento),
              dni              = COALESCE($4, dni),
              usuario_login    = COALESCE($5, usuario_login),
              correo           = COALESCE($6, correo),
              nacionalidad     = COALESCE($7, nacionalidad),
              contrasena       = COALESCE($8, contrasena),
              id_rol           = COALESCE($9, id_rol),
              estado           = $10
        WHERE id_usuario = $11`,
      [
        nombres, apellidos,
        tipoDocumento || tipo_de_documento || null,
        numDocumento || dni || null,
        usuario || usuario_login || null,
        email || correo || null,
        nacionalidad || null,
        contrasena || null,
        idRol,
        est,
        req.params.id,
      ]
    );

    if (!rowCount) return res.status(404).json({ error: "Usuario no encontrado." });

    const { rows } = await pool.query(`${SELECT_USUARIOS} WHERE u.id_usuario = $1`, [
      req.params.id,
    ]);
    res.json(mapUsuario(rows[0]));
  } catch (err) {
    errorDeLlave(err, res);
  }
});

/* -------------------------------------------------------------------------- */
/* DELETE /api/usuarios/:id                                                    */
/* -------------------------------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM usuarios WHERE id_usuario = $1",
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json({ ok: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/usuarios/login  -> autentica con correo institucional             */
/*                                 (o usuario) + contraseña provisional        */
/* -------------------------------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { identificador, usuario, usuario_login, correo, contrasena } = req.body;
    const id = String(
      identificador || usuario || usuario_login || correo || ""
    ).trim();

    if (!id || !contrasena) {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    }

    const { rows } = await pool.query(
      `${SELECT_USUARIOS}
        WHERE (LOWER(u.correo) = LOWER($1) OR LOWER(u.usuario_login) = LOWER($1))
          AND u.contrasena = $2
        LIMIT 1`,
      [id, contrasena]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const data = mapUsuario(rows[0]);
    if (data.estado !== "Activo") {
      return res.status(403).json({ error: "El usuario está inactivo. Contacta al administrador." });
    }

    await pool.query(
      "UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1",
      [rows[0].id_usuario]
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
