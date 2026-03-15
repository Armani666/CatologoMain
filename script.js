const whatsappNumber = "524791382982";
const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const hiddenAdminClicksNeeded = 5;
const supabaseConfig = {
  url: "https://lvsslzdxvrqgskjydwjt.supabase.co",
  anonKey: "sb_publishable_EGStQ8AySDkRHi2MjZ6AOQ_TJ5w417_",
  table: "products"
};
const fieldPlaceholders = {
  category: "Categoria",
  brand: "Marca",
  name: "Nombre del producto",
  type: "Tipo",
  description: "Descripcion",
  availability: "Cantidad disponible",
  tone: "Tono",
  price: "Precio"
};

const initialCatalogSource = Array.isArray(window.CATALOG_PRODUCTS_OVERRIDE)
  ? window.CATALOG_PRODUCTS_OVERRIDE
  : (window.CATALOG_PRODUCTS || []);

const baseProducts = initialCatalogSource.map((product, index) => ({
  id: product.id ?? index + 1,
  name: product.name || "",
  brand: product.brand || "",
  category: product.category || "",
  type: product.type || "",
  description: product.description || "",
  stock: typeof product.stock === "number"
    ? Math.max(0, product.stock)
    : (typeof product.available === "boolean" ? (product.available ? 1 : 0) : 1),
  tone: product.tone || "",
  price: typeof product.price === "number" && !Number.isNaN(product.price) ? product.price : null,
  imageUrl: product.imageUrl || "",
  referenceUrl: product.referenceUrl || "",
  isActive: typeof product.isActive === "boolean" ? product.isActive : true,
  imageKey: product.imageKey || `${product.name || ""}__${product.category || ""}__${product.type || ""}`
})).filter((product) => product.name && product.category && product.type);

let products = [];
const state = {
  search: "",
  category: "Todas",
  brand: "Todas",
  cart: [],
  adminMode: false,
  adminStatus: "Todos",
  remoteReady: false,
  remoteEnabled: false,
  saving: false
};

const elements = {
  grid: document.querySelector("#product-grid"),
  printCatalog: document.querySelector("#print-catalog"),
  printGrid: document.querySelector("#print-grid"),
  template: document.querySelector("#product-card-template"),
  resultsCount: document.querySelector("#results-count"),
  searchInput: document.querySelector("#search-input"),
  categoryFilter: document.querySelector("#category-filter"),
  brandFilter: document.querySelector("#brand-filter"),
  clearFilters: document.querySelector("#clear-filters"),
  heroCartCount: document.querySelector("#hero-cart-count"),
  cartDrawer: document.querySelector("#cart-drawer"),
  cartItems: document.querySelector("#cart-items"),
  cartTotal: document.querySelector("#cart-total"),
  cartDisclaimer: document.querySelector("#cart-disclaimer"),
  backdrop: document.querySelector("#backdrop"),
  loginModal: document.querySelector("#login-modal"),
  loginModalBackdrop: document.querySelector("#login-modal-backdrop"),
  closeLogin: document.querySelector("#close-login"),
  loginForm: document.querySelector("#login-form"),
  loginUsername: document.querySelector("#login-username"),
  loginPassword: document.querySelector("#login-password"),
  loginError: document.querySelector("#login-error"),
  imageModal: document.querySelector("#image-modal"),
  imageModalBackdrop: document.querySelector("#image-modal-backdrop"),
  imageModalClose: document.querySelector("#image-modal-close"),
  imageModalImg: document.querySelector("#image-modal-img"),
  imageModalLink: document.querySelector("#image-modal-link"),
  mediaModal: document.querySelector("#media-modal"),
  mediaModalBackdrop: document.querySelector("#media-modal-backdrop"),
  mediaModalClose: document.querySelector("#media-modal-close"),
  mediaForm: document.querySelector("#media-form"),
  mediaImageUrl: document.querySelector("#media-image-url"),
  mediaImageFile: document.querySelector("#media-image-file"),
  mediaReferenceUrl: document.querySelector("#media-reference-url"),
  mediaImagePreviewImg: document.querySelector("#media-image-preview-img"),
  mediaImagePreviewEmpty: document.querySelector("#media-image-preview-empty"),
  mediaModalCancel: document.querySelector("#media-modal-cancel"),
  adminTrigger: document.querySelector("#admin-trigger"),
  adminBar: document.querySelector("#admin-bar"),
  adminStatusFilter: document.querySelector("#admin-status-filter"),
  adminStatusNote: document.querySelector("#admin-status-note"),
  adminExportPdf: document.querySelector("#admin-export-pdf"),
  adminAddProduct: document.querySelector("#admin-add-product"),
  adminExit: document.querySelector("#admin-exit"),
  adminDrawer: document.querySelector("#admin-drawer"),
  closeAdmin: document.querySelector("#close-admin"),
  adminForm: document.querySelector("#admin-form"),
  adminReset: document.querySelector("#admin-reset"),
  adminList: document.querySelector("#admin-list"),
  adminId: document.querySelector("#admin-id"),
  adminName: document.querySelector("#admin-name"),
  adminBrand: document.querySelector("#admin-brand"),
  adminCategory: document.querySelector("#admin-category"),
  adminType: document.querySelector("#admin-type"),
  adminDescription: document.querySelector("#admin-description"),
  adminTone: document.querySelector("#admin-tone"),
  adminPrice: document.querySelector("#admin-price"),
  adminImageUrl: document.querySelector("#admin-image-url"),
  adminImageFile: document.querySelector("#admin-image-file"),
  adminReferenceUrl: document.querySelector("#admin-reference-url"),
  adminImagePreviewImg: document.querySelector("#admin-image-preview-img"),
  adminImagePreviewEmpty: document.querySelector("#admin-image-preview-empty"),
  adminActive: document.querySelector("#admin-active"),
  openCart: document.querySelector("#open-cart"),
  closeCart: document.querySelector("#close-cart"),
  sendOrder: document.querySelector("#send-order")
};

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

let adminTapCount = 0;
let currentMediaProductId = null;
let currentAdminProductId = null;
let restoreAdminAfterPrint = false;
let savedPrintView = null;

function makeImageKey(product) {
  return `${product.name || ""}__${product.category || ""}__${product.type || ""}`;
}

function isAdminAuthenticated() {
  return sessionStorage.getItem("catalog_admin_session_v1") === "ok";
}

function setAdminAuthenticated(value) {
  if (value) sessionStorage.setItem("catalog_admin_session_v1", "ok");
  else sessionStorage.removeItem("catalog_admin_session_v1");
}

function normalizeProduct(product, index) {
  const parsedPrice = typeof product.price === "number"
    ? product.price
    : (product.price === null || product.price === "" || typeof product.price === "undefined"
        ? null
        : Number(product.price));

  return {
    ...product,
    id: Number(product.id ?? index + 1),
    stock: typeof product.stock === "number"
      ? Math.max(0, product.stock)
      : (typeof product.available === "boolean" ? (product.available ? 1 : 0) : parseStock(product.stock, 1)),
    price: Number.isNaN(parsedPrice) ? null : parsedPrice,
    imageUrl: product.imageUrl || "",
    referenceUrl: product.referenceUrl || "",
    isActive: typeof product.isActive === "boolean"
      ? product.isActive
      : (typeof product.is_active === "boolean" ? product.is_active : true),
    imageKey: product.imageKey || makeImageKey(product)
  };
}

function toDatabaseProduct(product) {
  return {
    id: Number(product.id),
    name: product.name || "",
    brand: product.brand || "",
    category: product.category || "",
    type: product.type || "",
    description: product.description || "",
    stock: parseStock(product.stock, 0),
    tone: product.tone || "",
    price: product.price === null || product.price === "" ? null : Number(product.price),
    image_url: product.imageUrl || "",
    reference_url: product.referenceUrl || "",
    is_active: product.isActive !== false,
    image_key: product.imageKey || makeImageKey(product)
  };
}

function fromDatabaseProduct(product, index) {
  return normalizeProduct({
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    type: product.type,
    description: product.description,
    stock: product.stock,
    tone: product.tone,
    price: product.price,
    imageUrl: product.image_url,
    referenceUrl: product.reference_url,
    isActive: product.is_active,
    imageKey: product.image_key
  }, index);
}

function ensureSupabase() {
  if (!supabaseClient) {
    throw new Error("No se pudo inicializar Supabase.");
  }
  return supabaseClient;
}

async function getCurrentAdminSession() {
  const client = ensureSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function fetchRemoteProducts() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(supabaseConfig.table)
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  return (data || []).map(fromDatabaseProduct).filter((product) => product.name && product.category && product.type);
}

async function upsertRemoteProducts(items) {
  const client = ensureSupabase();
  const payload = items.map(toDatabaseProduct);
  const { error } = await client.from(supabaseConfig.table).upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

async function deleteRemoteProduct(productId) {
  const client = ensureSupabase();
  const { error } = await client.from(supabaseConfig.table).delete().eq("id", Number(productId));
  if (error) throw error;
}

async function bootstrapRemoteCatalog() {
  if (!baseProducts.length) return [];
  await upsertRemoteProducts(baseProducts);
  return fetchRemoteProducts();
}

async function loadProducts() {
  if (!supabaseClient) {
    products = baseProducts.map(normalizeProduct);
    state.remoteEnabled = false;
    state.remoteReady = false;
    return;
  }

  try {
    let remoteProducts = await fetchRemoteProducts();
    if (!remoteProducts.length && baseProducts.length) {
      remoteProducts = await bootstrapRemoteCatalog();
    }
    products = remoteProducts.length ? remoteProducts : baseProducts.map(normalizeProduct);
    state.remoteEnabled = true;
    state.remoteReady = true;
  } catch (error) {
    console.error("Supabase load failed", error);
    products = baseProducts.map(normalizeProduct);
    state.remoteEnabled = false;
    state.remoteReady = false;
    window.alert("No se pudo cargar Supabase. El catalogo abrio con los datos locales.");
  }
}

async function persistProduct(product) {
  if (!state.remoteEnabled) return false;
  await upsertRemoteProducts([product]);
  return true;
}

function formatPrice(price) {
  return price === null ? "Precio por confirmar" : currency.format(price);
}

function isAvailable(product) {
  return Number(product.stock || 0) > 0;
}

function formatAvailability(stock) {
  return Number(stock || 0) > 0 ? `Disponible (${stock})` : "Agotado";
}

function parseStock(value, fallback = 0) {
  const parsed = Number(String(value || "").trim());
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, parsed);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function setImagePreview(imgEl, emptyEl, src) {
  if (!imgEl || !emptyEl) return;
  if (src) {
    imgEl.src = src;
    imgEl.hidden = false;
    emptyEl.hidden = true;
  } else {
    imgEl.src = "";
    imgEl.hidden = true;
    emptyEl.hidden = false;
  }
}

function uniqueValues(key) {
  return ["Todas", ...new Set(products.map((product) => product[key]).filter(Boolean).sort((a, b) => a.localeCompare(b, "es")))];
}

function fillSelect(select, values) {
  select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function refreshFilters() {
  const categoryValues = uniqueValues("category");
  const brandValues = uniqueValues("brand");
  fillSelect(elements.categoryFilter, categoryValues);
  fillSelect(elements.brandFilter, brandValues);
  elements.categoryFilter.value = categoryValues.includes(state.category) ? state.category : "Todas";
  elements.brandFilter.value = brandValues.includes(state.brand) ? state.brand : "Todas";
}

function getFilteredProducts() {
  const search = state.search.toLowerCase();
  return products.filter((product) => {
    const haystack = [product.name, product.brand, product.category, product.type, product.description, product.tone].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesCategory = state.category === "Todas" || product.category === state.category;
    const matchesBrand = state.brand === "Todas" || product.brand === state.brand;
    const matchesAdminStatus = !state.adminMode
      || state.adminStatus === "Todos"
      || (state.adminStatus === "Activos" ? product.isActive !== false : product.isActive === false);
    const matchesActive = state.adminMode || product.isActive !== false;
    return matchesSearch && matchesCategory && matchesBrand && matchesActive && matchesAdminStatus;
  });
}

function showAdminStatus(message, tone = "info") {
  if (!elements.adminStatusNote) return;
  elements.adminStatusNote.textContent = message;
  elements.adminStatusNote.hidden = !message;
  elements.adminStatusNote.dataset.tone = tone;
  if (!message) return;
  window.clearTimeout(showAdminStatus.timeoutId);
  showAdminStatus.timeoutId = window.setTimeout(() => {
    elements.adminStatusNote.hidden = true;
    elements.adminStatusNote.textContent = "";
  }, 2200);
}

function openAdminDrawer() {
  elements.adminDrawer.classList.add("open");
  elements.adminDrawer.setAttribute("aria-hidden", "false");
  elements.backdrop.hidden = false;
}

function closeAdminDrawer() {
  elements.adminDrawer.classList.remove("open");
  elements.adminDrawer.setAttribute("aria-hidden", "true");
  if (!elements.cartDrawer.classList.contains("open")) {
    elements.backdrop.hidden = true;
  }
}

function resetAdminForm(product = null) {
  currentAdminProductId = product ? Number(product.id) : null;
  elements.adminId.value = product ? String(product.id) : "";
  elements.adminName.value = product?.name || "";
  elements.adminBrand.value = product?.brand || "";
  elements.adminCategory.value = product?.category || "";
  elements.adminType.value = product?.type || "";
  elements.adminDescription.value = product?.description || "";
  elements.adminTone.value = product?.tone || "";
  elements.adminPrice.value = product?.price ?? "";
  elements.adminImageUrl.value = product?.imageUrl || "";
  elements.adminImageFile.value = "";
  elements.adminReferenceUrl.value = product?.referenceUrl || "";
  elements.adminActive.checked = product ? product.isActive !== false : true;
  setImagePreview(elements.adminImagePreviewImg, elements.adminImagePreviewEmpty, product?.imageUrl || "");
}

function renderAdminList() {
  if (!elements.adminList) return;
  const adminItems = getFilteredProducts();
  elements.adminList.innerHTML = "";

  if (!adminItems.length) {
    elements.adminList.innerHTML = `<div class="empty-state">No hay productos para este filtro.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  adminItems.forEach((product) => {
    const item = document.createElement("article");
    item.className = "admin-item";
    item.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.brand} | ${product.category}</p>
      <p>${product.isActive === false ? "Oculto" : "Visible"}</p>
      <div class="admin-item-actions">
        <button class="admin-edit" type="button">Editar</button>
      </div>
    `;
    item.querySelector(".admin-edit").addEventListener("click", () => {
      resetAdminForm(product);
      openAdminDrawer();
    });
    fragment.appendChild(item);
  });

  elements.adminList.appendChild(fragment);
}

function getCartSummary() {
  const total = state.cart.reduce((sum, item) => sum + (item.price || 0), 0);
  return {
    total,
    totalLabel: currency.format(total),
    missingPrices: state.cart.some((item) => item.price === null)
  };
}

function buildWhatsappLink(items) {
  const totalLabel = currency.format(items.reduce((sum, item) => sum + (item.price || 0), 0));
  const lines = [
    "Hola, quiero hacer este pedido:",
    "",
    ...items.map((item, index) => `${index + 1}. ${item.name} | Tono: ${item.tone || "No visible"} | Precio: ${formatPrice(item.price)} | Estado: ${formatAvailability(item.stock)}`),
    "",
    `Total estimado: ${totalLabel}`
  ];
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function openImageModal(src, link = "") {
  if (!src) return;
  const probe = new Image();
  probe.onload = () => {
    elements.imageModalImg.src = src;
    elements.imageModal.hidden = false;
    if (link) {
      elements.imageModalLink.href = link;
      elements.imageModalLink.hidden = false;
    } else {
      elements.imageModalLink.hidden = true;
    }
  };
  probe.onerror = () => {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };
  probe.src = src;
}

function closeImageModal() {
  elements.imageModal.hidden = true;
  elements.imageModalImg.src = "";
  elements.imageModalLink.href = "#";
  elements.imageModalLink.hidden = true;
}

function openMediaModal(product) {
  currentMediaProductId = product.id;
  elements.mediaImageUrl.value = product.imageUrl || "";
  elements.mediaImageFile.value = "";
  elements.mediaReferenceUrl.value = product.referenceUrl || "";
  setImagePreview(elements.mediaImagePreviewImg, elements.mediaImagePreviewEmpty, product.imageUrl || "");
  elements.mediaModal.hidden = false;
  setTimeout(() => elements.mediaImageUrl.focus(), 0);
}

function closeMediaModal() {
  currentMediaProductId = null;
  elements.mediaModal.hidden = true;
  elements.mediaForm.reset();
  setImagePreview(elements.mediaImagePreviewImg, elements.mediaImagePreviewEmpty, "");
}

function openCart() {
  elements.cartDrawer.classList.add("open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  elements.backdrop.hidden = false;
}

function closeCart() {
  elements.cartDrawer.classList.remove("open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  elements.backdrop.hidden = true;
}

function openLogin() {
  elements.loginError.hidden = true;
  elements.loginModal.hidden = false;
}

function closeLogin() {
  elements.loginModal.hidden = true;
  elements.loginForm.reset();
  elements.loginError.hidden = true;
}

function openAdmin() {
  state.adminMode = true;
  elements.adminBar.hidden = false;
  document.body.classList.add("admin-mode");
  renderAdminList();
  renderProducts();
}

function closeAdmin() {
  state.adminMode = false;
  elements.adminBar.hidden = true;
  document.body.classList.remove("admin-mode");
  closeAdminDrawer();
  renderProducts();
}

function exportCatalogPdf() {
  restoreAdminAfterPrint = state.adminMode;
  savedPrintView = {
    search: state.search,
    category: state.category,
    brand: state.brand,
    searchInput: elements.searchInput.value,
    categoryFilter: elements.categoryFilter.value,
    brandFilter: elements.brandFilter.value
  };
  if (state.adminMode) {
    closeAdmin();
  }
  state.search = "";
  state.category = "Todas";
  state.brand = "Todas";
  elements.searchInput.value = "";
  elements.categoryFilter.value = "Todas";
  elements.brandFilter.value = "Todas";
  renderPrintCatalog();
  renderProducts();
  document.body.classList.add("print-mode");
  elements.printCatalog.hidden = false;
  window.setTimeout(() => {
    window.print();
  }, 60);
}

function renderPrintCatalog() {
  const items = [...products].sort((a, b) => a.category.localeCompare(b.category, "es") || a.name.localeCompare(b.name, "es"));
  elements.printGrid.innerHTML = items.map((product) => `
    <article class="print-card">
      <div class="print-media">
        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : `<div class="print-initial">${(product.name || "N").slice(0, 1).toUpperCase()}</div>`}
        <span class="print-badge">${product.category}</span>
      </div>
      <div class="print-body">
        <p class="print-brand">${product.brand}</p>
        <h2 class="print-name">${product.name}</h2>
        <p class="print-type">${product.type}</p>
        <div class="print-meta">
          <p class="print-tone">${product.tone || "No visible"}</p>
          <p class="print-stock ${isAvailable(product) ? "is-available" : "is-unavailable"}">${formatAvailability(product.stock)}</p>
          <p class="print-price">${formatPrice(product.price)}</p>
        </div>
      </div>
    </article>
  `).join("");
}

function setSavingState(isSaving) {
  state.saving = isSaving;
  elements.adminAddProduct.disabled = isSaving;
  if (state.adminMode) {
    renderProducts();
    renderAdminList();
  }
}

async function updateProduct(productId, updates) {
  const index = products.findIndex((item) => Number(item.id) === Number(productId));
  if (index < 0) return;

  const next = normalizeProduct({ ...products[index], ...updates }, index);
  next.imageKey = makeImageKey(next);

  try {
    setSavingState(true);
    await persistProduct(next);
    products[index] = next;
    refreshFilters();
    renderAdminList();
    renderProducts();
    renderCart();
    showAdminStatus("Guardado con exito", "success");
  } catch (error) {
    console.error("Update failed", error);
    showAdminStatus("No se pudo guardar", "error");
  } finally {
    setSavingState(false);
  }
}

function saveProductFromCard(card) {
  const productId = Number(card.dataset.productId);
  const current = products.find((item) => Number(item.id) === productId);
  if (!current) return;
  const values = {};
  card.querySelectorAll("[data-field]").forEach((field) => {
    values[field.dataset.field] = field.textContent.trim();
  });
  return updateProduct(productId, {
    name: values.name || current.name,
    brand: values.brand || current.brand,
    category: values.category || current.category,
    type: values.type || current.type,
    description: values.description || current.description,
    stock: parseStock(values.availability, current.stock),
    tone: values.tone || "",
    price: values.price ? Number(values.price) : null
  });
}

async function deleteProduct(productId) {
  if (!window.confirm("Eliminar este producto?")) return;

  try {
    setSavingState(true);
    await deleteRemoteProduct(productId);
    products = products.filter((item) => Number(item.id) !== Number(productId));
    state.cart = state.cart.filter((item) => Number(item.id) !== Number(productId));
    refreshFilters();
    renderAdminList();
    renderProducts();
    renderCart();
    if (currentAdminProductId === Number(productId)) {
      resetAdminForm();
    }
    showAdminStatus("Producto eliminado", "success");
  } catch (error) {
    console.error("Delete failed", error);
    showAdminStatus("No se pudo eliminar", "error");
  } finally {
    setSavingState(false);
  }
}

async function duplicateProduct(productId) {
  const current = products.find((item) => Number(item.id) === Number(productId));
  if (!current) return;

  const nextId = products.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const duplicate = normalizeProduct({
    ...current,
    id: nextId,
    name: `${current.name} copia`
  });
  duplicate.imageKey = makeImageKey(duplicate);

  try {
    setSavingState(true);
    await persistProduct(duplicate);
    products.unshift(duplicate);
    refreshFilters();
    renderAdminList();
    renderProducts();
    resetAdminForm(duplicate);
    openAdminDrawer();
    showAdminStatus("Producto duplicado", "success");
  } catch (error) {
    console.error("Duplicate failed", error);
    showAdminStatus("No se pudo duplicar", "error");
  } finally {
    setSavingState(false);
  }
}

async function createBlankProduct() {
  const nextId = products.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const draft = normalizeProduct({
    id: nextId,
    name: "Nuevo producto",
    brand: "Marca",
    category: "Categoria",
    type: "Tipo",
    description: "Descripcion",
    stock: 1,
    tone: "",
    price: null,
    imageUrl: "",
    referenceUrl: "",
    isActive: true
  });
  draft.imageKey = makeImageKey(draft);

  try {
    setSavingState(true);
    await persistProduct(draft);
    products.unshift(draft);
    refreshFilters();
    renderAdminList();
    renderProducts();
    resetAdminForm(draft);
    openAdminDrawer();
    showAdminStatus("Producto listo para editar", "success");
  } catch (error) {
    console.error("Create failed", error);
    showAdminStatus("No se pudo crear", "error");
  } finally {
    setSavingState(false);
  }
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();
  elements.resultsCount.textContent = `${filteredProducts.length} productos`;
  elements.grid.innerHTML = "";

  if (!filteredProducts.length) {
    elements.grid.innerHTML = `<article class="empty-state">No se encontraron productos con esos filtros.</article>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredProducts.forEach((product) => {
    const node = elements.template.content.cloneNode(true);
    const card = node.querySelector(".product-card");
    const badge = node.querySelector(".product-badge");
    const brand = node.querySelector(".product-brand");
    const name = node.querySelector(".product-name");
    const type = node.querySelector(".product-type");
    const description = node.querySelector(".product-description");
    const availability = node.querySelector(".product-availability");
    const tone = node.querySelector(".product-tone");
    const price = node.querySelector(".product-price");
    const initial = node.querySelector(".product-initial");
    const editFlag = node.querySelector(".product-edit-flag");
    const adminActions = node.querySelector(".product-admin-actions");
    const saveBtn = node.querySelector(".admin-card-save");
    const toggleBtn = node.querySelector(".admin-card-toggle");
    const duplicateBtn = node.querySelector(".admin-card-duplicate");
    const deleteBtn = node.querySelector(".admin-card-delete");
    const image = node.querySelector(".product-image");
    const art = node.querySelector(".product-art");

    card.dataset.productId = String(product.id);
    card.classList.toggle("is-inactive", product.isActive === false);
    badge.textContent = product.category || "";
    brand.textContent = product.brand || "";
    name.textContent = product.name || "";
    type.textContent = product.type || "";
    description.textContent = product.description || "";
    availability.textContent = state.adminMode ? String(product.stock ?? 0) : formatAvailability(product.stock);
    tone.textContent = state.adminMode ? (product.tone || "") : (product.tone || "No visible");
    price.textContent = state.adminMode ? (product.price ?? "") : formatPrice(product.price);
    initial.textContent = (product.name || "N").slice(0, 1).toUpperCase();

    availability.classList.toggle("is-available", isAvailable(product));
    availability.classList.toggle("is-unavailable", !isAvailable(product));

    if (product.imageUrl) {
      image.src = product.imageUrl;
      image.alt = product.name;
      art.classList.add("has-image");
      image.addEventListener("click", () => {
        if (state.adminMode) {
          openMediaModal(product);
        } else {
          openImageModal(product.imageUrl, product.referenceUrl || product.imageUrl);
        }
      });
    } else {
      image.remove();
      if (state.adminMode) {
        art.addEventListener("click", () => {
          openMediaModal(product);
        });
      }
    }

    if (state.adminMode) {
      card.classList.add("admin-editing");
      editFlag.hidden = false;
      adminActions.hidden = false;
      [
        [badge, "category"],
        [brand, "brand"],
        [name, "name"],
        [type, "type"],
        [description, "description"],
        [availability, "availability"],
        [tone, "tone"],
        [price, "price"]
      ].forEach(([el, field]) => {
        el.contentEditable = "true";
        el.classList.add("editable-field");
        el.dataset.field = field;
        el.dataset.placeholder = fieldPlaceholders[field] || "";
      });
      saveBtn.disabled = state.saving;
      toggleBtn.disabled = state.saving;
      duplicateBtn.disabled = state.saving;
      deleteBtn.disabled = state.saving;
      toggleBtn.textContent = product.isActive === false ? "Activar" : "Desactivar";
      saveBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await saveProductFromCard(card);
        saveBtn.textContent = "Guardado con exito";
        saveBtn.classList.add("is-saved");
        window.setTimeout(() => {
          saveBtn.textContent = "Guardar";
          saveBtn.classList.remove("is-saved");
        }, 1600);
      });
      card.addEventListener("dblclick", () => {
        resetAdminForm(product);
        openAdminDrawer();
      });
      toggleBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await updateProduct(card.dataset.productId, { isActive: product.isActive === false });
      });
      duplicateBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await duplicateProduct(card.dataset.productId);
      });
      deleteBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await deleteProduct(card.dataset.productId);
      });
    } else {
      editFlag.hidden = true;
      adminActions.hidden = true;
    }

    const addToCartButton = node.querySelector(".add-to-cart");
    const buyNowLink = node.querySelector(".buy-now");
    addToCartButton.disabled = !isAvailable(product);
    buyNowLink.href = isAvailable(product) ? buildWhatsappLink([product]) : "#";
    buyNowLink.textContent = isAvailable(product) ? "Pedir ahora" : "Agotado";
    buyNowLink.classList.toggle("is-disabled", !isAvailable(product));
    addToCartButton.addEventListener("click", () => addToCart(product.id));
    fragment.appendChild(node);
  });

  elements.grid.appendChild(fragment);
}

function addToCart(productId) {
  const product = products.find((item) => Number(item.id) === Number(productId));
  if (!product) return;
  if (!isAvailable(product)) return;
  state.cart.push(product);
  renderCart();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  elements.heroCartCount.textContent = String(state.cart.length);
  elements.cartItems.innerHTML = "";

  if (!state.cart.length) {
    elements.cartItems.innerHTML = `<div class="empty-state">Aun no agregas productos. Usa "Agregar" para armar el pedido.</div>`;
  } else {
    const fragment = document.createDocumentFragment();
    state.cart.forEach((item, index) => {
      const wrapper = document.createElement("article");
      wrapper.className = "cart-item";
      wrapper.innerHTML = `
        <h3>${item.name}</h3>
        <p>${item.brand} | ${item.category}</p>
        <p>Estado: ${formatAvailability(item.stock)}</p>
        <p>Tono: ${item.tone || "No visible"}</p>
        <p>Precio: ${formatPrice(item.price)}</p>
        <button class="cart-remove" type="button">Quitar</button>
      `;
      wrapper.querySelector(".cart-remove").addEventListener("click", () => removeFromCart(index));
      fragment.appendChild(wrapper);
    });
    elements.cartItems.appendChild(fragment);
  }

  const summary = getCartSummary();
  elements.cartTotal.textContent = summary.totalLabel;
  elements.cartDisclaimer.textContent = summary.missingPrices
    ? "Hay productos sin precio cargado. El mensaje los enviara como precio por confirmar."
    : "Todos los productos del pedido tienen precio cargado.";
  elements.sendOrder.disabled = !state.cart.length;
}

function syncFilters() {
  state.search = elements.searchInput.value.trim();
  state.category = elements.categoryFilter.value;
  state.brand = elements.brandFilter.value;
  renderProducts();
}

async function initializeCatalog() {
  await loadProducts();
  try {
    const session = supabaseClient ? await getCurrentAdminSession() : null;
    setAdminAuthenticated(Boolean(session));
  } catch {
    setAdminAuthenticated(false);
  }
  state.adminMode = false;
  refreshFilters();
  closeImageModal();
  closeAdminDrawer();
  resetAdminForm();
  elements.adminBar.hidden = true;
  renderProducts();
  renderCart();
}

elements.searchInput.addEventListener("input", syncFilters);
elements.categoryFilter.addEventListener("change", syncFilters);
elements.brandFilter.addEventListener("change", syncFilters);
elements.adminStatusFilter.addEventListener("change", () => {
  state.adminStatus = elements.adminStatusFilter.value;
  renderAdminList();
  renderProducts();
});
elements.clearFilters.addEventListener("click", () => {
  state.search = "";
  state.category = "Todas";
  state.brand = "Todas";
  elements.searchInput.value = "";
  elements.categoryFilter.value = "Todas";
  elements.brandFilter.value = "Todas";
  renderProducts();
});
elements.openCart.addEventListener("click", openCart);
elements.closeCart.addEventListener("click", closeCart);
elements.backdrop.addEventListener("click", () => {
  closeCart();
  closeAdminDrawer();
});
elements.imageModalClose.addEventListener("click", closeImageModal);
elements.imageModalBackdrop.addEventListener("click", closeImageModal);
elements.mediaModalClose.addEventListener("click", closeMediaModal);
elements.mediaModalBackdrop.addEventListener("click", closeMediaModal);
elements.mediaModalCancel.addEventListener("click", closeMediaModal);
elements.adminImageUrl.addEventListener("input", () => {
  if (!elements.adminImageFile.files?.length) {
    setImagePreview(elements.adminImagePreviewImg, elements.adminImagePreviewEmpty, elements.adminImageUrl.value.trim());
  }
});
elements.adminImageFile.addEventListener("change", async () => {
  const file = elements.adminImageFile.files?.[0];
  if (!file) {
    setImagePreview(elements.adminImagePreviewImg, elements.adminImagePreviewEmpty, elements.adminImageUrl.value.trim());
    return;
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    elements.adminImageUrl.value = dataUrl;
    setImagePreview(elements.adminImagePreviewImg, elements.adminImagePreviewEmpty, dataUrl);
  } catch {
    showAdminStatus("No se pudo cargar la imagen", "error");
  }
});
elements.mediaImageUrl.addEventListener("input", () => {
  if (!elements.mediaImageFile.files?.length) {
    setImagePreview(elements.mediaImagePreviewImg, elements.mediaImagePreviewEmpty, elements.mediaImageUrl.value.trim());
  }
});
elements.mediaImageFile.addEventListener("change", async () => {
  const file = elements.mediaImageFile.files?.[0];
  if (!file) {
    setImagePreview(elements.mediaImagePreviewImg, elements.mediaImagePreviewEmpty, elements.mediaImageUrl.value.trim());
    return;
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    elements.mediaImageUrl.value = dataUrl;
    setImagePreview(elements.mediaImagePreviewImg, elements.mediaImagePreviewEmpty, dataUrl);
  } catch {
    showAdminStatus("No se pudo cargar la imagen", "error");
  }
});
elements.closeAdmin.addEventListener("click", closeAdminDrawer);
elements.adminExportPdf.addEventListener("click", exportCatalogPdf);
elements.adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  let imageValue = elements.adminImageUrl.value.trim();
  const adminFile = elements.adminImageFile.files?.[0];
  if (adminFile) {
    try {
      imageValue = await readFileAsDataUrl(adminFile);
    } catch {
      showAdminStatus("No se pudo cargar la imagen", "error");
      return;
    }
  }
  const payload = {
    name: elements.adminName.value.trim(),
    brand: elements.adminBrand.value.trim(),
    category: elements.adminCategory.value.trim(),
    type: elements.adminType.value.trim(),
    description: elements.adminDescription.value.trim(),
    tone: elements.adminTone.value.trim(),
    stock: 1,
    price: elements.adminPrice.value ? Number(elements.adminPrice.value) : null,
    imageUrl: imageValue,
    referenceUrl: elements.adminReferenceUrl.value.trim(),
    isActive: elements.adminActive.checked
  };

  if (currentAdminProductId) {
    await updateProduct(currentAdminProductId, payload);
  } else {
    const nextId = products.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const draft = normalizeProduct({ id: nextId, ...payload });
    draft.imageKey = makeImageKey(draft);
    try {
      setSavingState(true);
      await persistProduct(draft);
      products.unshift(draft);
      refreshFilters();
      renderAdminList();
      renderProducts();
      resetAdminForm(draft);
      showAdminStatus("Guardado con exito", "success");
    } catch (error) {
      console.error("Admin form save failed", error);
      showAdminStatus("No se pudo guardar", "error");
    } finally {
      setSavingState(false);
    }
  }
});
elements.adminReset.addEventListener("click", () => {
  resetAdminForm();
  openAdminDrawer();
});
elements.mediaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (currentMediaProductId === null) return;
  let imageValue = elements.mediaImageUrl.value.trim();
  const mediaFile = elements.mediaImageFile.files?.[0];
  if (mediaFile) {
    try {
      imageValue = await readFileAsDataUrl(mediaFile);
    } catch {
      showAdminStatus("No se pudo cargar la imagen", "error");
      return;
    }
  }
  await updateProduct(currentMediaProductId, {
    imageUrl: imageValue,
    referenceUrl: elements.mediaReferenceUrl.value.trim()
  });
  closeMediaModal();
});
elements.adminAddProduct.addEventListener("click", createBlankProduct);
elements.adminExit.addEventListener("click", async () => {
  try {
    if (supabaseClient) {
      const client = ensureSupabase();
      await client.auth.signOut();
    }
  } catch (error) {
    console.error("Sign out failed", error);
  }
  setAdminAuthenticated(false);
  closeAdmin();
});
elements.closeLogin.addEventListener("click", closeLogin);
elements.loginModalBackdrop.addEventListener("click", closeLogin);
elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;

  if (!supabaseClient) {
    elements.loginError.textContent = "Supabase no esta disponible.";
    elements.loginError.hidden = false;
    return;
  }

  try {
    const client = ensureSupabase();
    const { error } = await client.auth.signInWithPassword({
      email: username,
      password
    });

    if (error) throw error;

    setAdminAuthenticated(true);
    elements.loginError.hidden = true;
    closeLogin();
    openAdmin();
  } catch (error) {
    console.error("Admin login failed", error);
    elements.loginError.textContent = "Email o contraseña incorrectos.";
    elements.loginError.hidden = false;
  }
});
elements.adminTrigger.addEventListener("click", () => {
  if (state.adminMode) return;
  adminTapCount += 1;
  if (adminTapCount >= hiddenAdminClicksNeeded) {
    adminTapCount = 0;
    if (isAdminAuthenticated()) {
      openAdmin();
    } else {
      openLogin();
    }
  }
  setTimeout(() => {
    adminTapCount = 0;
  }, 1200);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeLogin();
    closeAdminDrawer();
    closeImageModal();
    closeMediaModal();
  }
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-mode");
  elements.printCatalog.hidden = true;
  if (savedPrintView) {
    state.search = savedPrintView.search;
    state.category = savedPrintView.category;
    state.brand = savedPrintView.brand;
    elements.searchInput.value = savedPrintView.searchInput;
    elements.categoryFilter.value = savedPrintView.categoryFilter;
    elements.brandFilter.value = savedPrintView.brandFilter;
    savedPrintView = null;
  }
  if (restoreAdminAfterPrint && isAdminAuthenticated()) {
    openAdmin();
  } else {
    renderProducts();
  }
  restoreAdminAfterPrint = false;
});
elements.sendOrder.addEventListener("click", () => {
  if (state.cart.length) {
    window.open(buildWhatsappLink(state.cart), "_blank", "noopener,noreferrer");
  }
});

initializeCatalog();
