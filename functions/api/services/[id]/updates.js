import { canReadService, getServiceByCode, json, nowIso, readJson, requireFields, requireUser } from "../../../_lib.js";

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  try {
    const code = context.params.id;
    const service = await getServiceByCode(session.db, code);
    if (!service) return json({ error: "Servicio no encontrado." }, 404);
    if (!canReadService(session.user, service)) return json({ error: "No tienes acceso a este servicio." }, 403);

    const body = await readJson(context.request);
    const missing = requireFields(body, ["note"]);
    if (missing) return json({ error: missing }, 400);

    const createdAt = nowIso();
    await session.db.prepare(`
      insert into service_updates (id, service_order_id, author_id, note, status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      service.id,
      session.user.id,
      String(body.note).trim(),
      service.status,
      createdAt
    ).run();

    return json({ ok: true, update: { author: session.user.fullName, note: String(body.note).trim(), createdAt } }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
