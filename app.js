const TOKEN_KEY = "tecnalisis_session_token";
const DEMO_STORAGE_KEY = "tecnalisis_demo_services_v2";

const ROLE_LABEL = {
  admin: "Administrador",
  technician: "Técnico",
  engineer: "Ingeniero"
};

const DEFAULT_JOB_TITLE = {
  admin: "Administrador",
  technician: "Técnico",
  engineer: "Ingeniero"
};

const STATUS_LABELS = ["Pendiente", "En progreso", "En revisión", "Completado"];
const PRIORITY_LABELS = ["Alta", "Media", "Baja"];
const PHOTO_UPLOAD_ENABLED = false;

const DEMO_USERS = [
  { id: "demo-admin", fullName: "Juan Paniagua", email: "juandpaniagual@gmail.com", role: "admin", jobTitle: "Administrador", active: true },
  { id: "demo-tech-1", fullName: "Carlos Ramírez", email: "carlos@tecnalisis.com", role: "technician", jobTitle: "Técnico senior", active: true },
  { id: "demo-tech-2", fullName: "María Torres", email: "maria@tecnalisis.com", role: "technician", jobTitle: "Técnica de campo", active: true },
  { id: "demo-eng-1", fullName: "Laura Gómez", email: "laura@tecnalisis.com", role: "engineer", jobTitle: "Ingeniera de seguimiento", active: true },
  { id: "demo-eng-2", fullName: "Andrés Silva", email: "andres@tecnalisis.com", role: "engineer", jobTitle: "Ingeniero de operaciones", active: true }
];

const DEMO_SERVICES = [
  {
    id: "OS-0007",
    client: "Clínica del Norte",
    serviceType: "Mantenimiento preventivo",
    equipment: "Unidad HVAC #03",
    site: "Sede principal",
    scheduledDate: "2026-06-27",
    technicianId: "demo-tech-1",
    engineerId: "demo-eng-1",
    priority: "Alta",
    status: "En progreso",
    description: "Limpieza de serpentines, medición de presiones y revisión eléctrica.",
    createdAt: "2026-06-25T08:20:00.000Z",
    products: [
      { productName: "Filtro HVAC", quantity: 2, unit: "unidad", unitPrice: 85000, totalPrice: 170000, notes: "Filtros de reposición instalados.", createdAt: "2026-06-27T09:10:00.000Z" }
    ],
    updates: [
      { author: "Juan Paniagua", note: "Orden creada y asignada a Carlos Ramírez.", createdAt: "2026-06-25T08:20:00.000Z" },
      { author: "Carlos Ramírez", note: "Servicio iniciado. Se detecta filtro con saturación alta.", createdAt: "2026-06-27T09:10:00.000Z" }
    ]
  },
  {
    id: "OS-0006",
    client: "Alimentos La Pradera",
    serviceType: "Mantenimiento correctivo",
    equipment: "Compresor industrial C-12",
    site: "Planta de producción",
    scheduledDate: "2026-06-27",
    technicianId: "demo-tech-2",
    engineerId: "demo-eng-2",
    priority: "Alta",
    status: "Pendiente",
    description: "Equipo presenta vibración inusual y aumento de temperatura.",
    createdAt: "2026-06-26T11:30:00.000Z",
    products: [],
    updates: [
      { author: "Andrés Silva", note: "Se solicita atención prioritaria por criticidad del activo.", createdAt: "2026-06-26T11:30:00.000Z" }
    ]
  },
  {
    id: "OS-0005",
    client: "Centro Comercial Bahía",
    serviceType: "Inspección técnica",
    equipment: "Ascensor Torre B",
    site: "Torre B",
    scheduledDate: "2026-06-26",
    technicianId: "demo-tech-1",
    engineerId: "demo-eng-1",
    priority: "Media",
    status: "En revisión",
    description: "Inspección trimestral de sistemas de seguridad y tracción.",
    createdAt: "2026-06-24T14:00:00.000Z",
    products: [],
    updates: [
      { author: "Carlos Ramírez", note: "Inspección terminada. Informe técnico listo para revisión.", createdAt: "2026-06-26T16:40:00.000Z" }
    ]
  },
  {
    id: "OS-0004",
    client: "Hotel Mirador",
    serviceType: "Mantenimiento preventivo",
    equipment: "Caldera principal",
    site: "Cuarto técnico",
    scheduledDate: "2026-06-24",
    technicianId: "demo-tech-2",
    engineerId: "demo-eng-2",
    priority: "Media",
    status: "Completado",
    description: "Mantenimiento semestral de caldera y prueba de emisiones.",
    createdAt: "2026-06-22T10:10:00.000Z",
    products: [
      { productName: "Kit mantenimiento caldera", quantity: 1, unit: "kit", unitPrice: 320000, totalPrice: 320000, notes: "Incluye empaques y consumibles.", createdAt: "2026-06-24T13:50:00.000Z" }
    ],
    updates: [
      { author: "María Torres", note: "Servicio finalizado sin novedades críticas.", createdAt: "2026-06-24T13:50:00.000Z" },
      { author: "Andrés Silva", note: "Servicio aprobado por ingeniería.", createdAt: "2026-06-24T15:20:00.000Z" }
    ]
  }
];

let serverMode = false;
let users = [...DEMO_USERS];
let services = loadDemoServices();
let currentUser = null;
let deferredInstallPrompt = null;

const state = {
  view: "dashboard",
  filters: {
    query: "",
    technician: "Todos",
    status: "Todos",
    priority: "Todas"
  },
  selectedServiceId: null,
  editingUserId: null
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadDemoServices() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "null");
    return Array.isArray(saved) ? saved : structuredClone(DEMO_SERVICES);
  } catch {
    return structuredClone(DEMO_SERVICES);
  }
}

function saveDemoServices() {
  if (!serverMode) localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(services));
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const savedToken = token();
  if (savedToken) headers.set("Authorization", `Bearer ${savedToken}`);

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Error ${response.status}`);
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function initials(name) {
  return String(name || "TS")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || "")
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

function formatDateTime(value) {
  if (!value) return "Ahora";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value)).replace(".", "");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function serviceProductTotal(service) {
  return (service.products || []).reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
}

function productFromValues(values) {
  if (!values.includeProduct) return [];
  const productName = String(values.productName || "").trim();
  if (!productName) return [];
  const quantity = Math.max(Number(values.productQuantity || 1), 0) || 1;
  const unitPrice = Math.max(Number(values.productUnitPrice || 0), 0);
  return [{
    productName,
    quantity,
    unit: String(values.productUnit || "unidad").trim() || "unidad",
    unitPrice,
    totalPrice: quantity * unitPrice,
    notes: String(values.productNotes || "").trim(),
    createdAt: new Date().toISOString()
  }];
}

function productsSummary(products = []) {
  if (!products.length) {
    return `<div class="empty">Este servicio no tiene productos o insumos vendidos.</div>`;
  }
  const total = products.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  return `
    <div class="product-summary">
      ${products.map(item => `
        <div class="product-item">
          <div>
            <strong>${escapeHtml(item.productName)}</strong>
            <small>${escapeHtml(item.quantity)} ${escapeHtml(item.unit || "unidad")} × ${escapeHtml(formatCurrency(item.unitPrice))}</small>
            ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}
          </div>
          <strong>${escapeHtml(formatCurrency(item.totalPrice))}</strong>
        </div>
      `).join("")}
      <div class="product-total">
        <span>Total productos / insumos</span>
        <span>${escapeHtml(formatCurrency(total))}</span>
      </div>
    </div>
  `;
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function photosSummary(photos = []) {
  if (!photos.length) {
    return `<div class="empty compact">Aún no hay fotos de evidencia en esta orden.</div>`;
  }

  return `
    <div class="photo-grid">
      ${photos.map(photo => `
        <a class="photo-card" href="${escapeHtml(photo.url)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.fileName || "Evidencia del servicio")}" loading="lazy">
          <span>${escapeHtml(photo.caption || photo.fileName || "Evidencia")}</span>
          <small>${escapeHtml(photo.uploadedBy || "Usuario")} · ${escapeHtml(formatDateTime(photo.createdAt))} · ${escapeHtml(formatFileSize(photo.fileSize))}</small>
        </a>
      `).join("")}
    </div>
  `;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function canDocumentService(service) {
  return currentUser.role === "admin" ||
    currentUser.role === "engineer" ||
    (currentUser.role === "technician" && service.technicianId === currentUser.id);
}

function userById(id) {
  return users.find(user => user.id === id) || {
    id: "",
    fullName: "Sin asignar",
    email: "",
    role: "technician",
    jobTitle: "Sin asignar",
    active: false
  };
}

function roleServices() {
  if (currentUser?.role === "technician") {
    return services.filter(service => service.technicianId === currentUser.id);
  }
  return services;
}

function serviceMatchesQuery(service, query) {
  const technician = userById(service.technicianId);
  const engineer = userById(service.engineerId);
  const text = [
    service.id,
    service.client,
    service.serviceType,
    service.equipment,
    service.site,
    technician.fullName,
    engineer.fullName,
    service.status,
    service.priority
  ].join(" ");
  return normalize(text).includes(normalize(query));
}

function filteredServices() {
  let output = roleServices();
  if (state.filters.query) output = output.filter(service => serviceMatchesQuery(service, state.filters.query));
  if (state.filters.technician !== "Todos") output = output.filter(service => service.technicianId === state.filters.technician);
  if (state.filters.status === "Abiertos") {
    output = output.filter(service => service.status !== "Completado");
  } else if (state.filters.status !== "Todos") {
    output = output.filter(service => service.status === state.filters.status);
  }
  if (state.filters.priority !== "Todas") output = output.filter(service => service.priority === state.filters.priority);
  return output;
}

function statusClass(status) {
  return {
    "Pendiente": "pending",
    "En progreso": "progress",
    "En revisión": "review",
    "Completado": "done"
  }[status] || "pending";
}

function priorityClass(priority) {
  return {
    "Alta": "high",
    "Media": "medium",
    "Baja": "low"
  }[priority] || "medium";
}

function avatar(user, small = false) {
  return `<span class="avatar ${small ? "small" : ""}">${escapeHtml(initials(user.fullName))}</span>`;
}

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  $("#toast-stack").appendChild(item);
  setTimeout(() => item.remove(), 3800);
}

function getShareUrl() {
  const host = window.location.hostname;
  if (host.endsWith(".pages.dev")) {
    const parts = host.split(".");
    if (parts.length > 3) {
      return `${window.location.protocol}//${parts.slice(-3).join(".")}`;
    }
  }
  return window.location.origin;
}

function isInstalledApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function updateInstallButtons() {
  const canInstall = !isInstalledApp();
  $$("[data-install-app]").forEach(button => {
    button.classList.toggle("hidden", !canInstall);
  });
}

async function installApp() {
  if (!deferredInstallPrompt) {
    toast("Si no aparece la instalación, abre el menú del navegador y elige Instalar app o Agregar a pantalla de inicio.");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallButtons();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => console.warn("Service worker no registrado", error));
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButtons();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButtons();
  toast("App instalada. Ahora puedes abrirla desde el ícono del celular.");
});

async function copyShareLink() {
  const url = getShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    toast("Enlace copiado para compartir.");
  } catch (error) {
    const input = $("#share-link-input");
    if (input) input.select();
    toast("Selecciona el enlace y cópialo manualmente.");
  }
}

function showOnly(section) {
  $("#login-screen").classList.toggle("hidden", section !== "login");
  $("#setup-screen").classList.toggle("hidden", section !== "setup");
  $("#app-shell").classList.toggle("hidden", section !== "app");
}

function showLogin(message = "") {
  showOnly("login");
  if (message) {
    $("#login-error").textContent = message;
    $("#login-error").classList.remove("hidden");
  } else {
    $("#login-error").classList.add("hidden");
  }
}

function showSetup(message = "") {
  showOnly("setup");
  if (message) {
    $("#setup-error").textContent = message;
    $("#setup-error").classList.remove("hidden");
  } else {
    $("#setup-error").classList.add("hidden");
  }
}

function showApp() {
  showOnly("app");
  render();
}

function enterDemo(role = "admin") {
  serverMode = false;
  users = structuredClone(DEMO_USERS);
  services = loadDemoServices();
  currentUser = users.find(user => user.role === role) || users[0];
  $("#demo-role").classList.remove("hidden");
  $("#demo-role").value = currentUser.role;
  showApp();
  toast("Modo demo activo. Los datos quedan solo en este navegador.");
}

async function loadServerData() {
  const [teamData, serviceData] = await Promise.all([
    api("/api/team"),
    api("/api/services")
  ]);
  users = teamData.users || [];
  services = serviceData.services || [];
}

async function start() {
  try {
    const setup = await api("/api/setup-status");
    if (setup.needsSetup) {
      showSetup();
      return;
    }

    if (!token()) {
      showLogin();
      return;
    }

    const me = await api("/api/me");
    currentUser = me.user;
    serverMode = true;
    $("#demo-role").classList.add("hidden");
    await loadServerData();
    showApp();
  } catch (error) {
    console.warn(error);
    showLogin("No se pudo conectar con Cloudflare D1. Revisa que el binding se llame DB o usa el modo demo.");
  }
}

async function createFirstAdmin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Creando...";
  $("#setup-error").classList.add("hidden");

  try {
    const result = await api("/api/bootstrap", {
      method: "POST",
      body: values
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    currentUser = result.user;
    serverMode = true;
    $("#demo-role").classList.add("hidden");
    await loadServerData();
    showApp();
    toast("Administrador creado correctamente.");
  } catch (error) {
    $("#setup-error").textContent = error.message;
    $("#setup-error").classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Crear administrador";
  }
}

async function signIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Ingresando...";
  $("#login-error").classList.add("hidden");

  try {
    const result = await api("/api/login", {
      method: "POST",
      body: values
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    currentUser = result.user;
    serverMode = true;
    $("#demo-role").classList.add("hidden");
    await loadServerData();
    showApp();
    toast("Sesión iniciada.");
  } catch (error) {
    $("#login-error").textContent = error.message || "No pudimos iniciar sesión.";
    $("#login-error").classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Ingresar";
  }
}

async function logout() {
  if (serverMode) {
    try {
      await api("/api/logout", { method: "POST" });
    } catch {
      // Si la sesión ya expiró, limpiamos local igualmente.
    }
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    showLogin();
    return;
  }
  enterDemo();
}

function pageHead(title, subtitle, actions = "") {
  return `
    <div class="page-head">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="head-actions">${actions}</div>
    </div>
  `;
}

function metric(label, value, detail, tone, filterStatus = "Todos") {
  return `
    <button type="button" class="metric-card metric-${tone}" data-dashboard-status="${escapeHtml(filterStatus)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
      <em>Ver servicios</em>
    </button>
  `;
}

function serviceRow(service) {
  const technician = userById(service.technicianId);
  return `
    <div class="service-row" data-service-id="${escapeHtml(service.id)}">
      <span class="order-code">${escapeHtml(service.id)}</span>
      <div>
        <strong>${escapeHtml(service.serviceType)}</strong>
        <small>${escapeHtml(service.equipment)}</small>
      </div>
      <div>
        <strong>${escapeHtml(service.client)}</strong>
        <small>${escapeHtml(service.site || "Sin sede")}</small>
      </div>
      <span class="person">${avatar(technician, true)} ${escapeHtml(technician.fullName)}</span>
      <span>${escapeHtml(formatDate(service.scheduledDate))}</span>
      <span class="status status-${statusClass(service.status)}">${escapeHtml(service.status)}</span>
    </div>
  `;
}

function renderDashboard() {
  const visible = roleServices();
  const open = visible.filter(service => service.status !== "Completado").length;
  const inProgress = visible.filter(service => service.status === "En progreso").length;
  const review = visible.filter(service => service.status === "En revisión").length;
  const completed = visible.filter(service => service.status === "Completado").length;
  const next = [...visible].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).slice(0, 5);
  const recent = [...visible].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const total = Math.max(visible.length, 1);
  const byStatus = STATUS_LABELS.map(status => ({
    label: status,
    count: visible.filter(service => service.status === status).length
  }));
  const byTechnician = users
    .filter(user => user.role === "technician" && user.active !== false)
    .map(user => ({
      user,
      count: visible.filter(service => service.technicianId === user.id).length
    }))
    .filter(item => item.count > 0 || currentUser.role !== "technician");

  $("#content").innerHTML = `
    ${pageHead(
      `Hola, ${currentUser.fullName.split(" ")[0]}`,
      currentUser.role === "technician"
        ? "Estos son tus servicios asignados."
        : "Aquí tienes el estado general de la operación."
    )}
    <div class="metrics-grid">
      ${metric("Servicios abiertos", open, "Pendientes o en ejecución", "teal", "Abiertos")}
      ${metric("En progreso", inProgress, "Actualmente en campo", "blue", "En progreso")}
      ${metric("En revisión", review, "Requieren seguimiento", "amber", "En revisión")}
      ${metric("Completados", completed, "Cerrados y aprobados", "violet", "Completado")}
    </div>
    <div class="grid-two dashboard-insights">
      <section class="panel">
        <div class="panel-head"><div><h2>Filtrar por estado</h2><p>Clic en una barra para ver el detalle</p></div></div>
        <div class="bar-list">
          ${byStatus.map(item => `
            <button type="button" class="bar-item interactive-bar" data-dashboard-status="${escapeHtml(item.label)}">
              <span>${escapeHtml(item.label)}</span>
              <span class="bar-track"><i style="width:${Math.round((item.count / total) * 100)}%"></i></span>
              <strong>${item.count}</strong>
            </button>
          `).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>Filtrar por técnico</h2><p>Clic para revisar servicios asignados</p></div></div>
        <div class="bar-list">
          ${byTechnician.length ? byTechnician.map(item => `
            <button type="button" class="bar-item interactive-bar" data-dashboard-technician="${escapeHtml(item.user.id)}">
              <span>${escapeHtml(item.user.fullName)}</span>
              <span class="bar-track"><i style="width:${Math.round((item.count / total) * 100)}%"></i></span>
              <strong>${item.count}</strong>
            </button>
          `).join("") : `<div class="empty compact">Aún no hay técnicos con servicios.</div>`}
        </div>
      </section>
    </div>
    <div class="grid-two">
      <section class="panel">
        <div class="panel-head">
          <div><h2>Próximos servicios</h2><p>Órdenes visibles para tu rol</p></div>
          <button class="secondary-button" data-go="services">Ver todos</button>
        </div>
        <div class="service-list">
          ${next.length ? next.map(serviceRow).join("") : `<div class="empty">No hay servicios programados.</div>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div><h2>Actividad reciente</h2><p>Últimas novedades registradas</p></div>
        </div>
        <div class="timeline">
          ${recent.length ? recent.map(service => {
            const update = service.updates.at(-1);
            return `
              <div class="timeline-item timeline-clickable" data-service-id="${escapeHtml(service.id)}">
                <p><strong>${escapeHtml(service.id)}</strong> · ${escapeHtml(update?.note || service.description)}</p>
                <small>${escapeHtml(update?.author || "Sistema")} · ${escapeHtml(formatDateTime(update?.createdAt || service.createdAt))}</small>
              </div>
            `;
          }).join("") : `<div class="empty">Aún no hay actividad.</div>`}
        </div>
      </section>
    </div>
  `;
  wireServiceClicks();
  wireGoButtons();
  wireDashboardInteractions();
}

function technicianFilterOptions() {
  const technicians = currentUser.role === "technician"
    ? [currentUser]
    : users.filter(user => user.role === "technician" && user.active !== false);
  return `<option value="Todos">Todos los técnicos</option>` + technicians
    .map(user => `<option value="${escapeHtml(user.id)}" ${state.filters.technician === user.id ? "selected" : ""}>${escapeHtml(user.fullName)}</option>`)
    .join("");
}

function renderServices() {
  const output = filteredServices();
  $("#content").innerHTML = `
    ${pageHead(
      currentUser.role === "technician" ? "Mis servicios" : "Órdenes de servicio",
      `${output.length} orden${output.length === 1 ? "" : "es"} encontrada${output.length === 1 ? "" : "s"}`,
      `<button class="secondary-button" id="export-button">Exportar CSV</button>`
    )}
    <div class="filter-bar">
      <input id="filter-query" value="${escapeHtml(state.filters.query)}" placeholder="Buscar por cliente, equipo, orden o técnico..." />
      <select id="filter-technician">${technicianFilterOptions()}</select>
      <select id="filter-status">
        <option ${state.filters.status === "Todos" ? "selected" : ""}>Todos</option>
        <option ${state.filters.status === "Abiertos" ? "selected" : ""}>Abiertos</option>
        ${STATUS_LABELS.map(status => `<option ${state.filters.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
      <select id="filter-priority">
        <option>Todas</option>
        ${PRIORITY_LABELS.map(priority => `<option ${state.filters.priority === priority ? "selected" : ""}>${priority}</option>`).join("")}
      </select>
    </div>
    <section class="panel table-wrap">
      <table class="services-table">
        <thead>
          <tr>
            <th>ORDEN</th>
            <th>SERVICIO / EQUIPO</th>
            <th>CLIENTE</th>
            <th>TÉCNICO</th>
            <th>FECHA</th>
            <th>PRIORIDAD</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody>
          ${output.length ? output.map(service => {
            const technician = userById(service.technicianId);
            return `
              <tr data-service-id="${escapeHtml(service.id)}">
                <td><span class="order-code">${escapeHtml(service.id)}</span></td>
                <td><strong>${escapeHtml(service.serviceType)}</strong><br><small>${escapeHtml(service.equipment)}</small></td>
                <td>${escapeHtml(service.client)}<br><small>${escapeHtml(service.site || "Sin sede")}</small></td>
                <td><span class="person">${avatar(technician, true)} ${escapeHtml(technician.fullName)}</span></td>
                <td>${escapeHtml(formatDate(service.scheduledDate))}</td>
                <td><span class="priority priority-${priorityClass(service.priority)}">${escapeHtml(service.priority)}</span></td>
                <td><span class="status status-${statusClass(service.status)}">${escapeHtml(service.status)}</span></td>
              </tr>
            `;
          }).join("") : `<tr><td colspan="7"><div class="empty">No encontramos servicios con esos filtros.</div></td></tr>`}
        </tbody>
      </table>
    </section>
  `;

  $("#filter-query").addEventListener("input", event => {
    state.filters.query = event.target.value;
    renderServices();
    $("#filter-query").focus();
  });
  $("#filter-technician").addEventListener("change", event => {
    state.filters.technician = event.target.value;
    renderServices();
  });
  $("#filter-status").addEventListener("change", event => {
    state.filters.status = event.target.value;
    renderServices();
  });
  $("#filter-priority").addEventListener("change", event => {
    state.filters.priority = event.target.value;
    renderServices();
  });
  $("#export-button").addEventListener("click", exportCsv);
  wireServiceClicks();
}

function renderReports() {
  const visible = roleServices();
  const total = Math.max(visible.length, 1);
  const byStatus = STATUS_LABELS.map(status => ({
    label: status,
    count: visible.filter(service => service.status === status).length
  }));
  const byTechnician = users
    .filter(user => user.role === "technician")
    .map(user => ({
      user,
      count: visible.filter(service => service.technicianId === user.id).length
    }))
    .filter(item => item.count > 0 || currentUser.role !== "technician");

  $("#content").innerHTML = `
    ${pageHead("Informes", "Indicadores rápidos de mantenimiento", `<button class="secondary-button" id="export-report">Descargar CSV</button>`)}
    <div class="grid-two">
      <section class="panel">
        <div class="panel-head"><div><h2>Servicios por estado</h2><p>Distribución operacional</p></div></div>
        <div class="bar-list">
          ${byStatus.map(item => `
            <div class="bar-item">
              <span>${escapeHtml(item.label)}</span>
              <span class="bar-track"><i style="width:${Math.round((item.count / total) * 100)}%"></i></span>
              <strong>${item.count}</strong>
            </div>
          `).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>Servicios por técnico</h2><p>Carga de trabajo asignada</p></div></div>
        <div class="bar-list">
          ${byTechnician.length ? byTechnician.map(item => `
            <div class="bar-item">
              <span>${escapeHtml(item.user.fullName)}</span>
              <span class="bar-track"><i style="width:${Math.round((item.count / total) * 100)}%"></i></span>
              <strong>${item.count}</strong>
            </div>
          `).join("") : `<div class="empty">Aún no hay técnicos con servicios.</div>`}
        </div>
      </section>
    </div>
  `;
  $("#export-report").addEventListener("click", exportCsv);
}

function renderTeam() {
  const canCreate = currentUser.role === "admin";
  const pendingUsers = users.filter(user => user.accessStatus === "pending" || (user.active === false && user.accessStatus !== "disabled"));
  const activeUsers = users.filter(user => user.accessStatus === "active" || user.active === true);
  $("#content").innerHTML = `
    ${pageHead("Equipo", "Usuarios activos, solicitudes y carga de trabajo", canCreate ? `<button class="primary-button" id="new-user-button">+ Nuevo usuario</button>` : "")}
    ${canCreate && pendingUsers.length ? `
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Solicitudes pendientes</h2>
            <p>Personas registradas desde el enlace público que esperan autorización</p>
          </div>
        </div>
        <div class="team-grid">
          ${pendingUsers.map(user => `
            <article class="team-card pending-card">
              <div class="team-top">
                ${avatar(user)}
                <div>
                  <h3>${escapeHtml(user.fullName)}</h3>
                  <p>${escapeHtml(user.email || user.phone || "Sin correo")}</p>
                </div>
              </div>
              <span class="role-pill pending">Pendiente · ${escapeHtml(ROLE_LABEL[user.role] || user.role)}</span>
              ${user.phone ? `<p class="card-note">Tel: ${escapeHtml(user.phone)}</p>` : ""}
              <label class="field">
                Autorizar como
                <select data-approve-role="${escapeHtml(user.id)}">
                  <option value="technician" ${user.role === "technician" ? "selected" : ""}>Técnico</option>
                  <option value="engineer" ${user.role === "engineer" ? "selected" : ""}>Ingeniero</option>
                  <option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrador</option>
                </select>
              </label>
              <button class="primary-button" data-approve-user="${escapeHtml(user.id)}">Autorizar ingreso</button>
              <button class="danger-button" data-delete-user="${escapeHtml(user.id)}">Eliminar solicitud</button>
            </article>
          `).join("")}
        </div>
      </section>
    ` : ""}
    <div class="team-grid">
      ${activeUsers.length ? activeUsers.map(user => {
        const assigned = services.filter(service => service.technicianId === user.id || service.engineerId === user.id);
        const completed = assigned.filter(service => service.status === "Completado").length;
        return `
          <article class="team-card">
            <div class="team-top">
              ${avatar(user)}
              <div>
                <h3>${escapeHtml(user.fullName)}</h3>
                <p>${escapeHtml(user.email || user.jobTitle)}</p>
              </div>
            </div>
            <span class="role-pill">${escapeHtml(user.jobTitle || ROLE_LABEL[user.role])}</span>
            <div class="team-stats">
              <div><strong>${assigned.length}</strong> Servicios</div>
              <div><strong>${completed}</strong> Cerrados</div>
            </div>
            ${canCreate ? `
              <div class="team-actions">
                <button class="secondary-button" data-edit-user="${escapeHtml(user.id)}">Editar</button>
                ${user.id !== currentUser.id ? `<button class="danger-button" data-delete-user="${escapeHtml(user.id)}">Eliminar</button>` : ""}
              </div>
            ` : ""}
          </article>
        `;
      }).join("") : `<div class="empty">No hay usuarios activos para mostrar.</div>`}
    </div>
  `;

  if (canCreate) {
    $("#new-user-button")?.addEventListener("click", () => openUserModal());
    $$("[data-approve-user]").forEach(button => {
      button.addEventListener("click", () => approveUser(button.dataset.approveUser));
    });
    $$("[data-edit-user]").forEach(button => {
      button.addEventListener("click", () => openUserModal(button.dataset.editUser));
    });
    $$("[data-delete-user]").forEach(button => {
      button.addEventListener("click", () => deleteUser(button.dataset.deleteUser));
    });
  }
}

function renderSettings() {
  const shareUrl = getShareUrl();
  $("#content").innerHTML = `
    ${pageHead("Configuración", "Datos para GitHub, Cloudflare Pages Functions y D1")}
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Enlace para técnicos e ingenieros</h2>
          <p>Comparte este enlace para que soliciten acceso o ingresen si ya fueron autorizados</p>
        </div>
        <button class="primary-button" id="copy-share-link">Copiar enlace</button>
      </div>
      <label class="field">
        Enlace público de acceso
        <input id="share-link-input" value="${escapeHtml(shareUrl)}" readonly>
      </label>
      <p class="helper-text">No compartas enlaces de vista previa que empiezan con códigos largos. Este enlace principal queda estable para tu equipo.</p>
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Base de datos</h2><p>La aplicación ya no usa Supabase</p></div></div>
      <div class="settings-list">
        <div class="setting-row"><strong>Proveedor</strong><code>Cloudflare D1</code></div>
        <div class="setting-row"><strong>Binding requerido</strong><code>DB</code></div>
        <div class="setting-row"><strong>Fotos / evidencias</strong><code>Opcional · Cloudflare R2</code></div>
        <div class="setting-row"><strong>Modo actual</strong><code>${serverMode ? "Cloudflare D1 real" : "Demo local"}</code></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Publicación recomendada</h2><p>Repositorio GitHub conectado a Cloudflare Pages</p></div></div>
      <ol>
        <li>Sube esta carpeta completa a un repositorio GitHub.</li>
        <li>En Cloudflare Pages elige <strong>Connect to Git</strong>.</li>
        <li>Framework preset: <strong>None</strong>.</li>
        <li>Build command: <strong>exit 0</strong>.</li>
        <li>Output directory: <strong>.</strong>.</li>
        <li>En Cloudflare, vincula una base D1 con binding <strong>DB</strong>.</li>
        <li>Opcional: para fotos, crea un bucket R2 y vincúlalo con binding <strong>EVIDENCE_BUCKET</strong>.</li>
      </ol>
    </section>
  `;

  $("#copy-share-link").addEventListener("click", copyShareLink);
}

function render() {
  if (!currentUser) return;

  if (currentUser.role !== "admin" && state.view === "settings") state.view = "dashboard";

  const titleMap = {
    dashboard: "Resumen",
    services: "Servicios",
    reports: "Informes",
    team: "Equipo",
    settings: "Configuración"
  };

  $("#page-title").textContent = titleMap[state.view] || "Resumen";
  $("#sidebar-name").textContent = currentUser.fullName;
  $("#sidebar-role").textContent = currentUser.jobTitle || ROLE_LABEL[currentUser.role];
  $("#sidebar-avatar").textContent = initials(currentUser.fullName);
  $("#open-count").textContent = roleServices().filter(service => service.status !== "Completado").length;
  $("#new-service-button").classList.toggle("hidden", currentUser.role === "technician");

  $$(".admin-only").forEach(item => item.classList.toggle("hidden", currentUser.role !== "admin"));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === state.view));

  if (state.view === "dashboard") renderDashboard();
  if (state.view === "services") renderServices();
  if (state.view === "reports") renderReports();
  if (state.view === "team") renderTeam();
  if (state.view === "settings") renderSettings();
}

function wireGoButtons() {
  $$("[data-go]").forEach(button => button.addEventListener("click", () => {
    state.view = button.dataset.go;
    render();
  }));
}

function openServicesWithFilters({ status = "Todos", technician = "Todos", priority = "Todas", query = "" } = {}) {
  state.filters.status = status;
  state.filters.technician = technician;
  state.filters.priority = priority;
  state.filters.query = query;
  state.view = "services";
  render();
}

function wireDashboardInteractions() {
  $$("[data-dashboard-status]").forEach(button => {
    button.addEventListener("click", () => {
      openServicesWithFilters({
        status: button.dataset.dashboardStatus || "Todos"
      });
    });
  });

  $$("[data-dashboard-technician]").forEach(button => {
    button.addEventListener("click", () => {
      openServicesWithFilters({
        technician: button.dataset.dashboardTechnician || "Todos"
      });
    });
  });
}

function wireServiceClicks() {
  $$("[data-service-id]").forEach(row => row.addEventListener("click", () => openServiceDetail(row.dataset.serviceId)));
}

function nextCode() {
  const numbers = services
    .map(service => Number(String(service.id).replace(/\D/g, "")))
    .filter(Number.isFinite);
  const next = Math.max(0, ...numbers) + 1;
  return `OS-${String(next).padStart(4, "0")}`;
}

function openServiceModal() {
  const technicians = users.filter(user => user.role === "technician" && user.active !== false);
  const engineers = users.filter(user => user.role === "engineer" && user.active !== false);
  $("#technician-select").innerHTML = technicians.length
    ? technicians.map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName)}</option>`).join("")
    : `<option value="">Primero crea un técnico</option>`;
  $("#engineer-select").innerHTML = `<option value="">Sin asignar</option>` + engineers
    .map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName)}</option>`)
    .join("");
  $("#service-form").reset();
  $("#product-sale-fields").classList.add("hidden");
  $("#service-modal").classList.remove("hidden");
}

function closeServiceModal() {
  $("#service-modal").classList.add("hidden");
}

async function createService(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));

  if (!values.technicianId) {
    toast("Primero crea al menos un usuario con rol Técnico.");
    return;
  }

  try {
    const products = productFromValues(values);
    values.products = products;

    if (serverMode) {
      const created = await api("/api/services", {
        method: "POST",
        body: values
      });
      await loadServerData();
      closeServiceModal();
      state.view = "services";
      render();
      toast(`Orden ${created.service.id} creada.`);
      return;
    }

    const localService = {
      id: nextCode(),
      client: values.client,
      serviceType: values.serviceType,
      equipment: values.equipment,
      site: values.site,
      scheduledDate: values.scheduledDate,
      technicianId: values.technicianId,
      engineerId: values.engineerId || null,
      priority: values.priority,
      status: "Pendiente",
      description: values.description,
      createdAt: new Date().toISOString(),
      products,
      updates: [
        { author: currentUser.fullName, note: "Orden creada.", createdAt: new Date().toISOString() }
      ]
    };

    services.unshift(localService);
    saveDemoServices();
    closeServiceModal();
    state.view = "services";
    render();
    toast(`Orden ${localService.id} creada.`);
  } catch (error) {
    toast(error.message);
  }
}

function openUserModal(userId = null) {
  const form = $("#user-form");
  const passwordInput = $("#user-password-input");
  const editingUser = userId ? users.find(user => user.id === userId) : null;

  state.editingUserId = editingUser?.id || null;
  form.reset();

  $("#user-modal-eyebrow").textContent = editingUser ? "EDITAR USUARIO" : "NUEVO USUARIO";
  $("#user-modal-title").textContent = editingUser ? "Editar integrante" : "Crear integrante";
  $("#user-submit-button").textContent = editingUser ? "Guardar cambios" : "Crear usuario";
  $("#user-password-field").firstChild.textContent = editingUser ? "Nueva contraseña (opcional)" : "Contraseña temporal";
  passwordInput.required = !editingUser;
  passwordInput.placeholder = editingUser ? "Dejar vacío para conservar la actual" : "Mínimo 8 caracteres";

  if (editingUser) {
    form.elements.fullName.value = editingUser.fullName || "";
    form.elements.email.value = editingUser.email || "";
    form.elements.role.value = editingUser.role || "technician";
    form.elements.jobTitle.value = editingUser.jobTitle || DEFAULT_JOB_TITLE[editingUser.role] || "";
    form.elements.phone.value = editingUser.phone || "";
    form.elements.password.value = "";
  }

  $("#user-modal").classList.remove("hidden");
}

function closeUserModal() {
  state.editingUserId = null;
  $("#user-modal").classList.add("hidden");
}

function openAccessModal() {
  $("#access-form").reset();
  $("#access-error").classList.add("hidden");
  $("#access-modal").classList.remove("hidden");
}

function closeAccessModal() {
  $("#access-modal").classList.add("hidden");
}

async function requestAccess(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Enviando...";
  $("#access-error").classList.add("hidden");

  try {
    if (serverMode || !token()) {
      const result = await api("/api/register", {
        method: "POST",
        body: values
      });
      closeAccessModal();
      showLogin(result.message || "Solicitud enviada. Espera aprobación del administrador.");
      toast("Solicitud enviada al administrador.");
      return;
    }

    toast("En modo demo no se envían solicitudes reales.");
    closeAccessModal();
  } catch (error) {
    $("#access-error").textContent = error.message;
    $("#access-error").classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Enviar solicitud";
  }
}

async function approveUser(userId) {
  const user = users.find(item => item.id === userId);
  const roleSelect = $$("[data-approve-role]").find(select => select.dataset.approveRole === userId);
  const role = roleSelect?.value || user?.role || "technician";
  if (!user) return;

  try {
    if (serverMode) {
      await api(`/api/team/${encodeURIComponent(userId)}/approve`, {
        method: "POST",
        body: {
          role,
          jobTitle: user.jobTitle || DEFAULT_JOB_TITLE[role]
        }
      });
      await loadServerData();
      render();
      toast(`${user.fullName} ya puede ingresar a la app.`);
      return;
    }

    user.role = role;
    user.jobTitle = user.jobTitle || DEFAULT_JOB_TITLE[role];
    user.active = true;
    render();
    toast(`${user.fullName} autorizado en modo demo.`);
  } catch (error) {
    toast(error.message);
  }
}

async function createUser(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const editingId = state.editingUserId;
  if (editingId && !String(values.password || "").trim()) {
    delete values.password;
  }

  try {
    if (serverMode) {
      await api(editingId ? `/api/team/${encodeURIComponent(editingId)}/update` : "/api/team", {
        method: "POST",
        body: values
      });
      await loadServerData();
      closeUserModal();
      render();
      toast(editingId ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
      return;
    }

    if (editingId) {
      const user = users.find(item => item.id === editingId);
      if (user) {
        user.fullName = values.fullName;
        user.email = values.email;
        user.role = values.role;
        user.jobTitle = values.jobTitle || DEFAULT_JOB_TITLE[values.role];
        user.phone = values.phone || "";
      }
    } else {
      users.push({
        id: `demo-user-${Date.now()}`,
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        jobTitle: values.jobTitle || DEFAULT_JOB_TITLE[values.role],
        phone: values.phone || "",
        active: true,
        accessStatus: "active"
      });
    }
    closeUserModal();
    render();
    toast(editingId ? "Usuario demo actualizado." : "Usuario demo creado.");
  } catch (error) {
    toast(error.message);
  }
}

async function deleteUser(userId) {
  const user = users.find(item => item.id === userId);
  if (!user) return;
  if (user.id === currentUser.id) {
    toast("No puedes eliminar tu propio usuario.");
    return;
  }

  const ok = confirm(`¿Eliminar/desactivar a ${user.fullName}? Ya no podrá ingresar a la app.`);
  if (!ok) return;

  try {
    if (serverMode) {
      await api(`/api/team/${encodeURIComponent(userId)}/delete`, {
        method: "POST"
      });
      await loadServerData();
      render();
      toast(`${user.fullName} fue desactivado.`);
      return;
    }

    users = users.filter(item => item.id !== userId);
    render();
    toast(`${user.fullName} eliminado en modo demo.`);
  } catch (error) {
    toast(error.message);
  }
}

function openServiceDetail(serviceId) {
  const service = services.find(item => item.id === serviceId);
  if (!service) return;
  state.selectedServiceId = serviceId;
  const technician = userById(service.technicianId);
  const engineer = userById(service.engineerId);
  const canDocument = canDocumentService(service);
  const canChangeStatus = canDocument;
  const productTotal = serviceProductTotal(service);

  $("#drawer-content").innerHTML = `
    <div class="drawer-head">
      <div>
        <span class="eyebrow">${escapeHtml(service.id)}</span>
        <h2>${escapeHtml(service.serviceType)}</h2>
        <p>${escapeHtml(service.equipment)}</p>
      </div>
      <button class="icon-button" id="close-drawer">×</button>
    </div>
    <div class="detail-grid">
      <div class="detail-box"><small>CLIENTE</small><strong>${escapeHtml(service.client)}</strong></div>
      <div class="detail-box"><small>SEDE</small><strong>${escapeHtml(service.site || "Sin sede")}</strong></div>
      <div class="detail-box"><small>TÉCNICO</small><strong>${escapeHtml(technician.fullName)}</strong></div>
      <div class="detail-box"><small>INGENIERO</small><strong>${escapeHtml(engineer.fullName)}</strong></div>
      <div class="detail-box"><small>FECHA</small><strong>${escapeHtml(formatDate(service.scheduledDate))}</strong></div>
      <div class="detail-box"><small>ESTADO</small><strong>${escapeHtml(service.status)}</strong></div>
      <div class="detail-box"><small>VENTA PRODUCTOS</small><strong>${escapeHtml(formatCurrency(productTotal))}</strong></div>
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h2>Descripción</h2></div></div>
      <p>${escapeHtml(service.description)}</p>
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Productos / insumos vendidos</h2><p>Materiales o insumos facturados en esta orden</p></div></div>
      ${productsSummary(service.products || [])}
    </section>
    ${PHOTO_UPLOAD_ENABLED || (service.photos || []).length ? `
      <section class="panel">
        <div class="panel-head"><div><h2>Fotos / evidencias</h2><p>Registro fotográfico del servicio</p></div></div>
        ${photosSummary(service.photos || [])}
        ${PHOTO_UPLOAD_ENABLED && canDocument ? `
          <div class="photo-upload">
            <label class="field">
              Subir fotos
              <input id="photo-input" type="file" accept="image/*" multiple>
            </label>
            <label class="field">
              Comentario de la evidencia
              <input id="photo-caption" placeholder="Ej: Antes del mantenimiento, equipo corregido, repuesto instalado...">
            </label>
            <button class="secondary-button" id="upload-photos">Subir evidencia</button>
          </div>
          <p class="helper-text">Puedes subir hasta 6 fotos por vez. Cada foto debe pesar máximo 8 MB.</p>
        ` : ""}
      </section>
    ` : ""}
    <section class="panel">
      <div class="panel-head"><div><h2>Seguimiento</h2><p>Novedades del servicio</p></div></div>
      <div class="timeline">
        ${service.updates.length ? service.updates.map(update => `
          <div class="timeline-item">
            <p>${escapeHtml(update.note)}</p>
            <small>${escapeHtml(update.author)} · ${escapeHtml(formatDateTime(update.createdAt))}</small>
          </div>
        `).join("") : `<div class="empty">Sin novedades.</div>`}
      </div>
      <textarea class="note-box" id="note-box" placeholder="Agregar observación..."></textarea>
      <div class="drawer-actions">
        <button class="secondary-button" id="save-note">Guardar nota</button>
      </div>
      ${canChangeStatus ? `
        <div class="status-editor">
          <label class="field">
            Cambiar estado de la orden
            <select id="status-select">
              ${STATUS_LABELS.map(status => `<option value="${escapeHtml(status)}" ${service.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
            </select>
          </label>
          <button class="primary-button" id="save-status">Guardar estado</button>
        </div>
      ` : ""}
    </section>
  `;

  $("#service-drawer").classList.remove("hidden");
  $("#close-drawer").addEventListener("click", closeDrawer);
  $("#save-note").addEventListener("click", () => saveNote(service.id));
  const saveStatusButton = $("#save-status");
  if (saveStatusButton) {
    saveStatusButton.addEventListener("click", () => changeStatus(service.id, $("#status-select").value));
  }
  const uploadPhotosButton = $("#upload-photos");
  if (uploadPhotosButton) {
    uploadPhotosButton.addEventListener("click", () => uploadPhotos(service.id));
  }
}

function closeDrawer() {
  $("#service-drawer").classList.add("hidden");
  state.selectedServiceId = null;
}

async function saveNote(serviceId) {
  const service = services.find(item => item.id === serviceId);
  const note = $("#note-box").value.trim();
  if (!service || !note) {
    toast("Escribe una observación antes de guardar.");
    return;
  }

  try {
    if (serverMode) {
      await api(`/api/services/${encodeURIComponent(service.id)}/updates`, {
        method: "POST",
        body: { note }
      });
      await loadServerData();
      render();
      openServiceDetail(serviceId);
      toast("Observación guardada.");
      return;
    }

    service.updates.push({ author: currentUser.fullName, note, createdAt: new Date().toISOString() });
    saveDemoServices();
    render();
    openServiceDetail(serviceId);
    toast("Observación guardada.");
  } catch (error) {
    toast(error.message);
  }
}

async function uploadPhotos(serviceId) {
  const service = services.find(item => item.id === serviceId);
  const input = $("#photo-input");
  const caption = $("#photo-caption")?.value.trim() || "";
  const files = [...(input?.files || [])].slice(0, 6);

  if (!service || !files.length) {
    toast("Selecciona al menos una foto.");
    return;
  }

  const invalidFile = files.find(file => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024);
  if (invalidFile) {
    toast("Solo fotos de máximo 8 MB.");
    return;
  }

  try {
    if (serverMode) {
      const formData = new FormData();
      files.forEach(file => formData.append("photos", file));
      formData.append("caption", caption);

      await api(`/api/services/${encodeURIComponent(service.id)}/photos`, {
        method: "POST",
        body: formData
      });
      await loadServerData();
      render();
      openServiceDetail(serviceId);
      toast("Evidencia fotográfica subida.");
      return;
    }

    service.photos = service.photos || [];
    const createdAt = new Date().toISOString();
    for (const file of files) {
      service.photos.push({
        id: `demo-photo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        caption,
        uploadedBy: currentUser.fullName,
        createdAt,
        url: await fileToDataUrl(file)
      });
    }
    service.updates.push({
      author: currentUser.fullName,
      note: `Evidencia fotográfica agregada: ${files.length} foto(s).${caption ? ` ${caption}` : ""}`,
      createdAt
    });
    saveDemoServices();
    render();
    openServiceDetail(serviceId);
    toast("Evidencia fotográfica subida.");
  } catch (error) {
    toast(error.message);
  }
}

async function changeStatus(serviceId, status) {
  const service = services.find(item => item.id === serviceId);
  if (!service) return;

  try {
    if (serverMode) {
      await api(`/api/services/${encodeURIComponent(service.id)}/status`, {
        method: "POST",
        body: { status }
      });
      await loadServerData();
      render();
      openServiceDetail(serviceId);
      toast(`Estado cambiado a ${status}.`);
      return;
    }

    service.status = status;
    service.updates.push({
      author: currentUser.fullName,
      note: `Estado cambiado a ${status}.`,
      createdAt: new Date().toISOString()
    });
    saveDemoServices();
    render();
    openServiceDetail(serviceId);
    toast(`Estado cambiado a ${status}.`);
  } catch (error) {
    toast(error.message);
  }
}

function exportCsv() {
  const rows = [
    ["Orden", "Cliente", "Servicio", "Equipo", "Sede", "Técnico", "Ingeniero", "Fecha", "Prioridad", "Estado", "Productos vendidos", "Total productos", "Fotos"],
    ...filteredServices().map(service => [
      service.id,
      service.client,
      service.serviceType,
      service.equipment,
      service.site,
      userById(service.technicianId).fullName,
      userById(service.engineerId).fullName,
      service.scheduledDate,
      service.priority,
      service.status,
      (service.products || []).map(item => `${item.productName} (${item.quantity} ${item.unit})`).join(" | "),
      serviceProductTotal(service),
      (service.photos || []).length
    ])
  ];
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tecnalisis-servicios.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast("CSV generado.");
}

$$(".nav-item").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  render();
}));

$("[data-view-link='dashboard']").addEventListener("click", event => {
  event.preventDefault();
  state.view = "dashboard";
  render();
});

$("#mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

$("#global-search").addEventListener("input", event => {
  state.filters.query = event.target.value;
  state.view = "services";
  render();
});

$("#demo-role").addEventListener("change", event => {
  const role = event.target.value;
  currentUser = users.find(user => user.role === role) || users[0];
  state.filters.technician = "Todos";
  state.view = "dashboard";
  render();
  toast(`Vista demo: ${ROLE_LABEL[role]}.`);
});

$("#new-service-button").addEventListener("click", openServiceModal);
$("#service-form").addEventListener("submit", createService);
$("#include-product").addEventListener("change", event => {
  $("#product-sale-fields").classList.toggle("hidden", !event.target.checked);
  if (event.target.checked) $("#product-name").focus();
});
$("#user-form").addEventListener("submit", createUser);
$("#access-form").addEventListener("submit", requestAccess);
$$("[data-close-modal]").forEach(button => button.addEventListener("click", closeServiceModal));
$$("[data-close-user-modal]").forEach(button => button.addEventListener("click", closeUserModal));
$$("[data-close-access-modal]").forEach(button => button.addEventListener("click", closeAccessModal));
$("#service-modal").addEventListener("click", event => {
  if (event.target.id === "service-modal") closeServiceModal();
});
$("#user-modal").addEventListener("click", event => {
  if (event.target.id === "user-modal") closeUserModal();
});
$("#access-modal").addEventListener("click", event => {
  if (event.target.id === "access-modal") closeAccessModal();
});
$("#service-drawer").addEventListener("click", event => {
  if (event.target.id === "service-drawer") closeDrawer();
});
$("#login-form").addEventListener("submit", signIn);
$("#setup-form").addEventListener("submit", createFirstAdmin);
$("#request-access-button").addEventListener("click", openAccessModal);
$$("[data-install-app]").forEach(button => button.addEventListener("click", installApp));
$("#demo-login-button").addEventListener("click", () => enterDemo());
$("#setup-demo-button").addEventListener("click", () => enterDemo());
$("#logout-button").addEventListener("click", logout);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeServiceModal();
    closeUserModal();
    closeAccessModal();
    closeDrawer();
  }
});

updateInstallButtons();
start();
