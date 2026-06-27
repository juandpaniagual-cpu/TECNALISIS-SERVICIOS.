import { json, requireUser, sessionCookie } from "../_lib.js";

export async function onRequestGet(context) {
  const session = await requireUser(context);
  if (session.error) return session.error;
  return json({ user: session.user }, 200, {
    "Set-Cookie": sessionCookie(session.token)
  });
}
