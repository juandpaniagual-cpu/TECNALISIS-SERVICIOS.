import { assertRole, cleanEmail, hashPassword, json, nowIso, publicUser, randomHex, readJson, requireFields, requireUser, roleTitle } from "../_lib.js";

export async function onRequestGet(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  const result = await session.db.prepare(`
    select id, full_name, email, role, job_title, phone, active
    from users
    where active = 1
    order by
      case role
        when 'admin' then 1
        when 'engineer' then 2
        else 3
      end,
      full_name
  `).all();

  return json({ users: (result.results || []).map(publicUser) });
}

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;
  const roleError = assertRole(session.user, ["admin"]);
  if (roleError) return roleError;

  try {
    const body = await readJson(context.request);
    const missing = requireFields(body, ["fullName", "email", "password", "role"]);
    if (missing) return json({ error: missing }, 400);
    if (!["admin", "technician", "engineer"].includes(body.role)) return json({ error: "Rol inválido." }, 400);
    if (String(body.password).length < 8) return json({ error: "La contraseña debe tener mínimo 8 caracteres." }, 400);

    const id = crypto.randomUUID();
    const email = cleanEmail(body.email);
    const salt = randomHex(16);
    const passwordHash = await hashPassword(body.password, salt, context.env);
    const jobTitle = String(body.jobTitle || "").trim() || roleTitle(body.role);

    await session.db.prepare(`
      insert into users (id, full_name, email, password_salt, password_hash, role, job_title, active, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      id,
      String(body.fullName).trim(),
      email,
      salt,
      passwordHash,
      body.role,
      jobTitle,
      nowIso(),
      nowIso()
    ).run();

    return json({
      user: {
        id,
        fullName: String(body.fullName).trim(),
        email,
        role: body.role,
        jobTitle,
        active: true
      }
    }, 201);
  } catch (error) {
    const message = String(error.message || "");
    if (message.includes("UNIQUE")) {
      return json({ error: "Ya existe un usuario con ese correo." }, 409);
    }
    return json({ error: error.message }, 500);
  }
}
