import { assertRole, json, nowIso, publicService, readJson, requireFields, requireUser } from "../../_lib.js";

function mapUpdate(row) {
  return {
    id: row.id,
    author: row.author_name || "Sistema",
    note: row.note,
    status: row.status || "",
    createdAt: row.created_at
  };
}

export async function onRequestGet(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  const servicesResult = await session.db.prepare(`
    select *
    from service_orders
    where (? in ('admin', 'engineer') or technician_id = ?)
    order by scheduled_date desc, created_at desc
  `).bind(session.user.role, session.user.id).all();

  const updatesResult = await session.db.prepare(`
    select
      su.*,
      u.full_name as author_name,
      so.code as order_code
    from service_updates su
    join service_orders so on so.id = su.service_order_id
    left join users u on u.id = su.author_id
    where (? in ('admin', 'engineer') or so.technician_id = ?)
    order by su.created_at asc
  `).bind(session.user.role, session.user.id).all();

  const updates = updatesResult.results || [];
  const services = (servicesResult.results || []).map(row => {
    const serviceUpdates = updates
      .filter(update => update.service_order_id === row.id)
      .map(mapUpdate);
    return publicService(row, serviceUpdates);
  });

  return json({ services });
}

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;
  const roleError = assertRole(session.user, ["admin", "engineer"]);
  if (roleError) return roleError;

  try {
    const body = await readJson(context.request);
    const missing = requireFields(body, ["client", "serviceType", "equipment", "scheduledDate", "technicianId", "priority", "description"]);
    if (missing) return json({ error: missing }, 400);

    if (!["Alta", "Media", "Baja"].includes(body.priority)) return json({ error: "Prioridad inválida." }, 400);

    const technician = await session.db.prepare(`
      select id from users where id = ? and role = 'technician' and active = 1
    `).bind(body.technicianId).first();

    if (!technician) return json({ error: "El técnico seleccionado no existe o no está activo." }, 400);

    if (body.engineerId) {
      const engineer = await session.db.prepare(`
        select id from users where id = ? and role = 'engineer' and active = 1
      `).bind(body.engineerId).first();
      if (!engineer) return json({ error: "El ingeniero seleccionado no existe o no está activo." }, 400);
    }

    const nextRow = await session.db.prepare(`
      select coalesce(max(cast(substr(code, 4) as integer)), 0) + 1 as next_number
      from service_orders
      where code like 'OS-%'
    `).first();
    const code = `OS-${String(nextRow?.next_number || 1).padStart(4, "0")}`;
    const id = crypto.randomUUID();
    const createdAt = nowIso();

    await session.db.prepare(`
      insert into service_orders (
        id, code, client, service_type, equipment, site, scheduled_date,
        technician_id, engineer_id, created_by, priority, status, description,
        created_at, updated_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?)
    `).bind(
      id,
      code,
      String(body.client).trim(),
      String(body.serviceType).trim(),
      String(body.equipment).trim(),
      String(body.site || "").trim(),
      body.scheduledDate,
      body.technicianId,
      body.engineerId || null,
      session.user.id,
      body.priority,
      String(body.description).trim(),
      createdAt,
      createdAt
    ).run();

    await session.db.prepare(`
      insert into service_updates (id, service_order_id, author_id, note, status, created_at)
      values (?, ?, ?, 'Orden creada.', 'Pendiente', ?)
    `).bind(crypto.randomUUID(), id, session.user.id, createdAt).run();

    return json({
      service: {
        id: code,
        dbId: id,
        client: String(body.client).trim(),
        serviceType: String(body.serviceType).trim(),
        equipment: String(body.equipment).trim(),
        site: String(body.site || "").trim(),
        scheduledDate: body.scheduledDate,
        technicianId: body.technicianId,
        engineerId: body.engineerId || null,
        priority: body.priority,
        status: "Pendiente",
        description: String(body.description).trim(),
        createdAt,
        updates: [{ author: session.user.fullName, note: "Orden creada.", createdAt }]
      }
    }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
