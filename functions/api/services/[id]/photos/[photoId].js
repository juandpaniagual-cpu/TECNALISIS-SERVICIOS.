import { canReadService, getEvidenceBucket, getServiceByCode, json, requireUser } from "../../../../_lib.js";

function inlineFileName(name) {
  return String(name || "evidencia.jpg").replaceAll('"', "");
}

export async function onRequestGet(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  try {
    const bucket = getEvidenceBucket(context);
    const code = context.params.id;
    const photoId = context.params.photoId;
    const service = await getServiceByCode(session.db, code);
    if (!service) return json({ error: "Servicio no encontrado." }, 404);
    if (!canReadService(session.user, service)) {
      return json({ error: "No tienes permiso para ver esta evidencia." }, 403);
    }

    const photo = await session.db.prepare(`
      select *
      from service_photos
      where id = ?
        and service_order_id = ?
    `).bind(photoId, service.id).first();

    if (!photo) return json({ error: "Foto no encontrada." }, 404);

    const object = await bucket.get(photo.file_key);
    if (!object) return json({ error: "Archivo no encontrado en R2." }, 404);

    return new Response(object.body, {
      headers: {
        "Content-Type": photo.content_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${inlineFileName(photo.file_name)}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
