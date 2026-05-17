import { permanentDeleteFile } from './google-drive.js';
import { logSystem } from './logger.js';

export async function cleanupExpiredShares(env, db, limit = null) {
  const query = limit
    ? `SELECT * FROM shared_files WHERE expires_at < datetime('now') LIMIT ${limit}`
    : "SELECT * FROM shared_files WHERE expires_at < datetime('now')";
  const { results } = await db.prepare(query).all();

  for (const file of results) {
    try {
      await permanentDeleteFile(env, db, file.account_id, file.drive_file_id);
    } catch {}
    await db.prepare('DELETE FROM shared_files WHERE id = ?').bind(file.id).run();
  }

  if (results.length > 0) {
    await logSystem(db, 'info', `Cleaned up ${results.length} expired shared file(s)`);
  }

  return results.length;
}
