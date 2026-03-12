const whatsappNumber = "524791382982";
const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const storageKey = "catalog_products_override_v1";
const hiddenAdminClicksNeeded = 5;
const adminCredentials = {
  username: "admin",
  password: "RoseGold2026"
};
const fieldPlaceholders = {
  category: "Categoria",
  brand: "Marca",
  name: "Nombre del producto",
  type: "Tipo",
  description: "Descripcion",
  tone: "Tono",
  price: "Precio"
};

const baseProducts = (window.CATALOG_PRODUCTS || []).map((product, index) => ({
  id: product.id ?? index + 1,
  name: product.name || "",
  brand: product.brand || "",
  category: product.category || "",
  type: product.type || "",
  description: product.description || "",
  tone: product.tone || "",
  price: typeof product.price === "number" && !Number.isNaN(product.price) ? product.price : null,
  imageUrl: product.imageUrl || "",
  referenceUrl: product.referenceUrl || "",
  imageKey: product.imageKey || `${product.name || ""}__${product.category || ""}__${product.type || ""}`
})).filter((product) => product.name && product.category && product.type);

let products = [];
const state = { search: "", category: "Todas", brand: "Todas", cart: [], adminMode: false };

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
  mediaReferenceUrl: document.querySelector("#media-reference-url"),
  mediaModalCancel: document.querySelector("#media-modal-cancel"),
  adminTrigger: document.querySelector("#admin-trigger"),
  adminBar: document.querySelector("#admin-bar"),
  adminExportPdf: document.querySelector("#admin-export-pdf"),
  adminAddProduct: document.querySelector("#admin-add-product"),
  adminExit: document.querySelector("#admin-exit"),
  openCart: document.querySelector("#open-cart"),
  closeCart: document.querySelector("#close-cart"),
  sendOrder: document.querySelector("#send-order")
};

let adminTapCount = 0;
let currentMediaProductId = null;
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

function loadProducts() {
  const stored = localStorage.getItem(storageKey);
  let source = baseProducts;
  if (stored) {
    try {
      source = JSON.parse(stored);
    } catch {
      source = baseProducts;
    }
  }
  products = source.map((product, index) => ({
    ...product,
    id: product.id ?? index + 1,
    price: typeof product.price === "number" && !Number.isNaN(product.price) ? product.price : null,
    imageKey: product.imageKey || makeImageKey(product)
  })).filter((product) => product.name && product.category && product.type);
}

function saveProducts() {
  localStorage.setItem(storageKey, JSON.stringify(products));
}

function formatPrice(price) {
  return price === null ? "Precio por confirmar" : currency.format(price);
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
    return matchesSearch && matchesCategory && matchesBrand;
  });
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
    ...items.map((item, index) => `${index + 1}. ${item.name} | Tono: ${item.tone || "No visible"} | Precio: ${formatPrice(item.price)}`),
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
  elements.mediaReferenceUrl.value = product.referenceUrl || "";
  elements.mediaModal.hidden = false;
  setTimeout(() => elements.mediaImageUrl.focus(), 0);
}

function closeMediaModal() {
  currentMediaProductId = null;
  elements.mediaModal.hidden = true;
  elements.mediaForm.reset();
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
  renderProducts();
}

function closeAdmin() {
  state.adminMode = false;
  elements.adminBar.hidden = true;
  document.body.classList.remove("admin-mode");
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
          <p class="print-price">${formatPrice(product.price)}</p>
        </div>
      </div>
    </article>
  `).join("");
}

function updateProduct(productId, updates) {
  const index = products.findIndex((item) => Number(item.id) === Number(productId));
  if (index < 0) return;
  const next = { ...products[index], ...updates };
  next.imageKey = makeImageKey(next);
  products[index] = next;
  saveProducts();
  refreshFilters();
  renderProducts();
  renderCart();
}

function saveProductFromCard(card) {
  const productId = Number(card.dataset.productId);
  const current = products.find((item) => Number(item.id) === productId);
  if (!current) return;
  const values = {};
  card.querySelectorAll("[data-field]").forEach((field) => {
    values[field.dataset.field] = field.textContent.trim();
  });
  updateProduct(productId, {
    name: values.name || current.name,
    brand: values.brand || current.brand,
    category: values.category || current.category,
    type: values.type || current.type,
    description: values.description || current.description,
    tone: values.tone || "",
    price: values.price ? Number(values.price) : null
  });
}

function deleteProduct(productId) {
  if (!window.confirm("Eliminar este producto?")) return;
  products = products.filter((item) => Number(item.id) !== Number(productId));
  state.cart = state.cart.filter((item) => Number(item.id) !== Number(productId));
  saveProducts();
  refreshFilters();
  renderProducts();
  renderCart();
}

function createBlankProduct() {
  const nextId = products.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const draft = {
    id: nextId,
    name: "",
    brand: "",
    category: "",
    type: "",
    description: "",
    tone: "",
    price: null,
    imageUrl: "",
    referenceUrl: ""
  };
  draft.imageKey = makeImageKey(draft);
  products.unshift(draft);
  saveProducts();
  refreshFilters();
  renderProducts();
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
    const tone = node.querySelector(".product-tone");
    const price = node.querySelector(".product-price");
    const initial = node.querySelector(".product-initial");
    const editFlag = node.querySelector(".product-edit-flag");
    const adminActions = node.querySelector(".product-admin-actions");
    const saveBtn = node.querySelector(".admin-card-save");
    const deleteBtn = node.querySelector(".admin-card-delete");
    const image = node.querySelector(".product-image");
    const art = node.querySelector(".product-art");

    card.dataset.productId = String(product.id);
    badge.textContent = product.category || "";
    brand.textContent = product.brand || "";
    name.textContent = product.name || "";
    type.textContent = product.type || "";
    description.textContent = product.description || "";
    tone.textContent = state.adminMode ? (product.tone || "") : (product.tone || "No visible");
    price.textContent = state.adminMode ? (product.price ?? "") : formatPrice(product.price);
    initial.textContent = (product.name || "N").slice(0, 1).toUpperCase();

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
        [tone, "tone"],
        [price, "price"]
      ].forEach(([el, field]) => {
        el.contentEditable = "true";
        el.classList.add("editable-field");
        el.dataset.field = field;
        el.dataset.placeholder = fieldPlaceholders[field] || "";
      });
      saveBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        saveProductFromCard(card);
        saveBtn.textContent = "Guardado";
        saveBtn.classList.add("is-saved");
        window.setTimeout(() => {
          saveBtn.textContent = "Guardar";
          saveBtn.classList.remove("is-saved");
        }, 1400);
      });
      deleteBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteProduct(card.dataset.productId);
      });
    } else {
      editFlag.hidden = true;
      adminActions.hidden = true;
    }

    node.querySelector(".add-to-cart").addEventListener("click", () => addToCart(product.id));
    node.querySelector(".buy-now").href = buildWhatsappLink([product]);
    fragment.appendChild(node);
  });

  elements.grid.appendChild(fragment);
}

function addToCart(productId) {
  const product = products.find((item) => Number(item.id) === Number(productId));
  if (!product) return;
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

loadProducts();
setAdminAuthenticated(false);
state.adminMode = false;
refreshFilters();
closeImageModal();
elements.adminBar.hidden = true;

elements.searchInput.addEventListener("input", syncFilters);
elements.categoryFilter.addEventListener("change", syncFilters);
elements.brandFilter.addEventListener("change", syncFilters);
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
elements.backdrop.addEventListener("click", closeCart);
elements.imageModalClose.addEventListener("click", closeImageModal);
elements.imageModalBackdrop.addEventListener("click", closeImageModal);
elements.mediaModalClose.addEventListener("click", closeMediaModal);
elements.mediaModalBackdrop.addEventListener("click", closeMediaModal);
elements.mediaModalCancel.addEventListener("click", closeMediaModal);
elements.adminExportPdf.addEventListener("click", exportCatalogPdf);
elements.mediaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentMediaProductId === null) return;
  updateProduct(currentMediaProductId, {
    imageUrl: elements.mediaImageUrl.value.trim(),
    referenceUrl: elements.mediaReferenceUrl.value.trim()
  });
  closeMediaModal();
});
elements.adminAddProduct.addEventListener("click", createBlankProduct);
elements.adminExit.addEventListener("click", () => {
  setAdminAuthenticated(false);
  closeAdmin();
});
elements.closeLogin.addEventListener("click", closeLogin);
elements.loginModalBackdrop.addEventListener("click", closeLogin);
elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    setAdminAuthenticated(true);
    closeLogin();
    openAdmin();
  } else {
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

renderProducts();
renderCart();
