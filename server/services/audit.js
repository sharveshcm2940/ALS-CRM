import { randomUUID } from "node:crypto";
import { query, pool } from "../config/index.js";
export async function audit(actor, action, module, record, summary, db = pool) {
  await query(
    "INSERT INTO activity_logs(id,actor_id,action,module,record_id,summary) VALUES (?,?,?,?,?,?)",
    [
      randomUUID(),
      actor || null,
      action,
      module,
      record || null,
      summary.slice(0, 255),
    ],
    db,
  );
}
export async function transaction(fn) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const value = await fn(db);
    await db.commit();
    return value;
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}
