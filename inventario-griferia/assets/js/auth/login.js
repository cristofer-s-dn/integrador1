import { AuthService } from "./auth-core.js";
import "../core/input-guard.js";

(function initLogin() {
  const authService = new AuthService();
  authService.redirectIfAuthenticated("../pages/dashboard.html");

  const loginForm = document.getElementById("loginForm");
  const inputUsuario = document.getElementById("inputUsuario");
  const inputContrasena = document.getElementById("inputContrasena");
  const btnTogglePassword = document.getElementById("btnTogglePassword");
  const chkRecordarme = document.getElementById("chkRecordarme");
  const loginAlert = document.getElementById("loginAlert");
  const btnLogin = document.getElementById("btnLogin");
  const authYear = document.getElementById("authYear");

  if (authYear) authYear.textContent = new Date().getFullYear().toString();

  if (btnTogglePassword && inputContrasena) {
    btnTogglePassword.addEventListener("click", () => {
      const isPassword = inputContrasena.type === "password";
      inputContrasena.type = isPassword ? "text" : "password";
      const icon = btnTogglePassword.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-eye", !isPassword);
        icon.classList.toggle("bi-eye-slash", isPassword);
      }
      btnTogglePassword.setAttribute("aria-pressed", String(isPassword));
    });
  }

  [inputUsuario, inputContrasena].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      hideAlert();
      const feedbackEl = document.querySelector(`[data-feedback="${input.name}"]`);
      if (feedbackEl) feedbackEl.textContent = "";
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const usuario = inputUsuario?.value.trim() || "";
      const contrasena = inputContrasena?.value || "";
      const recordar = chkRecordarme?.checked || false;

      let hasError = false;
      if (!usuario) {
        setFieldFeedback(inputUsuario, "El correo institucional o usuario es obligatorio.");
        hasError = true;
      }
      if (!contrasena) {
        setFieldFeedback(inputContrasena, "La contraseña es obligatoria.");
        hasError = true;
      }
      if (hasError) return;

      setLoading(true);
      try {
        const result = await authService.loginConApi(usuario, contrasena, recordar);
        if (result.success) {
          window.location.replace("../pages/dashboard.html");
        } else {
          showAlert(result.message || "No se pudo iniciar sesión.");
          setLoading(false);
          inputContrasena?.focus();
        }
      } catch (_err) {
        showAlert("No se pudo conectar con el servidor. Inténtalo nuevamente.");
        setLoading(false);
      }
    });
  }

  function setLoading(loading) {
    if (!btnLogin) return;
    btnLogin.disabled = loading;
    const text = btnLogin.querySelector(".btn-text");
    const spinner = btnLogin.querySelector(".btn-spinner");
    if (text) text.classList.toggle("d-none", loading);
    if (spinner) spinner.classList.toggle("d-none", !loading);
  }

  function showAlert(message) {
    if (!loginAlert) return;
    loginAlert.textContent = message;
    loginAlert.classList.remove("d-none");
  }

  function hideAlert() {
    if (!loginAlert) return;
    loginAlert.classList.add("d-none");
    loginAlert.textContent = "";
  }

  function setFieldFeedback(input, message) {
    if (!input) return;
    const feedbackEl = document.querySelector(`[data-feedback="${input.name}"]`);
    if (feedbackEl) feedbackEl.textContent = message;
  }
})();
