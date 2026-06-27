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

const state = {
  view: "dashboard",
  filters: {
    query: "",
    technician: "Todos",
    status: "Todos",
    priority: "Todas"
  },
  selectedServiceId: null
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
  if (state.filters.status !== "Todos") output = output.filter(service => service.status === state.filters.status);
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

function metric(label, value, detail, tone) {
  return `
    <article class="metric-card metric-${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
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

  $("#content").innerHTML = `
    ${pageHead(
      `Hola, ${currentUser.fullName.split(" ")[0]}`,
      currentUser.role === "technician"
        ? "Estos son tus servicios asignados."
        : "Aquí tienes el estado general de la operación."
    )}
    <div class="metrics-grid">
      ${metric("Servicios abiertos", open, "Pendientes o en ejecución", "teal")}
      ${metric("En progreso", inProgress, "Actualmente en campo", "blue")}
      ${metric("En revisión", review, "Requieren seguimiento", "amber")}
      ${metric("Completados", completed, "Cerrados y aprobados", "violet")}
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
              <div class="timeline-item">
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
        <option>Todos</option>
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
  $("#content").innerHTML = `
    ${pageHead("Equipo", "Usuarios activos y carga de trabajo", canCreate ? `<button class="primary-button" id="new-user-button">+ Nuevo usuario</button>` : "")}
    <div class="team-grid">
      ${users.map(user => {
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
          </article>
        `;
      }).join("")}
    </div>
  `;

  if (canCreate) $("#new-user-button").addEventListener("click", openUserModal);
}

function renderSettings() {
  $("#content").innerHTML = `
    ${pageHead("Configuración", "Datos para GitHub, Cloudflare Pages Functions y D1")}
    <section class="panel">
      <div class="panel-head"><div><h2>Base de datos</h2><p>La aplicación ya no usa Supabase</p></div></div>
      <div class="settings-list">
        <div class="setting-row"><strong>Proveedor</strong><code>Cloudflare D1</code></div>
        <div class="setting-row"><strong>Binding requerido</strong><code>DB</code></div>
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
      </ol>
    </section>
  `;
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

function openUserModal() {
  $("#user-form").reset();
  $("#user-modal").classList.remove("hidden");
}

function closeUserModal() {
  $("#user-modal").classList.add("hidden");
}

async function createUser(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));

  try {
    if (serverMode) {
      await api("/api/team", {
        method: "POST",
        body: values
      });
      await loadServerData();
      closeUserModal();
      render();
      toast("Usuario creado correctamente.");
      return;
    }

    users.push({
      id: `demo-user-${Date.now()}`,
      fullName: values.fullName,
      email: values.email,
      role: values.role,
      jobTitle: values.jobTitle || DEFAULT_JOB_TITLE[values.role],
      active: true
    });
    closeUserModal();
    render();
    toast("Usuario demo creado.");
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
  const canStart = currentUser.role === "technician" && service.technicianId === currentUser.id && service.status === "Pendiente";
  const canReview = currentUser.role === "technician" && service.technicianId === currentUser.id && service.status === "En progreso";
  const canApprove = ["admin", "engineer"].includes(currentUser.role) && service.status === "En revisión";

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
    </div>
    <section class="panel" style="margin-top:18px">
      <div class="panel-head"><div><h2>Descripción</h2></div></div>
      <p>${escapeHtml(service.description)}</p>
    </section>
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
        ${canStart ? `<button class="primary-button" data-next-status="En progreso">Iniciar servicio</button>` : ""}
        ${canReview ? `<button class="primary-button" data-next-status="En revisión">Enviar a revisión</button>` : ""}
        ${canApprove ? `<button class="primary-button" data-next-status="Completado">Aprobar servicio</button>` : ""}
      </div>
    </section>
  `;

  $("#service-drawer").classList.remove("hidden");
  $("#close-drawer").addEventListener("click", closeDrawer);
  $("#save-note").addEventListener("click", () => saveNote(service.id));
  $$("[data-next-status]").forEach(button => button.addEventListener("click", () => changeStatus(service.id, button.dataset.nextStatus)));
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
    ["Orden", "Cliente", "Servicio", "Equipo", "Sede", "Técnico", "Ingeniero", "Fecha", "Prioridad", "Estado"],
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
      service.status
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
$("#user-form").addEventListener("submit", createUser);
$$("[data-close-modal]").forEach(button => button.addEventListener("click", closeServiceModal));
$$("[data-close-user-modal]").forEach(button => button.addEventListener("click", closeUserModal));
$("#service-modal").addEventListener("click", event => {
  if (event.target.id === "service-modal") closeServiceModal();
});
$("#user-modal").addEventListener("click", event => {
  if (event.target.id === "user-modal") closeUserModal();
});
$("#service-drawer").addEventListener("click", event => {
  if (event.target.id === "service-drawer") closeDrawer();
});
$("#login-form").addEventListener("submit", signIn);
$("#setup-form").addEventListener("submit", createFirstAdmin);
$("#demo-login-button").addEventListener("click", () => enterDemo());
$("#setup-demo-button").addEventListener("click", () => enterDemo());
$("#logout-button").addEventListener("click", logout);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeServiceModal();
    closeUserModal();
    closeDrawer();
  }
});

start();
