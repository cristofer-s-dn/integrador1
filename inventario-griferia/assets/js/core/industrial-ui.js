/**
 * industrial-ui.js
 * Sistema de Notificaciones Toast y Diálogos Modales (UI Industrial) para RKA ERP.
 * Reemplaza completamente los alerts y confirms nativos del navegador.
 */

// ---------------------------------------------------------------------------
// 1. IndustrialToast: Notificaciones compactas
// ---------------------------------------------------------------------------
export class IndustrialToast {
  static _container = null;

  static _ensureContainer() {
    if (!this._container || !document.body.contains(this._container)) {
      this._container = document.createElement("div");
      this._container.id = "industrial-toast-container";
      this._container.className = "toast-container";
      this._container.setAttribute("role", "region");
      this._container.setAttribute("aria-label", "Notificaciones del sistema");
      document.body.appendChild(this._container);
    }
    return this._container;
  }

  static show({ message, type = "info", duration = 3800 }) {
    const container = this._ensureContainer();

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "alert");

    const icons = {
      success: "bi-check-circle-fill",
      error: "bi-x-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      info: "bi-info-circle-fill",
    };

    const iconClass = icons[type] || icons.info;

    toast.innerHTML = `
      <i class="bi ${iconClass} toast__icon"></i>
      <div class="toast__content">
        <span class="toast__message">${this._escapeHTML(message)}</span>
      </div>
      <button class="toast__close" aria-label="Cerrar notificación">&times;</button>
    `;

    const closeBtn = toast.querySelector(".toast__close");
    let timer = null;

    const dismiss = () => {
      if (timer) clearTimeout(timer);
      toast.classList.add("toast--hiding");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    };

    closeBtn.addEventListener("click", dismiss);

    if (duration > 0) {
      timer = setTimeout(dismiss, duration);
    }

    container.appendChild(toast);
    return { dismiss };
  }

  static success(message, duration = 3500) {
    return this.show({ message, type: "success", duration });
  }

  static error(message, duration = 4500) {
    return this.show({ message, type: "error", duration });
  }

  static warning(message, duration = 4000) {
    return this.show({ message, type: "warning", duration });
  }

  static info(message, duration = 3500) {
    return this.show({ message, type: "info", duration });
  }

  static _escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

// ---------------------------------------------------------------------------
// 2. IndustrialDialog: Modales de Confirmación y Alerta
// ---------------------------------------------------------------------------
export class IndustrialDialog {
  /**
   * Muestra un diálogo de confirmación moderno Promise-based
   * @param {Object} options
   * @param {string} options.title - Título del diálogo
   * @param {string} options.message - Mensaje principal
   * @param {string} [options.confirmText="Aceptar"] - Texto del botón de confirmación
   * @param {string} [options.cancelText="Cancelar"] - Texto del botón cancelar
   * @param {"primary"|"danger"|"warning"} [options.confirmVariant="primary"] - Variante del botón
   * @param {Array<{label: string, value: any}>} [options.details] - Fila de detalles para confirmación segura
   * @returns {Promise<boolean>} Resuelve a true si el usuario confirma, false si cancela
   */
  static confirm({
    title = "Confirmar acción",
    message = "¿Está seguro de continuar?",
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    confirmVariant = "primary",
    details = [],
  } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "dialog-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");

      const variantBtnClass = confirmVariant === "danger"
        ? "btn btn-danger"
        : confirmVariant === "warning"
        ? "btn btn-warning"
        : "btn btn-primary";

      let detailsHtml = "";
      if (details && details.length > 0) {
        detailsHtml = `
          <div class="dialog__details-table">
            ${details
              .map(
                (d) => `
              <div class="dialog__details-row">
                <span class="dialog__details-label">${this._escapeHTML(d.label)}</span>
                <span class="dialog__details-value font-mono">${this._escapeHTML(String(d.value ?? "—"))}</span>
              </div>`
              )
              .join("")}
          </div>
        `;
      }

      backdrop.innerHTML = `
        <div class="dialog__window" tabindex="-1">
          <header class="dialog__header">
            <h3 class="dialog__title">${this._escapeHTML(title)}</h3>
            <button class="dialog__close" aria-label="Cerrar diálogo">&times;</button>
          </header>
          <div class="dialog__body">
            <p class="dialog__message">${this._escapeHTML(message)}</p>
            ${detailsHtml}
          </div>
          <footer class="dialog__footer">
            <button type="button" class="btn btn-outline dialog__btn-cancel">${this._escapeHTML(cancelText)}</button>
            <button type="button" class="${variantBtnClass} dialog__btn-confirm">${this._escapeHTML(confirmText)}</button>
          </footer>
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.classList.add("overflow-hidden");

      const windowEl = backdrop.querySelector(".dialog__window");
      const btnCancel = backdrop.querySelector(".dialog__btn-cancel");
      const btnConfirm = backdrop.querySelector(".dialog__btn-confirm");
      const btnClose = backdrop.querySelector(".dialog__close");

      const cleanup = (result) => {
        document.removeEventListener("keydown", onKeyDown);
        backdrop.classList.add("dialog-backdrop--closing");
        setTimeout(() => {
          if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
          }
          if (!document.querySelector(".dialog-backdrop, .modal.is-open")) {
            document.body.classList.remove("overflow-hidden");
          }
          resolve(result);
        }, 150);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cleanup(false);
        } else if (e.key === "Enter" && document.activeElement === btnConfirm) {
          e.preventDefault();
          cleanup(true);
        }
      };

      btnCancel.addEventListener("click", () => cleanup(false));
      btnClose.addEventListener("click", () => cleanup(false));
      btnConfirm.addEventListener("click", () => cleanup(true));

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          cleanup(false);
        }
      });

      document.addEventListener("keydown", onKeyDown);
      setTimeout(() => btnConfirm.focus(), 50);
    });
  }

  /**
   * Muestra un diálogo informativo/alerta Promise-based
   * @param {Object} options
   * @param {string} options.title - Título del diálogo
   * @param {string} options.message - Mensaje
   * @param {string} [options.confirmText="Entendido"]
   * @param {"primary"|"warning"|"danger"} [options.variant="primary"]
   * @returns {Promise<void>}
   */
  static alert({
    title = "Información",
    message = "",
    confirmText = "Entendido",
    variant = "primary",
  } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "dialog-backdrop";
      backdrop.setAttribute("role", "alertdialog");
      backdrop.setAttribute("aria-modal", "true");

      const variantBtnClass = variant === "danger"
        ? "btn btn-danger"
        : variant === "warning"
        ? "btn btn-warning"
        : "btn btn-primary";

      backdrop.innerHTML = `
        <div class="dialog__window" tabindex="-1">
          <header class="dialog__header">
            <h3 class="dialog__title">${this._escapeHTML(title)}</h3>
            <button class="dialog__close" aria-label="Cerrar diálogo">&times;</button>
          </header>
          <div class="dialog__body">
            <p class="dialog__message">${this._escapeHTML(message)}</p>
          </div>
          <footer class="dialog__footer">
            <button type="button" class="${variantBtnClass} dialog__btn-confirm">${this._escapeHTML(confirmText)}</button>
          </footer>
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.classList.add("overflow-hidden");

      const btnConfirm = backdrop.querySelector(".dialog__btn-confirm");
      const btnClose = backdrop.querySelector(".dialog__close");

      const cleanup = () => {
        document.removeEventListener("keydown", onKeyDown);
        backdrop.classList.add("dialog-backdrop--closing");
        setTimeout(() => {
          if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
          }
          if (!document.querySelector(".dialog-backdrop, .modal.is-open")) {
            document.body.classList.remove("overflow-hidden");
          }
          resolve();
        }, 150);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          cleanup();
        }
      };

      btnConfirm.addEventListener("click", cleanup);
      btnClose.addEventListener("click", cleanup);

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          cleanup();
        }
      });

      document.addEventListener("keydown", onKeyDown);
      setTimeout(() => btnConfirm.focus(), 50);
    });
  }

  static _escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

// ---------------------------------------------------------------------------
// 3. Polyfill seguro de respaldo para evitar cualquier alert() o confirm() nativo
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  window.IndustrialToast = IndustrialToast;
  window.IndustrialDialog = IndustrialDialog;

  // Si algún script invoca window.alert, lo mostramos como toast o modal
  const _originalAlert = window.alert;
  window.alert = function (message) {
    if (typeof message === "string" && message.length < 90) {
      IndustrialToast.error(message);
    } else {
      IndustrialDialog.alert({
        title: "Aviso del Sistema",
        message: String(message || ""),
        confirmText: "Entendido",
      });
    }
  };

  window.systemConfirm = (options) => IndustrialDialog.confirm(typeof options === "string" ? { message: options } : options);
  window.systemAlert = (options) => IndustrialDialog.alert(typeof options === "string" ? { message: options } : options);
}
