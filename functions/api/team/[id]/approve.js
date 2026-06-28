import { assertRole, json, nowIso, readJson, requireUser, roleTitle } from "../../../_lib.js";

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  const roleError = assertRole(session.user, ["admin"]);
  if (roleError) return roleError;

  try {
    const id = context.params.id;
    const body = await readJson(context.request);
    const role = String(body.role || "").trim();

    if (!["admin", "technician", "engineer"].includes(role)) {
      return json({ error: "Rol inválido." }, 400);
    }

    const user = await session.db
      .prepare("select * from users where id = ?")
      .bind(id)
      .first();

    if (!user) {
      return json({ error: "Usuario no encontrado." }, 404);
    }

    const jobTitle = String(body.jobTitle || "").trim() || user.job_title || roleTitle(role);

    await session.db.prepare(`
      update users
      set active = 1,
          role = ?,
          job_title = ?,
          updated_at = ?
      where id = ?
    `).bind(role, jobTitle, nowIso(), id).run();

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
