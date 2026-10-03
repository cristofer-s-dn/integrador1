import { AuthService } from "../auth/auth-core.js";

/**
 * LayoutManager
 * Gestiona sidebar, topbar, navegación entre secciones y búsqueda global
 */
export class LayoutManager {
  constructor() {
    this.authService = new AuthService();
    this.sidebar = document.getElementById("sidebar");
    this.sidebarToggle = document.getElementById("sidebarToggle");
    this.mobileMenuToggle = document.getElementById("mobileMenuToggle");
    this.sidebarBackdrop = document.getElementById("sidebarBackdrop");
    this.navLinks = document.querySelectorAll(".nav-link[data-section]");
    this.contentSections = document.querySelectorAll(".content-section");
    this.globalSearch = document.getElementById("globalSearch");
    this.userProfileBtn = document.getElementById("userProfileBtn");
    this.userProfileMenu = document.getElementById("userProfileMenu");
    this.btnLogout = document.getElementById("btnLogout");
    this.lblUserName = document.getElementById("lblUserName");
    this.lblUserNameMenu = document.getElementById("lblUserNameMenu");
    this.lblUserEmail = document.getElementById("lblUserEmail");
    this.userAvatar = document.getElementById("userAvatar");
    this.currentSection = this._getInitialSection();
  }

  init() {
    this._applyUserInfo();
    this._bindSidebarEvents();
    this._bindNavigationEvents();
    this._bindGlobalSearch();
    this._bindUserMenuEvents();
    this._setActiveSection(this.currentSection);
    this._handleResponsiveSidebar();
  }

  setActiveSection(sectionId) {
    this._setActiveSection(sectionId);
  }

  _applyUserInfo() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const nombre = currentUser.nombre || currentUser.usuario || "Usuario";
    const correo = currentUser.correo || "";

    if (this.lblUserName) this.lblUserName.textContent = nombre;
    if (this.lblUserNameMenu) this.lblUserNameMenu.textContent = nombre;
    if (this.lblUserEmail) this.lblUserEmail.textContent = correo;

    if (this.userAvatar) {
      this.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0D6EFD&color=fff&bold=true`;
      this.userAvatar.alt = `Avatar de ${nombre}`;
    }
  }

  _getInitialSection() {
    const hash = window.location.hash.replace("#", "");
    const validSections = Array.from(this.contentSections).map((s) => s.id);
    return validSections.includes(hash) ? hash : "dashboard";
  }

  _bindSidebarEvents() {
    this.sidebarToggle?.addEventListener("click", () => this._toggleSidebarCollapse());
    this.mobileMenuToggle?.addEventListener("click", () => this._openMobileSidebar());
    this.sidebarBackdrop?.addEventListener("click", () => this._closeMobileSidebar());
    window.addEventListener("resize", () => this._handleResponsiveSidebar());
  }

  _toggleSidebarCollapse() {
    if (!this.sidebar) return;
    const isCollapsed = this.sidebar.classList.toggle("is-collapsed");
    localStorage.setItem("rkal_sidebar_collapsed", isCollapsed ? "1" : "0");
  }

  _openMobileSidebar() {
    this.sidebar?.classList.add("is-open");
    this.sidebarBackdrop?.classList.add("is-visible");
    document.body.classList.add("overflow-hidden");
  }

  _closeMobileSidebar() {
    this.sidebar?.classList.remove("is-open");
    this.sidebarBackdrop?.classList.remove("is-visible");
    document.body.classList.remove("overflow-hidden");
  }

  _handleResponsiveSidebar() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) this._closeMobileSidebar();

    const collapsed = localStorage.getItem("rkal_sidebar_collapsed") === "1";
    if (this.sidebar && !isMobile) {
      this.sidebar.classList.toggle("is-collapsed", collapsed);
    } else if (this.sidebar) {
      this.sidebar.classList.remove("is-collapsed");
    }
  }

  _bindNavigationEvents() {
    this.navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href && href.includes(".html")) {
          return; // Navegación a otra página
        }
        e.preventDefault();
        const sectionId = link.dataset.section;
        if (!sectionId) return;
        this._setActiveSection(sectionId);
        window.location.hash = `#${sectionId}`;
        if (window.innerWidth <= 768) this._closeMobileSidebar();
      });
    });

    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) this._setActiveSection(hash);
    });
  }

  _setActiveSection(sectionId) {
    this.contentSections.forEach((section) => {
      section.classList.toggle("is-active", section.id === sectionId);
    });

    this.navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.section === sectionId);
    });

    this.currentSection = sectionId;

    document.dispatchEvent(
      new CustomEvent("sectionChange", { detail: { sectionId } })
    );
  }

  _bindGlobalSearch() {
    this.globalSearch?.addEventListener("input", (e) => {
      const term = e.target.value.trim().toLowerCase();
      document.dispatchEvent(new CustomEvent("globalSearch", { detail: { term } }));
    });

    this.globalSearch?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.target.value = "";
        e.target.blur();
        document.dispatchEvent(new CustomEvent("globalSearch", { detail: { term: "" } }));
      }
    });
  }

  _bindUserMenuEvents() {
    this.userProfileBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.userProfileMenu?.classList.toggle("is-open");
    });

    document.addEventListener("click", (e) => {
      if (!this.userProfileMenu?.contains(e.target) && !this.userProfileBtn?.contains(e.target)) {
        this.userProfileMenu?.classList.remove("is-open");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.userProfileMenu?.classList.remove("is-open");
    });

    this.btnLogout?.addEventListener("click", () => {
      this.authService.logout();
      window.location.replace("../auth/login.html");
    });
  }
}
