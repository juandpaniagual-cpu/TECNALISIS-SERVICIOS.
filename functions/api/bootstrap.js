import { cleanEmail, createSession, getDB, hashPassword, json, nowIso, randomHex, readJson, requireFields } from "../_lib.js";

export async function onRequestPost(context) {
  try {
    const db = getDB(context);
    const count = await db.prepare("select count(*) as total from users").first();

    if (Number(count?.total || 0) > 0) {
      return json({ error: "La configuración inicial ya fue realizada." }, 409);
    }

    const body = await readJson(context.request);
    const missing = requireFields(body, ["fullName", "email", "password"]);
    if (missing) return json({ error: missing }, 400);
    if (String(body.password).length < 8) return json({ error: "La contraseña debe tener mínimo 8 caracteres." }, 400);

    const id = crypto.randomUUID();
    const salt = randomHex(16);
    const passwordHash = await hashPassword(body.password, salt, context.env);
    const email = cleanEmail(body.email);

    await db.prepare(`
      insert into users (id, full_name, email, password_salt, password_hash, role, job_title, active, created_at, updated_at)
      values (?, ?, ?, ?, ?, 'admin', 'Administrador', 1, ?, ?)
    `).bind(id, body.fullName.trim(), email, salt, passwordHash, nowIso(), nowIso()).run();

    const token = await createSession(db, id);
    return json({
      token,
      user: {
        id,
        fullName: body.fullName.trim(),
        email,
        role: "admin",
        jobTitle: "Administrador",
        active: true
      }
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
