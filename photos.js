import { getDB, json } from "../_lib.js";

export async function onRequestGet(context) {
  try {
    const db = getDB(context);
    const row = await db.prepare("select count(*) as total from users").first();
    return json({ needsSetup: Number(row?.total || 0) === 0 });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
