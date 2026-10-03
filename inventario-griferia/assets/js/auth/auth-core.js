import { StorageService } from "../core/storage-service.js";

/**
 * AuthService
 * Gestiona autenticación, usuarios, sesiones y recuperación de contraseña
 */
export class AuthService {
  static STORAGE_KEYS = {
    USERS: "users",
    CURRENT_USER: "currentUser",
    SESSION: "session",
    REMEMBER_ME: "rememberMe",
    PASSWORD_RECOVERY: "passwordRecovery",
  };

  static SESSION_TTL_MS = 24 * 60 * 60 * 1000;

  constructor() {
    this._ensureDefaultUser();
  }

  _ensureDefaultUser() {
    const users = this.getUsers();
    const adminExists = users.some((user) => user.usuario === "admin");
    if (!adminExists) {
      users.push({
        id: this._generateId(),
        usuario: "admin",
        nombre: "Administrador",
        correo: "admin@rkal.com",
        contrasena: "admin",
        preguntaSeguridad: "¿Color favorito?",
        respuestaSeguridad: "azul",
        rol: "administrador",
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
      });
      StorageService.setItem(AuthService.STORAGE_KEYS.USERS, users);
    }
  }

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  }

  getUsers() {
    return StorageService.getItem(AuthService.STORAGE_KEYS.USERS, []);
  }

  saveUsers(users) {
    if (!Array.isArray(users)) return;
    StorageService.setItem(AuthService.STORAGE_KEYS.USERS, users);
  }

  findUserByIdentifier(identificador) {
    if (!identificador) return null;
    const normalized = identificador.trim().toLowerCase();
    return (
      this.getUsers().find(
        (user) =>
          user.usuario?.toLowerCase() === normalized ||
          user.correo?.toLowerCase() === normalized
      ) || null
    );
  }

  login(identificador, contrasena, recordar = false) {
    const user = this.findUserByIdentifier(identificador);
    if (!user) {
      return { success: false, message: "Usuario o contraseña incorrectos." };
    }
    if (user.contrasena !== contrasena) {
      return { success: false, message: "Usuario o contraseña incorrectos." };
    }

    const now = Date.now();
    const session = {
      userId: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol || "usuario",
      loginAt: now,
      expiresAt: now + AuthService.SESSION_TTL_MS,
    };

    const currentUserSafe = {
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol || "usuario",
      preguntaSeguridad: user.preguntaSeguridad || "",
    };

    StorageService.setItem(AuthService.STORAGE_KEYS.CURRENT_USER, currentUserSafe);
    StorageService.setItem(AuthService.STORAGE_KEYS.SESSION, session);
    StorageService.setItem(AuthService.STORAGE_KEYS.REMEMBER_ME, Boolean(recordar));

    return { success: true, message: "Inicio de sesión exitoso", user: currentUserSafe };
  }

  /**
   * loginConApi
   * Autentica contra PostgreSQL (POST /api/usuarios/login) usando el correo
   * institucional o el usuario, más la contraseña provisional.
   * - 200 -> sincroniza el usuario en la caché local y crea la sesión.
   * - 401/403 -> devuelve el mensaje de error del servidor.
   * - Sin conexión -> valida contra la caché local (modo respaldo).
   */
  async loginConApi(identificador, contrasena, recordar = false) {
    try {
      const resp = await fetch("/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, contrasena }),
      });

      if (resp.ok) {
        const apiUser = await resp.json();
        this._syncUsuarioLocal(apiUser);
        return this.login(identificador, contrasena, recordar);
      }

      if (resp.status === 401 || resp.status === 403) {
        let message = "Correo o contraseña incorrectos.";
        try {
          const body = await resp.json();
          if (body && body.error) message = body.error;
        } catch (_e) {
          /* respuesta sin cuerpo JSON */
        }
        return { success: false, message };
      }
      // 5xx u otro fallo: se intenta con la caché local
    } catch (_e) {
      // Sin backend disponible: respaldo local
    }

    return this.login(identificador, contrasena, recordar);
  }

  /**
   * cargarUsuariosDesdeApi
   * Descarga el listado de colaboradores desde PostgreSQL (/api/usuarios) y lo
   * sincroniza con la caché local, para que la recuperación de contraseña y el
   * modo sin conexión vean a todos los usuarios registrados en la base de datos.
   */
  async cargarUsuariosDesdeApi() {
    try {
      const resp = await fetch("/api/usuarios");
      if (!resp.ok) return 0;
      const rows = await resp.json();
      if (!Array.isArray(rows)) return 0;
      rows.forEach((u) => this._syncUsuarioLocal(u));
      this.depurarUsuariosApi(rows);
      return rows.length;
    } catch (_e) {
      return 0;
    }
  }

  /**
   * depurarUsuariosApi
   * Elimina de la caché local a los colaboradores que ya no existen en
   * PostgreSQL (baja del sistema). Solo toca los que fueron sincronizados
   * desde la API (`_api: true`), nunca los creados sin conexión.
   */
  depurarUsuariosApi(filasApi) {
    if (!Array.isArray(filasApi)) return;
    const ids = new Set(filasApi.map((u) => String(u.id)));
    const correos = new Set(filasApi.map((u) => (u.email || "").toLowerCase()));
    const logins = new Set(filasApi.map((u) => u.usuario));

    const users = this.getUsers();
    const vivos = users.filter((u) => {
      if (!u._api) return true;
      return (
        ids.has(String(u.id)) ||
        correos.has((u.correo || "").toLowerCase()) ||
        logins.has(u.usuario)
      );
    });

    if (vivos.length !== users.length) this.saveUsers(vivos);
  }

  /** Guarda (o actualiza) un usuario devuelto por la API en la caché local. */
  _syncUsuarioLocal(apiUser) {
    if (!apiUser) return;
    const users = this.getUsers();
    const correo = (apiUser.email || "").toLowerCase();
    const idx = users.findIndex(
      (u) =>
        (correo && (u.correo || "").toLowerCase() === correo) ||
        (apiUser.usuario && u.usuario === apiUser.usuario) ||
        String(u.id) === String(apiUser.id)
    );

    const registro = {
      id: apiUser.id != null ? String(apiUser.id) : this._generateId(),
      usuario: apiUser.usuario,
      nombre: [apiUser.nombres, apiUser.apellidos].filter(Boolean).join(" "),
      correo: apiUser.email,
      contrasena: apiUser.contrasena,
      rol: apiUser.rol,
      tipoDocumento: apiUser.tipoDocumento,
      numDocumento: apiUser.numDocumento,
      nacionalidad: apiUser.nacionalidad,
      preguntaSeguridad: "¿Color favorito?",
      respuestaSeguridad: "azul",
      _api: true,
      actualizadoEn: new Date().toISOString(),
    };

    if (idx >= 0) users[idx] = { ...users[idx], ...registro };
    else users.push(registro);

    this.saveUsers(users);
  }

  logout() {
    StorageService.removeItem(AuthService.STORAGE_KEYS.CURRENT_USER);
    StorageService.removeItem(AuthService.STORAGE_KEYS.SESSION);
    StorageService.removeItem(AuthService.STORAGE_KEYS.REMEMBER_ME);
    StorageService.removeItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY);
  }

  isAuthenticated() {
    const session = StorageService.getItem(AuthService.STORAGE_KEYS.SESSION, null);
    if (!session) return false;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      this.logout();
      return false;
    }
    return true;
  }

  getCurrentUser() {
    if (!this.isAuthenticated()) return null;
    return StorageService.getItem(AuthService.STORAGE_KEYS.CURRENT_USER, null);
  }

  getSession() {
    if (!this.isAuthenticated()) return null;
    return StorageService.getItem(AuthService.STORAGE_KEYS.SESSION, null);
  }

  renewSession() {
    const session = this.getSession();
    if (!session) return;
    session.expiresAt = Date.now() + AuthService.SESSION_TTL_MS;
    StorageService.setItem(AuthService.STORAGE_KEYS.SESSION, session);
  }

  iniciarRecuperacionContrasena(identificador) {
    const user = this.findUserByIdentifier(identificador);
    if (!user) {
      return {
        success: false,
        message: "No se encontró ninguna cuenta con ese usuario o correo electrónico.",
      };
    }

    const recoveryData = {
      userId: user.id,
      usuario: user.usuario,
      correo: user.correo,
      preguntaSeguridad: user.preguntaSeguridad || "",
      respuestaSeguridad: user.respuestaSeguridad || "",
      verified: false,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    StorageService.setItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY, recoveryData);

    return {
      success: true,
      message: "Cuenta encontrada. Responde la pregunta de seguridad.",
      userData: {
        usuario: user.usuario,
        correo: user.correo,
        preguntaSeguridad: user.preguntaSeguridad || "",
      },
    };
  }

  verificarRespuestaSeguridad(respuesta) {
    const recovery = StorageService.getItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY, null);
    if (!recovery) {
      return { success: false, message: "El proceso de recuperación ha expirado. Vuelve a intentarlo." };
    }
    if (Date.now() > recovery.expiresAt) {
      StorageService.removeItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY);
      return { success: false, message: "El proceso de recuperación ha expirado. Vuelve a intentarlo." };
    }

    const respuestaNormalizada = (respuesta || "").trim();
    if (respuestaNormalizada !== (recovery.respuestaSeguridad || "")) {
      return { success: false, message: "La respuesta de seguridad no es correcta. Inténtalo nuevamente." };
    }

    recovery.verified = true;
    StorageService.setItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY, recovery);
    return { success: true, message: "Identidad verificada correctamente." };
  }

  restablecerContrasena(nuevaContrasena) {
    if (!nuevaContrasena || nuevaContrasena.length < 6) {
      return { success: false, message: "La contraseña debe tener al menos 6 caracteres." };
    }

    const recovery = StorageService.getItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY, null);
    if (!recovery) {
      return { success: false, message: "El proceso de recuperación no es válido. Vuelve a iniciar el proceso." };
    }
    if (Date.now() > recovery.expiresAt) {
      StorageService.removeItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY);
      return { success: false, message: "El proceso de recuperación ha expirado. Vuelve a intentarlo." };
    }
    if (!recovery.verified) {
      return { success: false, message: "Debes verificar tu identidad antes de cambiar la contraseña." };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === recovery.userId);
    if (userIndex === -1) {
      StorageService.removeItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY);
      return { success: false, message: "No se encontró el usuario para restablecer la contraseña." };
    }

    users[userIndex].contrasena = nuevaContrasena;
    users[userIndex].actualizadoEn = new Date().toISOString();
    this.saveUsers(users);
    StorageService.removeItem(AuthService.STORAGE_KEYS.PASSWORD_RECOVERY);

    return { success: true, message: "Contraseña restablecida correctamente." };
  }

  requireAuth(loginPath) {
    const resolvedPath = loginPath || "../auth/login.html";
    if (!this.isAuthenticated()) {
      window.location.replace(resolvedPath);
    }
  }

  redirectIfAuthenticated(dashboardPath) {
    const resolvedPath = dashboardPath || "../pages/dashboard.html";
    if (this.isAuthenticated()) {
      window.location.replace(resolvedPath);
    }
  }
}
