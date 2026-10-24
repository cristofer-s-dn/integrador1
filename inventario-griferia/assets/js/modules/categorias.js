import { AppCore } from "../core/app-core.js";
import { LayoutManager } from "../core/layout.js";
import { ActionSheet } from "../core/action-sheet.js";
import { Validations } from "../core/validations.js";
import { IndustrialToast, IndustrialDialog } from "../core/industrial-ui.js";

(function initCategoriasModule() {
  const appCore = new AppCore();
  const layoutManager = new LayoutManager();
  const actionSheet = new ActionSheet();

  appCore.initAuthGuard();
  layoutManager.init();

  let appData = AppCore.loadAppData();
  AppCore.loadSampleDataIfEmpty(appData);

  const tbody = document.getElementById("categoriasTableBody");
  const btnNuevaCategoria = document.getElementById("btnNuevaCategoria");
  const modalCategoria = document.getElementById("modalCategoria");
  const modalCategoriaCerrar = document.getElementById("modalCategoriaCerrar");
  const btnCancelarCategoria = document.getElementById("btnCancelarCategoria");
  const formCategoria = document.getElementById("formCategoria");
  const modalCategoriaTitulo = document.getElementById("modalCategoriaTitulo");

  let editingId = null;

  function renderCategorias() {
    if (!tbody) return;
    if (appData.categorias.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5">
          <div class="empty-state">
            <i class="bi bi-folder empty-state__icon"></i>
            <p class="empty-state__text">No hay categorías registradas</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = appData.categorias
      .map((c) => {
        const count = appData.productos.filter((p) => p.categoriaId === c.id).length;
        return `
          <tr>
            <td class="text-center font-mono font-semibold text-muted">${c.id}</td>
            <td class="text-left font-medium text-slate-900">${c.nombre}</td>
            <td class="text-left text-muted">${c.descripcion || "—"}</td>
            <td class="text-right font-mono tabular-nums font-semibold">${count}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline" data-action="view" data-id="${c.id}"><i class="bi bi-eye"></i> Ver</button>
            </td>
          </tr>`;
      })
      .join("");
  }

  function openModal(categoria = null) {
    editingId = categoria ? categoria.id : null;
    if (modalCategoriaTitulo) modalCategoriaTitulo.textContent = categoria ? "Editar Categoría" : "Nueva Categoría";
    formCategoria?.reset();
    if (categoria) {
      document.getElementById("inputNombreCategoria").value = categoria.nombre || "";
      document.getElementById("inputDescripcionCategoria").value = categoria.descripcion || "";
    }
    modalCategoria?.classList.add("is-open");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal() {
    modalCategoria?.classList.remove("is-open");
    document.body.classList.remove("overflow-hidden");
    editingId = null;
  }

  formCategoria?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(formCategoria);
    const nombre = (formData.get("nombre") || "").trim();
    const descripcion = (formData.get("descripcion") || "").trim();

    const error = Validations.firstError([
      [Validations.required(nombre, 3), "El nombre es obligatorio y debe tener al menos 3 caracteres."],
      [!appData.categorias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== editingId), "Ya existe una categoría con ese nombre."],
    ]);
    if (error) {
      IndustrialToast.error(error);
      return;
    }

    const categoria = {
      id: editingId || `cat_${AppCore.generateId()}`,
      nombre,
      descripcion,
    };

    if (editingId) {
      const idx = appData.categorias.findIndex((c) => c.id === editingId);
      if (idx !== -1) appData.categorias[idx] = categoria;
      IndustrialToast.success(`Categoría "${nombre}" actualizada.`);
    } else {
      appData.categorias.push(categoria);
      IndustrialToast.success(`Categoría "${nombre}" creada.`);
    }

    AppCore.saveAppData(appData);
    closeModal();
    renderCategorias();
    document.dispatchEvent(new CustomEvent("dataUpdated"));
  });

  tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const categoria = appData.categorias.find((c) => c.id === id);
    if (!categoria) return;

    if (action === "view") {
      const count = appData.productos.filter((p) => p.categoriaId === id).length;
      actionSheet.open({
        title: categoria.nombre,
        fields: [
          { label: "ID", value: categoria.id },
          { label: "Descripción", value: categoria.descripcion || "—" },
          { label: "Productos Asociados", value: `${count} productos` },
        ],
        onEdit: () => openModal(categoria),
        onDelete: async () => {
          const hasProducts = appData.productos.some((p) => p.categoriaId === id);
          if (hasProducts) {
            IndustrialToast.warning("No se puede eliminar una categoría que tiene productos asociados.");
            return;
          }
          const confirmado = await IndustrialDialog.confirm({
            title: "Eliminar Categoría",
            message: `¿Estás seguro de que deseas eliminar la categoría "${categoria.nombre}"?`,
            confirmText: "Eliminar Categoría",
            confirmVariant: "danger",
            details: [
              { label: "ID Categoría", value: categoria.id },
              { label: "Nombre", value: categoria.nombre },
              { label: "Productos", value: `${count} asociados` },
            ],
          });

          if (confirmado) {
            appData.categorias = appData.categorias.filter((c) => c.id !== id);
            AppCore.saveAppData(appData);
            IndustrialToast.success(`Categoría "${categoria.nombre}" eliminada.`);
            renderCategorias();
            document.dispatchEvent(new CustomEvent("dataUpdated"));
          }
        },
      });
    }
  });

  btnNuevaCategoria?.addEventListener("click", () => openModal());
  modalCategoriaCerrar?.addEventListener("click", closeModal);
  btnCancelarCategoria?.addEventListener("click", closeModal);

  renderCategorias();
})();
