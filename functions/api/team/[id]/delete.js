import { assertRole, json, nowIso, requireUser } from "../../../_lib.js";

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;
  const roleError = assertRole(session.user, ["admin"]);
  if (roleError) return roleError;

  try {
    const id = context.params.id;
    if (id === session.user.id) {
      return json({ error: "No puedes eliminar tu propio usuario administrador." }, 400);
    }

    const user = await session.db.prepare("select * from users where id = ?").bind(id).first();
    if (!user) return json({ error: "Usuario no encontrado." }, 404);

    await session.db.prepare(`
      update users
      set active = -1,
          updated_at = ?
      where id = ?
    `).bind(nowIso(), id).run();

    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
