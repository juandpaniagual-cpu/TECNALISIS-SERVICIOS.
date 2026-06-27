import { cleanEmail, createSession, getDB, hashPassword, json, publicUser, readJson, requireFields } from "../_lib.js";

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
        and active = 1
    `).bind(email).first();

    if (!user) {
      return json({ error: "Correo o contraseña incorrectos." }, 401);
    }

    const attemptedHash = await hashPassword(body.password, user.password_salt, context.env);
    if (attemptedHash !== user.password_hash) {
      return json({ error: "Correo o contraseña incorrectos." }, 401);
    }

    const token = await createSession(db, user.id);
    return json({ token, user: publicUser(user) });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
