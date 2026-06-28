import { clearSessionCookie, json, requireUser } from "../_lib.js";

export async function onRequestPost(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;

  await session.db.prepare("delete from sessions where token = ?").bind(session.token).run();
  return json({ ok: true }, 200, {
    "Set-Cookie": clearSessionCookie()
  });
}
