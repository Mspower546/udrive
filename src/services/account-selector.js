export async function selectAccount(db, fileSize) {
  const { results } = await db.prepare(
    'SELECT * FROM accounts WHERE is_primary = 0 ORDER BY (storage_limit - storage_used) DESC'
  ).all();

  for (const account of results) {
    const available = account.storage_limit - account.storage_used;
    if (available >= fileSize) {
      return account;
    }
  }

  return null;
}

export async function selectShareAccount(db, fileSize) {
  const setting = await db.prepare("SELECT value FROM settings WHERE key = 'share_allowed_accounts'").first();
  let allowedIds = null;
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allowedIds = parsed;
      }
    } catch {}
  }

  const { results } = await db.prepare(
    'SELECT * FROM accounts ORDER BY (storage_limit - storage_used) DESC'
  ).all();

  for (const account of results) {
    if (allowedIds && !allowedIds.includes(account.id)) continue;
    const available = account.storage_limit - account.storage_used;
    if (available >= fileSize) {
      return account;
    }
  }

  return null;
}
