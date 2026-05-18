import { permanentDeleteFile, checkFileExists } from './google-drive.js';
import { logSystem } from './logger.js';

export async function cleanupExpiredShares(env, db, limit = null) {
  let cleaned = 0;

  // 1. Remove expired shares (delete file from Drive + DB record)
  const expiredQuery = limit
    ? `SELECT * FROM shared_files WHERE expires_at < datetime('now') LIMIT ${limit}`
    : "SELECT * FROM shared_files WHERE expires_at < datetime('now')";
  const { results: expired } = await db.prepare(expiredQuery).all();

  for (const file of expired) {
    try {
      await permanentDeleteFile(env, db, file.account_id, file.drive_file_id);
    } catch {}
    await db.prepare('DELETE FROM shared_files WHERE id = ?').bind(file.id).run();
    cleaned++;
  }

  // 2. Remove orphaned shares (file no longer exists on Drive)
  const { results: active } = await db.prepare(
    "SELECT * FROM shared_files WHERE expires_at >= datetime('now')"
  ).all();

  let orphaned = 0;
  for (const file of active) {
    const exists = await checkFileExists(env, db, file.account_id, file.drive_file_id);
    if (!exists) {
      await db.prepare('DELETE FROM shared_files WHERE id = ?').bind(file.id).run();
      orphaned++;
      cleaned++;
    }
  }

  if (expired.length > 0 || orphaned > 0) {
    const parts = [];
    if (expired.length > 0) parts.push(`${expired.length} expired`);
    if (orphaned > 0) parts.push(`${orphaned} orphaned`);
    await logSystem(db, 'info', `Share cleanup: removed ${parts.join(', ')} file(s)`);
  }

  return cleaned;
}
