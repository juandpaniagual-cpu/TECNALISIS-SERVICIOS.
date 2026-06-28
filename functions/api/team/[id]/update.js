import { assertRole, cleanEmail, hashPassword, json, nowIso, publicUser, randomHex, readJson, requireFields, requireUser, roleTitle } from "../../../_lib.js";

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;
  const roleError = assertRole(session.user, ["admin"]);
  if (roleError) return roleError;

  try {
    const id = context.params.id;
    const current = await session.db.prepare("select * from users where id = ?").bind(id).first();
    if (!current) return json({ error: "Usuario no encontrado." }, 404);

    const body = await readJson(context.request);
    const missing = requireFields(body, ["fullName", "email", "role"]);
    if (missing) return json({ error: missing }, 400);
    if (!["admin", "technician", "engineer"].includes(body.role)) return json({ error: "Rol inválido." }, 400);
    if (id === session.user.id && body.role !== "admin") {
      return json({ error: "No puedes quitarte tu propio rol de administrador." }, 400);
    }

    const email = cleanEmail(body.email);
    const jobTitle = String(body.jobTitle || "").trim() || roleTitle(body.role);
    const phone = String(body.phone || "").trim();
    const updatedAt = nowIso();
    const password = String(body.password || "");

    if (password) {
      if (password.length < 8) return json({ error: "La contraseña debe tener mínimo 8 caracteres." }, 400);
      const salt = randomHex(16);
      const passwordHash = await hashPassword(password, salt, context.env);
      await session.db.prepare(`
        update users
        set full_name = ?,
            email = ?,
            password_salt = ?,
            password_hash = ?,
            role = ?,
            job_title = ?,
            phone = ?,
            updated_at = ?
        where id = ?
      `).bind(
        String(body.fullName).trim(),
        email,
        salt,
        passwordHash,
        body.role,
        jobTitle,
        phone,
        updatedAt,
        id
      ).run();
    } else {
      await session.db.prepare(`
        update users
        set full_name = ?,
            email = ?,
            role = ?,
            job_title = ?,
            phone = ?,
            updated_at = ?
        where id = ?
      `).bind(
        String(body.fullName).trim(),
        email,
        body.role,
        jobTitle,
        phone,
        updatedAt,
        id
      ).run();
    }

    const updated = await session.db.prepare(`
      select id, full_name, email, role, job_title, phone, active
      from users
      where id = ?
    `).bind(id).first();

    return json({ user: publicUser(updated) });
  } catch (error) {
    const message = String(error.message || "");
    if (message.includes("UNIQUE")) {
      return json({ error: "Ya existe otro usuario con ese correo." }, 409);
    }
    return json({ error: error.message }, 500);
  }
}
