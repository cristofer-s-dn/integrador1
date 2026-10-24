import { AppCore } from "../core/app-core.js";
import { LayoutManager } from "../core/layout.js";
import { ActionSheet } from "../core/action-sheet.js";
import { Validations } from "../core/validations.js";
import { IndustrialToast, IndustrialDialog } from "../core/industrial-ui.js";

(function initMovimientosModule() {
  const appCore = new AppCore();
  const layoutManager = new LayoutManager();
  const actionSheet = new ActionSheet();

  appCore.initAuthGuard();
  layoutManager.init();

  let appData = AppCore.loadAppData();
  AppCore.loadSampleDataIfEmpty(appData);

  const tbody = document.getElementById("movimientosTableBody");
  const btnNuevoMovimiento = document.getElementById("btnNuevoMovimiento");
  const modalMovimiento = document.getElementById("modalMovimiento");
  const modalMovimientoCerrar = document.getElementById("modalMovimientoCerrar");
  const btnCancelarMovimiento = document.getElementById("btnCancelarMovimiento");
  const formMovimiento = document.getElementById("formMovimiento");

  function populateProductos() {
    const selectProductoMovimiento = document.getElementById("selectProductoMovimiento");
    if (selectProductoMovimiento) {
      selectProductoMovimiento.innerHTML =
        '<option value="">Seleccionar producto</option>' +
        appData.productos
          .map((p) => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock ?? 0})</option>`)
          .join("");
    }
  }

  function renderMovimientos() {
    if (!tbody) return;
    const movimientos = [...appData.movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (movimientos.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <i class="bi bi-arrow-left-right empty-state__icon"></i>
            <p class="empty-state__text">No hay movimientos registrados</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = movimientos
      .map((m) => {
        const producto = appData.productos.find((p) => p.id === m.productoId);
        const tipoClass = m.tipo === "entrada" ? "badge--success" : "badge--danger";
        const tipoLabel = m.tipo === "entrada" ? "Entrada" : "Salida";
        return `
          <tr>
            <td class="text-center font-mono text-muted">${AppCore.formatDate(m.fecha)}</td>
            <td class="text-center"><span class="badge ${tipoClass}">${tipoLabel}</span></td>
            <td class="text-left font-medium text-slate-900">${producto?.nombre || "N/A"}</td>
            <td class="text-right font-mono tabular-nums font-semibold">${m.cantidad || 0}</td>
            <td class="text-left text-muted">${m.motivo || "—"}</td>
            <td class="text-center text-muted">${m.usuario || "Admin"}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline" data-action="view" data-id="${m.id}"><i class="bi bi-eye"></i> Ver</button>
            </td>
          </tr>`;
      })
      .join("");
  }

  function openModal() {
    populateProductos();
    formMovimiento?.reset();
    modalMovimiento?.classList.add("is-open");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal() {
    modalMovimiento?.classList.remove("is-open");
    document.body.classList.remove("overflow-hidden");
  }

  formMovimiento?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(formMovimiento);
    const tipo = formData.get("tipo");
    const productoId = formData.get("productoId");
    const cantidad = parseInt(formData.get("cantidad"), 10);
    const motivo = (formData.get("motivo") || "").trim();

    const producto = appData.productos.find((p) => p.id === productoId);
    const movimientoError = Validations.firstError([
      [Validations.required(tipo) && (tipo === "entrada" || tipo === "salida"), "Selecciona un tipo de movimiento válido."],
      [Boolean(producto), "Selecciona un producto válido."],
      [Validations.isPositiveInt(formData.get("cantidad")), "La cantidad debe ser un número entero mayor a 0."],
      [Validations.required(motivo, 3), "El motivo es obligatorio (mínimo 3 caracteres)."],
    ]);
    if (movimientoError) {
      IndustrialToast.error(movimientoError);
      return;
    }
    if (tipo === "salida" && cantidad > (producto.stock || 0)) {
      IndustrialToast.warning("No hay suficiente stock para realizar la salida.");
      return;
    }

    if (tipo === "entrada") {
      producto.stock = (Number(producto.stock) || 0) + cantidad;
    } else {
      producto.stock = (Number(producto.stock) || 0) - cantidad;
    }

    appData.movimientos.push({
      id: AppCore.generateId(),
      fecha: new Date().toISOString(),
      tipo,
      productoId,
      cantidad,
      motivo,
      usuario: "Admin",
    });

    AppCore.saveAppData(appData);
    closeModal();
    IndustrialToast.success(`Movimiento de ${tipo === "entrada" ? "entrada" : "salida"} registrado correctamente.`);
    renderMovimientos();
    populateProductos();
    document.dispatchEvent(new CustomEvent("dataUpdated"));
  });

  tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const movimiento = appData.movimientos.find((m) => m.id === id);
    if (!movimiento) return;

    if (action === "view") {
      const producto = appData.productos.find((p) => p.id === movimiento.productoId);
      actionSheet.open({
        title: `${movimiento.tipo === "entrada" ? "Entrada" : "Salida"} - ${producto?.nombre || "N/A"}`,
        fields: [
          { label: "Fecha", value: AppCore.formatDateTime(movimiento.fecha) },
          { label: "Tipo", value: movimiento.tipo === "entrada" ? "Entrada" : "Salida" },
          { label: "Producto", value: producto?.nombre },
          { label: "Cantidad", value: `${movimiento.cantidad} UND` },
          { label: "Motivo", value: movimiento.motivo },
          { label: "Usuario", value: movimiento.usuario || "Admin" },
        ],
        onDelete: async () => {
          const confirmado = await IndustrialDialog.confirm({
            title: "Eliminar Movimiento",
            message: "¿Deseas eliminar este movimiento? Su efecto sobre el stock será revertido.",
            confirmText: "Eliminar y Revertir",
            confirmVariant: "danger",
            details: [
              { label: "Tipo", value: movimiento.tipo === "entrada" ? "Entrada" : "Salida" },
              { label: "Producto", value: producto?.nombre || "N/A" },
              { label: "Cantidad", value: `${movimiento.cantidad} UND` },
              { label: "Motivo", value: movimiento.motivo },
            ],
          });

          if (confirmado) {
            const p = appData.productos.find((x) => x.id === movimiento.productoId);
            if (p) {
              if (movimiento.tipo === "entrada") {
                p.stock = Math.max(0, (Number(p.stock) || 0) - (Number(movimiento.cantidad) || 0));
              } else {
                p.stock = (Number(p.stock) || 0) + (Number(movimiento.cantidad) || 0);
              }
            }
            appData.movimientos = appData.movimientos.filter((m) => m.id !== id);
            AppCore.saveAppData(appData);
            IndustrialToast.success("Movimiento eliminado y stock revertido.");
            renderMovimientos();
            populateProductos();
            document.dispatchEvent(new CustomEvent("dataUpdated"));
          }
        },
      });
    }
  });

  btnNuevoMovimiento?.addEventListener("click", openModal);
  modalMovimientoCerrar?.addEventListener("click", closeModal);
  btnCancelarMovimiento?.addEventListener("click", closeModal);

  renderMovimientos();
  populateProductos();
})();
