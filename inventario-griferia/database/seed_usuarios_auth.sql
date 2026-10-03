-- ============================================================================
-- seed_usuarios_auth.sql
-- Usuarios institucionales del módulo "Gestión de Usuarios / Roles"
-- Toda la información (correo institucional + contraseña provisional) queda
-- en PostgreSQL para que cada colaborador pueda iniciar sesión en el sistema.
-- Uso: psql -U postgres -d rkal_inventario -f database/seed_usuarios_auth.sql
-- ============================================================================

-- 1) Nuevas columnas para la información completa del colaborador ------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo         VARCHAR(160);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nacionalidad   VARCHAR(80) DEFAULT 'Peruana';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso  TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_uk ON usuarios (correo) WHERE correo IS NOT NULL;

-- 2) Roles del módulo (si no existieran) -------------------------------------
INSERT INTO roles (nombre_rol, descripcion, estado) VALUES
  ('jefe_general',    'Jefe General de la tienda',      'activo'),
  ('jefa_tienda',     'Jefa de Tienda',                 'activo'),
  ('subjefe_tienda',  'Subjefe de Tienda',              'activo'),
  ('personal_almacen','Personal de Almacén',            'activo')
ON CONFLICT (nombre_rol) DO NOTHING;

-- 3) Cuenta por defecto (admin / admin) --------------------------------------
UPDATE usuarios
   SET correo = 'admin@rkal.com', nacionalidad = 'Peruana', estado = 'activo'
 WHERE usuario_login = 'admin';

-- 4) Colaboradores visibles en "Gestión de Usuarios / Roles" ----------------
INSERT INTO usuarios
  (nombres, apellidos, tipo_de_documento, dni, usuario_login, contrasena,
   correo, nacionalidad, id_rol, estado, fecha_creacion)
VALUES
  ('Ricardo', 'Rubio Naupari',   'dni', '45218793', 'r.rubio',   'rubio.ricardo_2026',
   'r.rubio@rkal.com',   'Peruana', (SELECT id_rol FROM roles WHERE nombre_rol = 'jefe_general'),     'activo', '2024-03-12'),
  ('Sofía',   'Rodríguez Vílchez','dni','76321458', 's.rodriguez','rodriguez.sofia_2026',
   's.rodriguez@rkal.com','Peruana', (SELECT id_rol FROM roles WHERE nombre_rol = 'jefa_tienda'),      'activo', '2024-06-01'),
  ('Franco',  'Herrera Quispe',  'dni', '48903217', 'f.herrera', 'herrera.franco_2026',
   'f.herrera@rkal.com', 'Peruana', (SELECT id_rol FROM roles WHERE nombre_rol = 'subjefe_tienda'),   'activo', '2025-01-20'),
  ('Miguel',  'Juarez Torrealva','dni', '70154892', 'm.juarez',  'juarez.miguel_2026',
   'm.juarez@rkal.com',  'Peruana', (SELECT id_rol FROM roles WHERE nombre_rol = 'personal_almacen'), 'activo', '2025-08-05')
ON CONFLICT (usuario_login) DO UPDATE
   SET nombres     = EXCLUDED.nombres,
       apellidos   = EXCLUDED.apellidos,
       correo      = EXCLUDED.correo,
       contrasena  = EXCLUDED.contrasena,
       nacionalidad= EXCLUDED.nacionalidad,
       id_rol      = EXCLUDED.id_rol,
       estado      = EXCLUDED.estado;

-- 5) Usuarios de ejemplo previos -> correo institucional y nacionalidad -----
UPDATE usuarios SET correo = 'j.rubio@rkal.com',   nacionalidad = 'Peruana' WHERE usuario_login = 'jairo';
UPDATE usuarios SET correo = 'm.gonzalez@rkal.com', nacionalidad = 'Peruana' WHERE usuario_login = 'maria';
UPDATE usuarios SET correo = 'c.perez@rkal.com',    nacionalidad = 'Peruana' WHERE usuario_login = 'carlos';
UPDATE usuarios SET correo = 'a.lopez@rkal.com',    nacionalidad = 'Peruana' WHERE usuario_login = 'ana';

-- 6) Verificación ------------------------------------------------------------
SELECT u.id_usuario,
       u.nombres || ' ' || u.apellidos        AS colaborador,
       u.correo                                AS correo_institucional,
       u.contrasena                            AS contrasena_provisional,
       COALESCE(r.nombre_rol, '-')             AS rol,
       u.estado,
       u.ultimo_acceso
  FROM usuarios u
  LEFT JOIN roles r ON r.id_rol = u.id_rol
 ORDER BY u.id_usuario;
