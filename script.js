const whatsappNumber = "524791382982";
const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const hiddenAdminClicksNeeded = 5;
const supabaseConfig = {
  url: "https://lvsslzdxvrqgskjydwjt.supabase.co",
  anonKey: "sb_publishable_EGStQ8AySDkRHi2MjZ6AOQ_TJ5w417_",
  table: "products",
  ordersTable: "orders",
  orderItemsTable: "order_items"
};
const fieldPlaceholders = {
  category: "Categoria",
  brand: "Marca",
  name: "Nombre del producto",
  type: "Tipo",
  barcode: "Codigo de barras",
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
  barcode: product.barcode || "",
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
  orders: [],
  adminMode: false,
  adminStatus: "Todos",
  remoteReady: false,
  remoteEnabled: false,
  saving: false,
  orderSubmitting: false
};

const elements = {
  grid: document.querySelector("#product-grid"),
  printCatalog: document.querySelector("#print-catalog"),
  printGrid: document.querySelector("#print-grid"),
  template: document.querySelector("#product-card-template"),
  resultsCount: document.querySelector("#results-count"),
  saveToast: document.querySelector("#save-toast"),
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
  scannerModal: document.querySelector("#scanner-modal"),
  scannerModalBackdrop: document.querySelector("#scanner-modal-backdrop"),
  scannerReader: document.querySelector("#scanner-reader"),
  scannerHint: document.querySelector("#scanner-hint"),
  openScanner: document.querySelector("#open-scanner"),
  closeScanner: document.querySelector("#close-scanner"),
  scannerCancel: document.querySelector("#scanner-cancel"),
  adminTrigger: document.querySelector("#admin-trigger"),
  adminBar: document.querySelector("#admin-bar"),
  adminStatusFilter: document.querySelector("#admin-status-filter"),
  adminStatusNote: document.querySelector("#admin-status-note"),
  adminOpenOrders: document.querySelector("#admin-open-orders"),
  adminExportPdf: document.querySelector("#admin-export-pdf"),
  adminAddProduct: document.querySelector("#admin-add-product"),
  adminExit: document.querySelector("#admin-exit"),
  adminDrawer: document.querySelector("#admin-drawer"),
  ordersDrawer: document.querySelector("#orders-drawer"),
  ordersList: document.querySelector("#orders-list"),
  closeOrders: document.querySelector("#close-orders"),
  closeAdmin: document.querySelector("#close-admin"),
  adminForm: document.querySelector("#admin-form"),
  adminReset: document.querySelector("#admin-reset"),
  adminList: document.querySelector("#admin-list"),
  adminId: document.querySelector("#admin-id"),
  adminName: document.querySelector("#admin-name"),
  adminBrand: document.querySelector("#admin-brand"),
  adminCategory: document.querySelector("#admin-category"),
  adminType: document.querySelector("#admin-type"),
  adminBarcode: document.querySelector("#admin-barcode"),
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
let scannerUi = null;
let scannerClosing = false;
let restoreAdminAfterPrint = false;
let savedPrintView = null;
let printOrderSnapshot = null;

function createOrderId() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

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
    barcode: String(product.barcode || ""),
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
    barcode: product.barcode || "",
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
    barcode: product.barcode,
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

async function fetchRemoteOrders() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from(supabaseConfig.ordersTable)
    .select(`
      id,
      total,
      item_count,
      whatsapp_message,
      status,
      created_at,
      order_items (
        id,
        product_id,
        product_name,
        brand,
        category,
        tone,
        quantity,
        unit_price
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((order) => ({
    id: Number(order.id),
    total: order.total === null ? 0 : Number(order.total || 0),
    itemCount: Number(order.item_count || 0),
    whatsappMessage: order.whatsapp_message || "",
    status: order.status || "nuevo",
    createdAt: order.created_at || "",
    items: Array.isArray(order.order_items) ? order.order_items.map((item) => ({
      id: Number(item.id),
      productId: item.product_id === null ? null : Number(item.product_id),
      name: item.product_name || "",
      brand: item.brand || "",
      category: item.category || "",
      tone: item.tone || "",
      quantity: Number(item.quantity || 1),
      unitPrice: item.unit_price === null ? null : Number(item.unit_price)
    })) : []
  }));
}

async function createRemoteOrder(orderPayload, itemPayload) {
  const client = ensureSupabase();
  const orderId = createOrderId();
  const { error } = await client
    .from(supabaseConfig.ordersTable)
    .insert({ ...orderPayload, id: orderId });

  if (error) throw error;

  const items = itemPayload.map((item) => ({ ...item, order_id: orderId }));
  const { error: itemsError } = await client.from(supabaseConfig.orderItemsTable).insert(items);
  if (itemsError) throw itemsError;

  return orderId;
}

async function deleteRemoteOrder(orderId) {
  const client = ensureSupabase();
  const { error } = await client.from(supabaseConfig.ordersTable).delete().eq("id", Number(orderId));
  if (error) throw error;
}

function buildOrderRecord(orderId, groupedCart, orderPayload) {
  return {
    id: Number(orderId),
    total: Number(orderPayload.total || 0),
    itemCount: Number(orderPayload.item_count || 0),
    whatsappMessage: orderPayload.whatsapp_message || "",
    status: orderPayload.status || "nuevo",
    createdAt: new Date().toISOString(),
    items: groupedCart.map((item, index) => ({
      id: index + 1,
      productId: item.productId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      tone: item.tone || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }))
  };
}

async function loadProducts() {
  if (!supabaseClient) {
    products = baseProducts.map(normalizeProduct);
    state.remoteEnabled = false;
    state.remoteReady = false;
    return;
  }

  try {
    const remoteProducts = await fetchRemoteProducts();
    products = remoteProducts;
    state.remoteEnabled = true;
    state.remoteReady = true;
  } catch (error) {
    console.error("Supabase load failed", error);
    products = [];
    state.remoteEnabled = false;
    state.remoteReady = true;
    window.alert("No se pudo cargar el catalogo compartido. Revisa la conexion con Supabase.");
  }
}

async function persistProduct(product) {
  if (!state.remoteEnabled) {
    throw new Error("Catalogo remoto no disponible");
  }
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
  if (elements.saveToast) {
    elements.saveToast.textContent = message;
    elements.saveToast.hidden = !message;
    elements.saveToast.dataset.tone = tone;
  }
  if (!message) return;
  window.clearTimeout(showAdminStatus.timeoutId);
  showAdminStatus.timeoutId = window.setTimeout(() => {
    elements.adminStatusNote.hidden = true;
    elements.adminStatusNote.textContent = "";
    if (elements.saveToast) {
      elements.saveToast.hidden = true;
      elements.saveToast.textContent = "";
    }
  }, 2200);
}

function openAdminDrawer() {
  closeOrdersDrawer();
  elements.adminDrawer.classList.add("open");
  elements.adminDrawer.setAttribute("aria-hidden", "false");
  elements.backdrop.hidden = false;
}

function closeAdminDrawer() {
  elements.adminDrawer.classList.remove("open");
  elements.adminDrawer.setAttribute("aria-hidden", "true");
  if (!elements.cartDrawer.classList.contains("open") && !elements.ordersDrawer.classList.contains("open")) {
    elements.backdrop.hidden = true;
  }
}

function openOrdersDrawer() {
  closeAdminDrawer();
  elements.ordersDrawer.classList.add("open");
  elements.ordersDrawer.setAttribute("aria-hidden", "false");
  elements.backdrop.hidden = false;
}

function closeOrdersDrawer() {
  elements.ordersDrawer.classList.remove("open");
  elements.ordersDrawer.setAttribute("aria-hidden", "true");
  if (!elements.cartDrawer.classList.contains("open") && !elements.adminDrawer.classList.contains("open")) {
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
  elements.adminBarcode.value = product?.barcode || "";
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

function groupCartItems(items) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = String(item.id);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    grouped.set(key, {
      productId: Number(item.id),
      name: item.name || "",
      brand: item.brand || "",
      category: item.category || "",
      tone: item.tone || "",
      unitPrice: item.price === null ? null : Number(item.price),
      stock: item.stock,
      quantity: 1
    });
  });
  return Array.from(grouped.values());
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function renderOrders() {
  if (!elements.ordersList) return;
  elements.ordersList.innerHTML = "";

  if (!state.orders.length) {
    elements.ordersList.innerHTML = `<div class="empty-state">Aun no hay pedidos registrados.</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  state.orders.forEach((order) => {
    const article = document.createElement("article");
    article.className = "order-item";
    article.innerHTML = `
      <div class="order-item-head">
        <div>
          <p class="panel-label">Pedido #${order.id}</p>
          <h3>${escapeHtml(formatDateTime(order.createdAt))}</h3>
        </div>
        <span class="order-status">${escapeHtml(order.status)}</span>
      </div>
      <p class="order-meta">${escapeHtml(`${order.itemCount} producto(s) | ${currency.format(order.total || 0)}`)}</p>
      <div class="order-lines">
        ${order.items.map((item) => `
          <div class="order-line">
            <strong>${escapeHtml(item.name)}</strong>
            <span>x${item.quantity}</span>
            <small>${escapeHtml(item.tone || "No visible")} | ${escapeHtml(formatPrice(item.unitPrice))}</small>
          </div>
        `).join("")}
      </div>
      <div class="order-actions">
        <button class="admin-edit order-pdf" type="button">PDF</button>
        <button class="admin-delete order-delete" type="button">Eliminar</button>
      </div>
    `;
    article.querySelector(".order-pdf").addEventListener("click", () => exportOrderPdf(order.id));
    article.querySelector(".order-delete").addEventListener("click", () => deleteOrderRecord(order.id));
    fragment.appendChild(article);
  });

  elements.ordersList.appendChild(fragment);
}

async function loadOrders() {
  if (!supabaseClient || !isAdminAuthenticated()) {
    state.orders = [];
    renderOrders();
    return;
  }

  try {
    state.orders = await fetchRemoteOrders();
  } catch (error) {
    console.error("Orders load failed", error);
    state.orders = [];
    showAdminStatus("No se pudieron cargar los pedidos", "error");
  }
  renderOrders();
}

function renderOrderPdf(order) {
  printOrderSnapshot = order;
  elements.printCatalog.hidden = false;
  elements.printCatalog.classList.add("is-order-sheet");
  elements.printCatalog.innerHTML = `
    <section class="order-sheet">
      <header class="order-sheet-header">
        <div>
          <p>Rose Gold Luxury</p>
          <h1>Cotizacion de pedido</h1>
        </div>
        <div class="order-sheet-meta">
          <span>Pedido #${escapeHtml(order.id)}</span>
          <span>${escapeHtml(formatDateTime(order.createdAt))}</span>
          <span>${escapeHtml(order.status)}</span>
        </div>
      </header>
      <section class="order-sheet-body">
        <div class="order-sheet-lines">
          ${order.items.map((item) => `
            <article class="order-sheet-line">
              <div>
                <h2>${escapeHtml(item.name)}</h2>
                <p>${escapeHtml(item.brand)} | ${escapeHtml(item.category)}</p>
                <small>Tono: ${escapeHtml(item.tone || "No visible")}</small>
              </div>
              <div class="order-sheet-numbers">
                <strong>x${item.quantity}</strong>
                <span>${escapeHtml(formatPrice(item.unitPrice))}</span>
              </div>
            </article>
          `).join("")}
        </div>
        <footer class="order-sheet-footer">
          <div>
            <p>Total de piezas</p>
            <strong>${escapeHtml(order.itemCount)}</strong>
          </div>
          <div>
            <p>Total estimado</p>
            <strong>${escapeHtml(currency.format(order.total || 0))}</strong>
          </div>
        </footer>
      </section>
    </section>
  `;
}

function exportOrderPdf(orderId) {
  const order = state.orders.find((item) => Number(item.id) === Number(orderId));
  if (!order) return;
  restoreAdminAfterPrint = state.adminMode;
  renderOrderPdf(order);
  document.body.classList.add("print-mode");
  window.setTimeout(() => {
    window.print();
  }, 60);
}

async function deleteOrderRecord(orderId) {
  if (!window.confirm("Eliminar este pedido?")) return;

  try {
    await deleteRemoteOrder(orderId);
    state.orders = state.orders.filter((order) => Number(order.id) !== Number(orderId));
    renderOrders();
    showAdminStatus("Pedido eliminado", "success");
  } catch (error) {
    console.error("Order delete failed", error);
    showAdminStatus("No se pudo eliminar el pedido", "error");
  }
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

async function openScannerModal() {
  if (typeof window.Html5QrcodeScanner !== "function") {
    showAdminStatus("Tu navegador no soporta escaneo aqui", "error");
    return;
  }

  try {
    elements.scannerModal.hidden = false;
    elements.scannerHint.textContent = "Apunta la camara al codigo de barras o sube una imagen del codigo.";
    elements.scannerReader.innerHTML = "";

    const formats = window.Html5QrcodeSupportedFormats
      ? [
          window.Html5QrcodeSupportedFormats.EAN_13,
          window.Html5QrcodeSupportedFormats.EAN_8,
          window.Html5QrcodeSupportedFormats.UPC_A,
          window.Html5QrcodeSupportedFormats.UPC_E,
          window.Html5QrcodeSupportedFormats.CODE_128,
          window.Html5QrcodeSupportedFormats.CODE_39
        ]
      : undefined;

    scannerUi = new window.Html5QrcodeScanner(
      "scanner-reader",
      {
        fps: 10,
        qrbox: { width: 260, height: 140 },
        aspectRatio: 1.777778,
        rememberLastUsedCamera: true,
        supportedScanTypes: window.Html5QrcodeScanType
          ? [
              window.Html5QrcodeScanType.SCAN_TYPE_CAMERA,
              window.Html5QrcodeScanType.SCAN_TYPE_FILE
            ]
          : undefined,
        formatsToSupport: formats
      },
      false
    );

    scannerUi.render(
      (decodedText) => {
        const rawValue = String(decodedText || "").trim();
        if (!rawValue || scannerClosing) return;
        const product = products.find((item) => String(item.barcode || "").trim() === rawValue);
        if (!product) {
          elements.scannerHint.textContent = `Codigo no encontrado: ${rawValue}`;
          return;
        }

        scannerClosing = true;
        addToCart(product.id);
        showAdminStatus(`Agregado: ${product.name}`, "success");
        closeScannerModal();
      },
      () => {
        // sin ruido en cada frame fallido
      }
    );
  } catch {
    showAdminStatus("No se pudo abrir el escaner", "error");
  }
}

function closeScannerModal() {
  scannerClosing = false;
  if (elements.scannerModal) {
    elements.scannerModal.hidden = true;
  }
  const currentScanner = scannerUi;
  scannerUi = null;
  if (currentScanner?.clear) {
    currentScanner.clear().catch(() => {});
  }
  if (elements.scannerReader) {
    elements.scannerReader.innerHTML = "";
  }
}

function openCart() {
  closeOrdersDrawer();
  elements.cartDrawer.classList.add("open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  elements.backdrop.hidden = false;
}

function closeCart() {
  elements.cartDrawer.classList.remove("open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  if (!elements.adminDrawer.classList.contains("open") && !elements.ordersDrawer.classList.contains("open")) {
    elements.backdrop.hidden = true;
  }
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
  loadOrders();
}

function closeAdmin() {
  state.adminMode = false;
  elements.adminBar.hidden = true;
  document.body.classList.remove("admin-mode");
  closeAdminDrawer();
  closeOrdersDrawer();
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
    barcode: current.barcode || "",
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
    name: "",
    brand: "",
    category: "",
    type: "",
    barcode: "",
    description: "",
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
    const addToCartInlineButton = node.querySelector(".add-to-cart-inline");
    const buyNowLink = node.querySelector(".buy-now");
    addToCartButton.disabled = !isAvailable(product);
    addToCartInlineButton.disabled = !isAvailable(product);
    addToCartInlineButton.textContent = isAvailable(product) ? "Agregar" : "Agotado";
    addToCartInlineButton.classList.toggle("is-disabled", !isAvailable(product));
    buyNowLink.href = isAvailable(product) ? buildWhatsappLink([product]) : "#";
    buyNowLink.textContent = isAvailable(product) ? "Pedir ahora" : "Agotado";
    buyNowLink.classList.toggle("is-disabled", !isAvailable(product));
    addToCartButton.addEventListener("click", () => addToCart(product.id));
    addToCartInlineButton.addEventListener("click", () => addToCart(product.id));
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
  showAdminStatus("Producto agregado al pedido", "success");
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const groupedCart = groupCartItems(state.cart);
  elements.heroCartCount.textContent = String(state.cart.length);
  elements.cartItems.innerHTML = "";

  if (!groupedCart.length) {
    elements.cartItems.innerHTML = `<div class="empty-state">Aun no agregas productos. Usa "Agregar" para armar el pedido.</div>`;
  } else {
    const fragment = document.createDocumentFragment();
    groupedCart.forEach((item) => {
      const wrapper = document.createElement("article");
      wrapper.className = "cart-item";
      wrapper.innerHTML = `
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.brand)} | ${escapeHtml(item.category)}</p>
        <p>Cantidad: ${item.quantity}</p>
        <p>Estado: ${formatAvailability(item.stock)}</p>
        <p>Tono: ${escapeHtml(item.tone || "No visible")}</p>
        <p>Precio: ${formatPrice(item.unitPrice)}</p>
        <button class="cart-remove" type="button">Quitar</button>
      `;
      wrapper.querySelector(".cart-remove").addEventListener("click", () => {
        const index = state.cart.findIndex((cartItem) => Number(cartItem.id) === Number(item.productId));
        if (index >= 0) removeFromCart(index);
      });
      fragment.appendChild(wrapper);
    });
    elements.cartItems.appendChild(fragment);
  }

  const summary = getCartSummary();
  elements.cartTotal.textContent = summary.totalLabel;
  elements.cartDisclaimer.textContent = summary.missingPrices
    ? "Hay productos sin precio cargado. El mensaje los enviara como precio por confirmar."
    : "Todos los productos del pedido tienen precio cargado.";
  elements.sendOrder.disabled = !state.cart.length || state.orderSubmitting;
  elements.sendOrder.textContent = state.orderSubmitting ? "Guardando pedido..." : "Enviar pedido por WhatsApp";
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
  renderOrders();
}

async function submitOrder() {
  if (!state.cart.length || state.orderSubmitting) return;

  const groupedCart = groupCartItems(state.cart);
  const whatsappUrl = buildWhatsappLink(state.cart);
  const whatsappMessage = decodeURIComponent(whatsappUrl.split("?text=")[1] || "");
  const orderPayload = {
    total: getCartSummary().total,
    item_count: groupedCart.reduce((sum, item) => sum + item.quantity, 0),
    whatsapp_message: whatsappMessage,
    status: "nuevo"
  };
  const itemPayload = groupedCart.map((item) => ({
    product_id: item.productId,
    product_name: item.name,
    brand: item.brand,
    category: item.category,
    tone: item.tone || "",
    quantity: item.quantity,
    unit_price: item.unitPrice
  }));
  const pendingWindow = window.open("", "_blank");

  try {
    state.orderSubmitting = true;
    renderCart();
    let orderId = createOrderId();
    if (supabaseClient) {
      orderId = await createRemoteOrder(orderPayload, itemPayload);
    }
    const nextOrder = buildOrderRecord(orderId, groupedCart, orderPayload);
    state.orders.unshift(nextOrder);
    renderOrders();
    if (pendingWindow) {
      pendingWindow.location.href = whatsappUrl;
      pendingWindow.opener = null;
    } else {
      window.location.href = whatsappUrl;
    }
    state.cart = [];
    renderCart();
    showAdminStatus("Pedido registrado", "success");
  } catch (error) {
    console.error("Order submit failed", error);
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.close();
    }
    showAdminStatus("No se pudo registrar el pedido", "error");
  } finally {
    state.orderSubmitting = false;
    renderCart();
  }
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
  closeOrdersDrawer();
});
elements.imageModalClose.addEventListener("click", closeImageModal);
elements.imageModalBackdrop.addEventListener("click", closeImageModal);
elements.mediaModalClose.addEventListener("click", closeMediaModal);
elements.mediaModalBackdrop.addEventListener("click", closeMediaModal);
elements.mediaModalCancel.addEventListener("click", closeMediaModal);
elements.openScanner.addEventListener("click", openScannerModal);
elements.closeScanner.addEventListener("click", closeScannerModal);
elements.scannerCancel.addEventListener("click", closeScannerModal);
elements.scannerModalBackdrop.addEventListener("click", closeScannerModal);
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
elements.adminOpenOrders.addEventListener("click", async () => {
  await loadOrders();
  openOrdersDrawer();
});
elements.closeOrders.addEventListener("click", closeOrdersDrawer);
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
    barcode: elements.adminBarcode.value.trim(),
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
    closeOrdersDrawer();
    closeScannerModal();
    closeImageModal();
    closeMediaModal();
  }
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-mode");
  elements.printCatalog.hidden = true;
  elements.printCatalog.classList.remove("is-order-sheet");
  elements.printCatalog.innerHTML = `
    <header class="print-header">
      <p>Rose Gold Luxury</p>
      <h1>Catalogo Digital</h1>
    </header>
    <section class="print-grid" id="print-grid"></section>
  `;
  elements.printGrid = document.querySelector("#print-grid");
  printOrderSnapshot = null;
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
elements.sendOrder.addEventListener("click", submitOrder);

initializeCatalog();
