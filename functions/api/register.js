import { cleanEmail, getDB, hashPassword, json, nowIso, randomHex, readJson, requireFields, roleTitle } from "../_lib.js";

export async function onRequestPost(context) {
  try {
    const db = getDB(context);
    const body = await readJson(context.request);
    const missing = requireFields(body, ["fullName", "email", "password", "role"]);
    if (missing) return json({ error: missing }, 400);

    if (!["technician", "engineer"].includes(body.role)) {
      return json({ error: "Solo se puede solicitar acceso como técnico o ingeniero." }, 400);
    }

    if (String(body.password).length < 8) {
      return json({ error: "La contraseña debe tener mínimo 8 caracteres." }, 400);
    }

    const email = cleanEmail(body.email);
    const existing = await db.prepare("select id, active from users where lower(email) = ?").bind(email).first();

    if (existing?.active) {
      return json({ error: "Ya existe un usuario activo con ese correo." }, 409);
    }

    if (existing) {
      return json({ error: "Ya tienes una solicitud pendiente. Espera autorización del administrador." }, 409);
    }

    const id = crypto.randomUUID();
    const salt = randomHex(16);
    const passwordHash = await hashPassword(body.password, salt, context.env);
    const createdAt = nowIso();

    await db.prepare(`
      insert into users (
        id, full_name, email, password_salt, password_hash,
        role, job_title, phone, active, created_at, updated_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id,
      String(body.fullName).trim(),
      email,
      salt,
      passwordHash,
      body.role,
      String(body.jobTitle || "").trim() || roleTitle(body.role),
      String(body.phone || "").trim(),
      createdAt,
      createdAt
    ).run();

    return json({
      ok: true,
      message: "Solicitud enviada. El administrador debe aprobar tu acceso antes de ingresar."
    }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
