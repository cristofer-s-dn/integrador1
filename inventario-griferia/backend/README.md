# RKA - Backend (Node.js + Express + PostgreSQL)

Backend API y servidor para el Sistema de Gestión de Inventario de Grifería RKA.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Estructura

```
backend/
├── .env                # Variables de entorno (conexión a BD, puerto)
├── package.json
└── src/
    ├── server.js       # Punto de entrada (levanta Express)
    ├── app.js          # Configuración de Express, CORS, rutas y frontend estático
    ├── config/
    │   └── db.js       # Pool de conexión a PostgreSQL (pg)
    └── routes/
        ├── categorias.routes.js
        ├── productos.routes.js
        ├── proveedores.routes.js
        ├── clientes.routes.js
        ├── movimientos.routes.js   # Incluye transacción que actualiza stock
        └── usuarios.routes.js      # CRUD básico + /login
```

## Base de datos

Los scripts SQL están en `../database/`:
- `schema.sql` — crea las tablas.
- `seed.sql` — inserta datos de ejemplo.
- `queries.sql` — consultas útiles.

Para crear la base y cargar datos:
```bash
psql -U postgres -h localhost -c "CREATE DATABASE rkal_inventario;"
psql -U postgres -h localhost -d rkal_inventario -f database/schema.sql
psql -U postgres -h localhost -d rkal_inventario -f database/seed.sql
```

## Cómo ejecutar el backend

```bash
cd backend
npm install
npm start        # o: node src/server.js
```

Luego:
- API: `http://localhost:3000/api/health`
- Frontend: `http://localhost:3000/index.html`

## Endpoints principales

| Recurso | GET | POST | PUT | DELETE |
|---|---|---|---|---|
| `/api/categorias` | ✓ | ✓ | PATCH `/api/categorias/:id` | DELETE `/api/categorias/:id` |
| `/api/productos` | ✓ | ✓ | PUT `/api/productos/:id` | DELETE `/api/productos/:id` |
| `/api/proveedores` | ✓ | ✓ | PUT `/api/proveedores/:id` | DELETE `/api/proveedores/:id` |
| `/api/clientes` | ✓ | ✓ | PUT `/api/clientes/:id` | DELETE `/api/clientes/:id` |
| `/api/movimientos` | ✓ | ✓ | — | DELETE `/api/movimientos/:id` |
| `/api/usuarios` | ✓ | ✓ | — | — |
| `/api/usuarios/login` | — | POST | — | — |

## Nota sobre el frontend

El frontend actual (`pages/`, `assets/`) funciona de forma autónoma con `localStorage`, por lo que sigue operativo sin backend. Para conectarlo a la API solo hay que cambiar las llamadas de `assets/js/core/storage-service.js`/`app-core.js` por peticiones `fetch` a `/api/*`.
