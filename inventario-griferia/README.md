# RKA - Sistema de Gestión de Inventario de Grifería

Sistema web de gestión de inventario para grifería, desarrollado con HTML/CSS/JavaScript vanilla, organizado por módulos.

## Características

- **Autenticación**: Login con usuario y contraseña, recuperación de contraseña con pregunta de seguridad.
- **Dashboard**: Estadísticas en tiempo real (Total productos, Entradas, Salidas, Stock bajo).
- **Inventario**: Listado completo con filtros por categoría, estado y búsqueda.
- **Productos**: Gestión CRUD completa (código, categoría, proveedor, stock, precio).
- **Categorías**: Administración de categorías.
- **Proveedores**: Registro y gestión de proveedores.
- **Movimientos**: Historial de entradas y salidas con control de stock.
- **Clientes**: Base de datos de clientes.
- **Reportes**: Exportación a CSV (Inventario, Movimientos, Stock bajo).
- **Configuración**: Datos de la empresa.

## Estructura del proyecto

```
inventario-griferia/
├── .vscode/settings.json
├── index.html                      # Punto de entrada (auth guard)
├── auth/
│   ├── login.html
│   └── recuperar-contrasena.html
├── pages/
│   ├── dashboard.html
│   ├── inventario.html
│   ├── productos.html
│   ├── categorias.html
│   ├── proveedores.html
│   ├── movimientos.html
│   ├── clientes.html
│   ├── reportes.html
│   └── configuracion.html
├── assets/
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── utilities.css
│   │   └── auth.css
│   └── js/
│       ├── auth/
│       │   ├── auth-core.js
│       │   ├── login.js
│       │   └── recuperar-contrasena.js
│       ├── core/
│       │   ├── app-core.js
│       │   ├── layout.js
│       │   └── storage-service.js
│       └── modules/
│           ├── dashboard.js
│           ├── inventario.js
│           ├── productos.js
│           ├── categorias.js
│           ├── proveedores.js
│           ├── movimientos.js
│           ├── clientes.js
│           ├── reportes.js
│           └── configuracion.js
└── README.md
```

## Cómo usar

1. Abre `index.html` en tu navegador (o usa Live Server en VS Code).
2. Credenciales por defecto:
   - Usuario: `admin`
   - Contraseña: `admin`

   **Usuario por defecto: `admin` — Contraseña: `admin`**
3. Recuperación de contraseña: pregunta `¿Color favorito?`, respuesta `azul`.

Los datos se guardan en `localStorage` del navegador.
