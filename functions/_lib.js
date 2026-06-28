const SESSION_COOKIE = "tecnalisis_session";
const SESSION_DAYS = 180;

export function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * SESSION_DAYS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function getDB(context) {
  const db = context.env.DB;
  if (!db) {
    throw new Error("No existe el binding D1 llamado DB. En Cloudflare Pages agrega una base D1 con binding DB.");
  }
  return db;
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function randomHex(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, salt, env = {}) {
  const pepper = env.AUTH_PEPPER || "";
  return sha256Hex(`${salt}:${password}:${pepper}`);
}

export function publicUser(row) {
  if (!row) return null;
  const activeValue = Number(row.active);
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title,
    phone: row.phone || "",
    active: activeValue === 1,
    accessStatus: activeValue === 1 ? "active" : activeValue < 0 ? "disabled" : "pending"
  };
}

export function getEvidenceBucket(context) {
  const bucket = context.env.EVIDENCE_BUCKET;
  if (!bucket) {
    throw new Error("No existe el binding R2 llamado EVIDENCE_BUCKET. En Cloudflare Pages agrega un bucket R2 con binding EVIDENCE_BUCKET.");
  }
  return bucket;
}

export function publicService(row, updates = [], products = [], photos = []) {
  return {
    id: row.code,
    dbId: row.id,
    client: row.client,
    serviceType: row.service_type,
    equipment: row.equipment,
    site: row.site || "",
    scheduledDate: row.scheduled_date,
    technicianId: row.technician_id,
    engineerId: row.engineer_id,
    priority: row.priority,
    status: row.status,
    description: row.description || "",
    createdAt: row.created_at,
    updates,
    products,
    photos
  };
}

export async function createSession(db, userId) {
  const token = randomHex(32);
  await db.prepare(`
    insert into sessions (token, user_id, expires_at, created_at)
    values (?, ?, ?, ?)
  `).bind(token, userId, addDaysIso(SESSION_DAYS), nowIso()).run();
  return token;
}

export async function requireUser(context) {
  const db = getDB(context);
  const header = context.request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : cookieValue(context.request, SESSION_COOKIE);

  if (!token) {
    return { error: json({ error: "Sesión requerida." }, 401) };
  }

  await db.prepare("delete from sessions where expires_at < ?").bind(nowIso()).run();

  const row = await db.prepare(`
    select
      s.token,
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.job_title,
      u.phone,
      u.active
    from sessions s
    join users u on u.id = s.user_id
    where s.token = ?
      and s.expires_at > ?
      and u.active = 1
  `).bind(token, nowIso()).first();

  if (!row) {
    return { error: json({ error: "Sesión vencida. Ingresa nuevamente." }, 401) };
  }

  return { db, token, user: publicUser(row) };
}

export function assertRole(user, roles) {
  if (!roles.includes(user.role)) {
    return json({ error: "No tienes permisos para esta acción." }, 403);
  }
  return null;
}

export function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function requireFields(data, fields) {
  const missing = fields.filter(field => !String(data[field] || "").trim());
  if (missing.length) {
    return `Faltan campos obligatorios: ${missing.join(", ")}.`;
  }
  return "";
}

export async function getServiceByCode(db, code) {
  return db.prepare("select * from service_orders where code = ?").bind(code).first();
}

export function canReadService(user, service) {
  return user.role === "admin" || user.role === "engineer" || service.technician_id === user.id;
}

export function roleTitle(role) {
  return {
    admin: "Administrador",
    technician: "Técnico",
    engineer: "Ingeniero"
  }[role] || "Técnico";
}
