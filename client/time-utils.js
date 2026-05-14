import { api } from './api.js';

let cachedSettings = null;

export async function loadTimeSettings() {
  try {
    cachedSettings = await api('/api/settings');
  } catch {}
}

export function getTimeFormat() {
  return cachedSettings?.time_format || '24';
}

export function getTimezone() {
  return cachedSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const tz = getTimezone();
  const hour12 = getTimeFormat() === '12';

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12, timeZone: tz });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const tz = getTimezone();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });
}
