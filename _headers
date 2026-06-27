import { getServiceByCode, json, nowIso, readJson, requireFields, requireUser } from "../../../_lib.js";

const VALID_STATUSES = ["Pendiente", "En progreso", "En revisión", "Completado"];

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  try {
    const code = context.params.id;
    const service = await getServiceByCode(session.db, code);
    if (!service) return json({ error: "Servicio no encontrado." }, 404);

    const body = await readJson(context.request);
    const missing = requireFields(body, ["status"]);
    if (missing) return json({ error: missing }, 400);
    if (!VALID_STATUSES.includes(body.status)) return json({ error: "Estado inválido." }, 400);

    const canChangeStatus =
      session.user.role === "admin" ||
      session.user.role === "engineer" ||
      (session.user.role === "technician" && service.technician_id === session.user.id);

    if (!canChangeStatus) {
      return json({ error: "No tienes permiso para cambiar el estado de esta orden." }, 403);
    }

    const createdAt = nowIso();
    await session.db.prepare(`
      update service_orders
      set status = ?, updated_at = ?
      where id = ?
    `).bind(body.status, createdAt, service.id).run();

    await session.db.prepare(`
      insert into service_updates (id, service_order_id, author_id, note, status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      service.id,
      session.user.id,
      `Estado cambiado a ${body.status}.`,
      body.status,
      createdAt
    ).run();

    return json({ ok: true, status: body.status });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
