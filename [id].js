import { canReadService, getEvidenceBucket, getServiceByCode, json, nowIso, requireUser } from "../../../_lib.js";

const MAX_PHOTOS_PER_UPLOAD = 6;
const MAX_PHOTO_SIZE = 8 * 1024 * 1024;

function safeFileName(name) {
  return String(name || "evidencia.jpg")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "evidencia.jpg";
}

function photoUrl(orderCode, photoId) {
  return `/api/services/${encodeURIComponent(orderCode)}/photos/${encodeURIComponent(photoId)}`;
}

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  try {
    const bucket = getEvidenceBucket(context);
    const code = context.params.id;
    const service = await getServiceByCode(session.db, code);
    if (!service) return json({ error: "Servicio no encontrado." }, 404);
    if (!canReadService(session.user, service)) {
      return json({ error: "No tienes permiso para documentar esta orden." }, 403);
    }

    const form = await context.request.formData();
    const caption = String(form.get("caption") || "").trim();
    const files = form.getAll("photos")
      .filter(file => file && typeof file === "object" && typeof file.arrayBuffer === "function")
      .slice(0, MAX_PHOTOS_PER_UPLOAD);

    if (!files.length) {
      return json({ error: "Selecciona al menos una foto para subir." }, 400);
    }

    const createdAt = nowIso();
    const photos = [];

    for (const file of files) {
      const contentType = file.type || "application/octet-stream";
      if (!contentType.startsWith("image/")) {
        return json({ error: "Solo se permiten archivos de imagen." }, 400);
      }
      if (file.size > MAX_PHOTO_SIZE) {
        return json({ error: "Cada foto debe pesar máximo 8 MB." }, 400);
      }

      const id = crypto.randomUUID();
      const fileName = safeFileName(file.name);
      const key = `services/${service.code}/${id}-${fileName}`;
      const bytes = await file.arrayBuffer();

      await bucket.put(key, bytes, {
        httpMetadata: {
          contentType
        }
      });

      await session.db.prepare(`
        insert into service_photos (
          id, service_order_id, uploaded_by, file_key, file_name,
          content_type, file_size, caption, created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        service.id,
        session.user.id,
        key,
        fileName,
        contentType,
        file.size || bytes.byteLength,
        caption,
        createdAt
      ).run();

      photos.push({
        id,
        fileName,
        contentType,
        fileSize: file.size || bytes.byteLength,
        caption,
        uploadedBy: session.user.fullName,
        createdAt,
        url: photoUrl(service.code, id)
      });
    }

    await session.db.prepare(`
      insert into service_updates (id, service_order_id, author_id, note, status, created_at)
      values (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      service.id,
      session.user.id,
      `Evidencia fotográfica agregada: ${photos.length} foto(s).${caption ? ` ${caption}` : ""}`,
      service.status,
      createdAt
    ).run();

    return json({ photos }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
