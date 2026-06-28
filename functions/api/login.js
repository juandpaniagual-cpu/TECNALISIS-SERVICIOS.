import { cleanEmail, createSession, getDB, hashPassword, json, publicUser, readJson, requireFields, sessionCookie } from "../_lib.js";

export async function onRequestPost(context) {
  try {
    const db = getDB(context);
    const body = await readJson(context.request);
    const missing = requireFields(body, ["email", "password"]);
    if (missing) return json({ error: missing }, 400);

    const email = cleanEmail(body.email);
    const user = await db.prepare(`
      select *
      from users
      where lower(email) = ?
    `).bind(email).first();

    if (!user) {
      return json({ error: "Correo o contraseña incorrectos." }, 401);
    }

    if (Number(user.active) < 0) {
      return json({ error: "Tu usuario está desactivado. Contacta al administrador." }, 403);
    }

    if (Number(user.active) !== 1) {
      return json({ error: "Tu usuario está pendiente de autorización del administrador." }, 403);
    }

    const attemptedHash = await hashPassword(body.password, user.password_salt, context.env);
    if (attemptedHash !== user.password_hash) {
      return json({ error: "Correo o contraseña incorrectos." }, 401);
    }

    const token = await createSession(db, user.id);
    return json({ token, user: publicUser(user) }, 200, {
      "Set-Cookie": sessionCookie(token)
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
