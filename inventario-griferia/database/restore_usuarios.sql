-- ============================================================================
-- restore_usuarios.sql
-- Restaura los colaboradores de "Gestión de Usuarios / Roles" que se
-- eliminaron directamente en la base de datos (fuera del sistema).
-- Respeta los ID originales para no perder las referencias de movimientos.
-- Uso: psql -U postgres -d rkal_inventario -f database/restore_usuarios.sql
-- ============================================================================

INSERT INTO usuarios
  (id_usuario, nombres, apellidos, tipo_de_documento, dni, usuario_login,
   contrasena, correo, nacionalidad, id_rol, estado, fecha_creacion)
VALUES
  (3, 'María',   'González',          'dni', '12345678', 'maria',
   'maria123',            'm.gonzalez@rkal.com',   'Peruana', 2, 'activo', '2024-04-10'),
  (4, 'Carlos',  'Pérez',             'dni', '23456789', 'carlos',
   'carlos123',           'c.perez@rkal.com',      'Peruana', 3, 'activo', '2024-04-10'),
  (5, 'Ana',     'López',             'dni', '34567890', 'ana',
   'ana123',              'a.lopez@rkal.com',      'Peruana', 4, 'activo', '2024-04-10'),
  (7, 'Sofía',   'Rodríguez Vílchez', 'dni', '76321458', 's.rodriguez',
   'rodriguez.sofia_2026','s.rodriguez@rkal.com',  'Peruana', 4, 'activo', '2024-06-01'),
  (8, 'Franco',  'Herrera Quispe',    'dni', '48903217', 'f.herrera',
   'herrera.franco_2026', 'f.herrera@rkal.com',    'Peruana', 5, 'activo', '2025-01-20'),
  (9, 'Miguel',  'Juarez Torrealva',  'dni', '70154892', 'm.juarez',
   'juarez.miguel_2026',  'm.juarez@rkal.com',     'Peruana', 6, 'activo', '2025-08-05')
ON CONFLICT (id_usuario) DO NOTHING;

-- La secuencia debe continuar después del mayor ID existente
SELECT setval(
  pg_get_serial_sequence('usuarios', 'id_usuario'),
  GREATEST((SELECT COALESCE(MAX(id_usuario), 1) FROM usuarios), 1),
  true
);

-- Verificación
SELECT u.id_usuario,
       u.nombres || ' ' || u.apellidos       AS colaborador,
       u.correo                              AS correo_institucional,
       u.contrasena                          AS contrasena_provisional,
       COALESCE(r.nombre_rol, '-')           AS rol,
       u.estado
  FROM usuarios u
  LEFT JOIN roles r ON r.id_rol = u.id_rol
 ORDER BY u.id_usuario;
