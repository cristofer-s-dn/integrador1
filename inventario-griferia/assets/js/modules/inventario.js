import { AppCore } from "../core/app-core.js";
import { LayoutManager } from "../core/layout.js";
import { ActionSheet } from "../core/action-sheet.js";
import { Validations } from "../core/validations.js";
import { IndustrialToast, IndustrialDialog } from "../core/industrial-ui.js";

(function initInventarioModule() {
  const appCore = new AppCore();
  const layoutManager = new LayoutManager();
  const actionSheet = new ActionSheet();

  appCore.initAuthGuard();
  layoutManager.init();

  let appData = AppCore.loadAppData();
  AppCore.loadSampleDataIfEmpty(appData);

  const tbody = document.getElementById("inventarioTableBody");
  const filterCategoria = document.getElementById("filterCategoria");
  const filterEstado = document.getElementById("filterEstado");
  const searchInventario = document.getElementById("searchInventario");
  const btnExportarInventario = document.getElementById("btnExportarInventario");
  const btnAgregarProductoInventario = document.getElementById("btnAgregarProductoInventario");

  const modalProducto = document.getElementById("modalProducto");
  const modalProductoCerrar = document.getElementById("modalProductoCerrar");
  const btnCancelarProducto = document.getElementById("btnCancelarProducto");
  const formProducto = document.getElementById("formProducto");
  const modalProductoTitulo = document.getElementById("modalProductoTitulo");

  const modalAjustarStock = document.getElementById("modalAjustarStock");
  const modalAjustarStockCerrar = document.getElementById("modalAjustarStockCerrar");
  const btnCancelarAjuste = document.getElementById("btnCancelarAjuste");
  const formAjustarStock = document.getElementById("formAjustarStock");

  // Badges de edición segura
  const currentStockBadge = document.getElementById("currentStock");
  const currentPrecioCompraBadge = document.getElementById("currentPrecioCompra");
  const currentPrecioVentaBadge = document.getElementById("currentPrecioVenta");

  let editingProductId = null;
  let adjustingProductId = null;

  function populateSelects() {
    if (filterCategoria) {
      filterCategoria.innerHTML =
        '<option value="">Todas las categorías</option>' +
        appData.categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
    }

    const selectCategoria = document.getElementById("selectCategoria");
    if (selectCategoria) {
      selectCategoria.innerHTML =
        '<option value="">Seleccionar categoría</option>' +
        appData.categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
    }

    const selectProveedor = document.getElementById("selectProveedor");
    if (selectProveedor) {
      selectProveedor.innerHTML =
        '<option value="">Sin proveedor</option>' +
        appData.proveedores.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("");
    }
  }

  function renderInventario() {
    if (!tbody) return;

    const categoriaFilter = filterCategoria?.value || "";
    const estadoFilter = filterEstado?.value || "";
    const search = (searchInventario?.value || "").toLowerCase();

    let filtered = [...appData.productos];

    if (categoriaFilter) filtered = filtered.filter((p) => p.categoriaId === categoriaFilter);
    if (estadoFilter) filtered = filtered.filter((p) => AppCore.getEstadoProducto(p) === estadoFilter);
    if (search) {
      filtered = filtered.filter(
        (p) =>
          (p.nombre || "").toLowerCase().includes(search) ||
          (p.codigo || "").toLowerCase().includes(search)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="9">
          <div class="empty-state">
            <i class="bi bi-inbox empty-state__icon"></i>
            <p class="empty-state__text">No se encontraron productos en el inventario</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((p) => {
        const estado = AppCore.getEstadoProducto(p);
        const categoria = appData.categorias.find((c) => c.id === p.categoriaId);
        const badgeClass = AppCore.getEstadoBadgeClass(estado);
        const badgeLabel = AppCore.getEstadoLabel(estado);
        const precioCompraNum = Number(p.precio_compra ?? p.precioCompra ?? 0);
        const precioVentaNum = Number(p.precio ?? p.precio_venta ?? p.precioVenta ?? 0);
        const stockNum = Number(p.stock ?? 0);
        const stockMinNum = Number(p.stockMinimo ?? 5);

        return `
          <tr>
            <td class="text-center font-mono font-semibold text-muted">${p.codigo || ""}</td>
            <td class="text-left font-medium text-slate-900">${p.nombre || ""}</td>
            <td class="text-left text-muted">${categoria?.nombre || "—"}</td>
            <td class="text-right font-mono tabular-nums font-semibold">${stockNum}</td>
            <td class="text-right font-mono tabular-nums text-muted">${stockMinNum}</td>
            <td class="text-right font-mono tabular-nums font-semibold text-muted">
              ${AppCore.formatCurrency(precioCompraNum)}
            </td>
            <td class="text-right font-mono tabular-nums font-semibold text-primary">
              ${AppCore.formatCurrency(precioVentaNum)}
            </td>
            <td class="text-center"><span class="badge ${badgeClass}">${badgeLabel}</span></td>
            <td class="text-center">
              <div class="btn-group" style="display:inline-flex; gap: 4px;">
                <button class="btn btn-sm btn-outline" data-action="adjust" data-id="${p.id}" title="Ajustar Stock"><i class="bi bi-arrow-left-right"></i></button>
                <button class="btn btn-sm btn-outline" data-action="view" data-id="${p.id}" title="Ver Detalles"><i class="bi bi-eye"></i></button>
              </div>
            </td>
          </tr>`;
      })
      .join("");
  }

  function openProductModal(producto = null) {
    editingProductId = producto ? producto.id : null;
    if (modalProductoTitulo) {
      modalProductoTitulo.textContent = producto ? `Editar Producto — SKU: ${producto.codigo || ""}` : "Nuevo Producto";
    }

    if (formProducto) {
      formProducto.reset();
      const inputCodigo = document.getElementById("inputCodigo");
      const inputNombre = document.getElementById("inputNombre");
      const selectCategoria = document.getElementById("selectCategoria");
      const selectProveedor = document.getElementById("selectProveedor");
      const inputStock = document.getElementById("inputStock");
      const inputStockMinimo = document.getElementById("inputStockMinimo");
      const inputPrecioCompra = document.getElementById("inputPrecioCompra");
      const inputPrecio = document.getElementById("inputPrecio");
      const inputDescripcion = document.getElementById("inputDescripcion");

      if (producto) {
        const precioCompraVal = producto.precio_compra ?? producto.precioCompra ?? 0;
        const precioVentaVal = producto.precio ?? producto.precio_venta ?? producto.precioVenta ?? 0;

        if (inputCodigo) inputCodigo.value = producto.codigo || "";
        if (inputNombre) inputNombre.value = producto.nombre || "";
        if (selectCategoria) selectCategoria.value = producto.categoriaId || "";
        if (selectProveedor) selectProveedor.value = producto.proveedorId || "";
        if (inputStock) inputStock.value = producto.stock ?? 0;
        if (inputStockMinimo) inputStockMinimo.value = producto.stockMinimo ?? 5;
        if (inputPrecioCompra) inputPrecioCompra.value = Number(precioCompraVal).toFixed(2);
        if (inputPrecio) inputPrecio.value = Number(precioVentaVal).toFixed(2);
        if (inputDescripcion) inputDescripcion.value = producto.descripcion || "";

        if (currentStockBadge) currentStockBadge.textContent = `Actual: ${producto.stock ?? 0} UND`;
        if (currentPrecioCompraBadge) currentPrecioCompraBadge.textContent = `Actual: ${AppCore.formatCurrency(precioCompraVal)}`;
        if (currentPrecioVentaBadge) currentPrecioVentaBadge.textContent = `Actual: ${AppCore.formatCurrency(precioVentaVal)}`;
      } else {
        if (inputStock) inputStock.value = 0;
        if (inputStockMinimo) inputStockMinimo.value = 5;
        if (inputPrecioCompra) inputPrecioCompra.value = "";
        if (inputPrecio) inputPrecio.value = "";

        if (currentStockBadge) currentStockBadge.textContent = "";
        if (currentPrecioCompraBadge) currentPrecioCompraBadge.textContent = "";
        if (currentPrecioVentaBadge) currentPrecioVentaBadge.textContent = "";
      }
    }

    modalProducto?.classList.add("is-open");
    document.body.classList.add("overflow-hidden");
  }

  function closeProductModal() {
    modalProducto?.classList.remove("is-open");
    document.body.classList.remove("overflow-hidden");
    editingProductId = null;
  }

  function openAdjustModal(producto) {
    if (!producto) return;
    adjustingProductId = producto.id;
    document.getElementById("inputProductoStock").value = producto.nombre || "";
    document.getElementById("inputStockActual").value = (producto.stock ?? 0).toString();
    document.getElementById("selectTipoMovimiento").value = "entrada";
    document.getElementById("inputCantidadMovimiento").value = "";
    document.getElementById("inputMotivoMovimiento").value = "";
    modalAjustarStock?.classList.add("is-open");
    document.body.classList.add("overflow-hidden");
  }

  function closeAdjustModal() {
    modalAjustarStock?.classList.remove("is-open");
    document.body.classList.remove("overflow-hidden");
    adjustingProductId = null;
  }

  formProducto?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(formProducto);

    const codigo = (formData.get("codigo") || "").trim();
    const nombre = (formData.get("nombre") || "").trim();
    const categoriaId = formData.get("categoriaId");
    const proveedorId = formData.get("proveedorId") || null;
    const stock = parseInt(formData.get("stock"), 10) || 0;
    const stockMinimo = parseInt(formData.get("stockMinimo"), 10) || 5;
    const descripcion = (formData.get("descripcion") || "").trim();

    const previo = editingProductId ? appData.productos.find((p) => p.id === editingProductId) : null;

    // Preservar precio de compra existente si no se ingresa
    const rawPrecioCompra = formData.get("precioCompra");
    const precioCompraNum = rawPrecioCompra !== null && rawPrecioCompra !== ""
      ? parseFloat(rawPrecioCompra)
      : (previo?.precio_compra ?? previo?.precioCompra ?? 0);

    const precioVentaNum = parseFloat(formData.get("precio")) || 0;

    const productoError = Validations.firstError([
      [Validations.required(codigo), "El código es obligatorio."],
      [Validations.required(nombre, 3), "El nombre es obligatorio (mínimo 3 caracteres)."],
      [Validations.required(categoriaId), "Selecciona una categoría."],
      [Validations.isNonNegativeInt(formData.get("stock")), "El stock debe ser un número entero mayor o igual a 0."],
      [Validations.isNonNegativeInt(formData.get("stockMinimo")), "El stock mínimo debe ser un número entero mayor o igual a 0."],
      [precioVentaNum > 0 && Validations.isNonNegativeNumber(formData.get("precio")), "El precio de venta debe ser un número mayor a 0."],
      [precioCompraNum >= 0, "El precio de compra no puede ser un número negativo."],
    ]);
    if (productoError) {
      IndustrialToast.error(productoError);
      return;
    }

    const producto = {
      ...(previo || {}),
      id: editingProductId || AppCore.generateId(),
      codigo,
      nombre,
      categoriaId,
      proveedorId,
      stock,
      stockMinimo,
      precio: precioVentaNum,
      precio_venta: precioVentaNum,
      precioVenta: precioVentaNum,
      precio_compra: precioCompraNum,
      precioCompra: precioCompraNum,
      descripcion,
    };

    if (editingProductId) {
      const idx = appData.productos.findIndex((p) => p.id === editingProductId);
      if (idx !== -1) appData.productos[idx] = producto;
      IndustrialToast.success(`Producto "${nombre}" actualizado correctamente.`);
    } else {
      appData.productos.push(producto);
      IndustrialToast.success(`Producto "${nombre}" agregado al inventario.`);
    }

    AppCore.saveAppData(appData);
    closeProductModal();
    populateSelects();
    renderInventario();
    document.dispatchEvent(new CustomEvent("dataUpdated"));
  });

  formAjustarStock?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(formAjustarStock);
    const tipo = formData.get("tipo");
    const cantidad = parseInt(formData.get("cantidad"), 10);
    const motivo = (formData.get("motivo") || "").trim();

    const producto = appData.productos.find((p) => p.id === adjustingProductId);
    if (!producto) {
      closeAdjustModal();
      return;
    }

    const adjustError = Validations.firstError([
      [Validations.isPositiveInt(formData.get("cantidad")), "La cantidad debe ser un número entero mayor a 0."],
      [Validations.required(motivo, 3), "El motivo es obligatorio (mínimo 3 caracteres)."],
    ]);
    if (adjustError) {
      IndustrialToast.error(adjustError);
      return;
    }

    if (tipo === "salida" && cantidad > (producto.stock || 0)) {
      IndustrialToast.warning("No hay suficiente stock para realizar la salida.");
      return;
    }

    const stockAnterior = producto.stock || 0;
    if (tipo === "entrada") {
      producto.stock = stockAnterior + cantidad;
    } else {
      producto.stock = stockAnterior - cantidad;
    }

    appData.movimientos.push({
      id: AppCore.generateId(),
      fecha: new Date().toISOString(),
      tipo,
      productoId: producto.id,
      cantidad,
      motivo,
      usuario: "Admin",
    });

    AppCore.saveAppData(appData);
    closeAdjustModal();
    IndustrialToast.success(`Stock de "${producto.nombre}" ajustado (${tipo === "entrada" ? "+" : "-"}${cantidad} UND).`);
    renderInventario();
    document.dispatchEvent(new CustomEvent("dataUpdated"));
  });

  tbody?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const producto = appData.productos.find((p) => p.id === id);
    if (!producto) return;

    if (action === "adjust") {
      openAdjustModal(producto);
      return;
    }

    if (action === "view") {
      const categoria = appData.categorias.find((c) => c.id === producto.categoriaId);
      const precioCompraVal = producto.precio_compra ?? producto.precioCompra ?? 0;
      const precioVentaVal = producto.precio ?? producto.precio_venta ?? producto.precioVenta ?? 0;

      actionSheet.open({
        title: producto.nombre,
        fields: [
          { label: "Código", value: producto.codigo },
          { label: "Categoría", value: categoria?.nombre },
          { label: "Stock Actual", value: `${producto.stock ?? 0} UND` },
          { label: "Stock Mínimo", value: `${producto.stockMinimo ?? 5} UND` },
          { label: "Precio Compra (Costo)", value: AppCore.formatCurrency(precioCompraVal) },
          { label: "Precio Venta (PVP)", value: AppCore.formatCurrency(precioVentaVal) },
          { label: "Estado", value: AppCore.getEstadoLabel(AppCore.getEstadoProducto(producto)) },
          { label: "Descripción", value: producto.descripcion || "—" },
        ],
        onEdit: () => openProductModal(producto),
        onDelete: async () => {
          const confirmado = await IndustrialDialog.confirm({
            title: "Eliminar Producto del Inventario",
            message: `¿Estás seguro de que deseas eliminar permanentemente el producto "${producto.nombre}"?`,
            confirmText: "Eliminar Registro",
            confirmVariant: "danger",
            details: [
              { label: "Código SKU", value: producto.codigo },
              { label: "Nombre", value: producto.nombre },
              { label: "Categoría", value: categoria?.nombre || "—" },
              { label: "Stock Actual", value: `${producto.stock ?? 0} UND` },
              { label: "Precio Compra", value: AppCore.formatCurrency(precioCompraVal) },
              { label: "Precio Venta", value: AppCore.formatCurrency(precioVentaVal) },
            ],
          });

          if (confirmado) {
            appData.productos = appData.productos.filter((p) => p.id !== id);
            AppCore.saveAppData(appData);
            IndustrialToast.success(`Producto "${producto.nombre}" eliminado del inventario.`);
            renderInventario();
            document.dispatchEvent(new CustomEvent("dataUpdated"));
          }
        },
      });
    }
  });

  btnExportarInventario?.addEventListener("click", () => {
    let csv = "Código,Nombre,Categoría,Stock,Stock Mínimo,Precio Compra,Precio Venta,Estado\n";
    appData.productos.forEach((p) => {
      const categoria = appData.categorias.find((c) => c.id === p.categoriaId);
      const estado = AppCore.getEstadoProducto(p);
      const precioCompraVal = p.precio_compra ?? p.precioCompra ?? 0;
      const precioVentaVal = p.precio ?? p.precio_venta ?? p.precioVenta ?? 0;
      csv += `${AppCore.escapeCSV(p.codigo)},${AppCore.escapeCSV(p.nombre)},${AppCore.escapeCSV(categoria?.nombre || "")},${p.stock || 0},${p.stockMinimo || 0},${precioCompraVal},${precioVentaVal},${estado}\n`;
    });
    AppCore.downloadCSV(csv, "inventario.csv");
    IndustrialToast.success("Inventario exportado a CSV correctamente.");
  });

  btnAgregarProductoInventario?.addEventListener("click", () => openProductModal());
  modalProductoCerrar?.addEventListener("click", closeProductModal);
  btnCancelarProducto?.addEventListener("click", closeProductModal);
  modalAjustarStockCerrar?.addEventListener("click", closeAdjustModal);
  btnCancelarAjuste?.addEventListener("click", closeAdjustModal);
  filterCategoria?.addEventListener("change", renderInventario);
  filterEstado?.addEventListener("change", renderInventario);
  searchInventario?.addEventListener("input", renderInventario);

  document.addEventListener("globalSearch", (e) => {
    if (searchInventario) {
      searchInventario.value = e.detail.term || "";
      renderInventario();
    }
  });

  populateSelects();
  renderInventario();
})();
