import { api } from '../api.js';
import { showToast } from '../components/toast.js';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function getDeviceIcon(userAgent) {
  if (!userAgent) return 'computer';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'smartphone';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'computer';
}

function getBrowserName(userAgent) {
  if (!userAgent) return 'Unknown Browser';
  const ua = userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  return 'Unknown Browser';
}

function getOS(userAgent) {
  if (!userAgent) return '';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return '';
}

async function loadSessions() {
  const container = document.getElementById('sessions-container');
  try {
    const data = await api('/api/users/sessions');
    const sessions = data.sessions || [];
    const currentToken = data.currentToken || '';

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
          <span class="material-icons-outlined text-5xl mb-3">devices</span>
          <p class="text-lg font-medium">No active sessions</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm text-gray-500 dark:text-gray-400">${sessions.length} active session${sessions.length > 1 ? 's' : ''}</span>
        <button id="logout-all-others" class="text-sm text-red-500 hover:text-red-600 font-medium">Logout all other devices</button>
      </div>
      <div class="space-y-3">
        ${sessions.map(session => {
          const isCurrent = session.token === currentToken;
          const device = getDeviceIcon(session.user_agent);
          const browser = getBrowserName(session.user_agent);
          const os = getOS(session.user_agent);
          return `
            <div class="flex items-center gap-4 p-4 rounded-xl border ${isCurrent ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}">
              <div class="shrink-0">
                <span class="material-icons-outlined text-3xl ${isCurrent ? 'text-blue-500' : 'text-gray-400'}">${device}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">${browser} on ${os || 'Unknown OS'}</span>
                  ${isCurrent ? '<span class="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">This device</span>' : ''}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <span>IP: ${session.ip || 'Unknown'}</span>
                  <span>·</span>
                  <span>Last active: ${formatTime(session.last_activity || session.created_at)}</span>
                  <span>·</span>
                  <span>Created: ${formatTime(session.created_at)}</span>
                </div>
              </div>
              ${!isCurrent ? `
                <button class="logout-session shrink-0 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors" data-token="${session.token}" title="Logout this device">
                  <span class="material-icons-outlined text-base">logout</span>
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>`;

    container.querySelectorAll('.logout-session').forEach(btn => {
      btn.addEventListener('click', async () => {
        const token = btn.dataset.token;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons-outlined text-base animate-spin">sync</span>';
        try {
          await api('/api/users/sessions/' + token, { method: 'DELETE' });
          showToast('Device logged out', 'success');
          loadSessions();
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
          btn.innerHTML = '<span class="material-icons-outlined text-base">logout</span>';
        }
      });
    });

    container.querySelector('#logout-all-others')?.addEventListener('click', async () => {
      if (!confirm('Logout all other devices?')) return;
      try {
        await api('/api/users/sessions/others', { method: 'DELETE' });
        showToast('All other devices logged out', 'success');
        loadSessions();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  } catch (err) {
    container.innerHTML = `
      <div class="text-center py-12 text-red-500">
        <span class="material-icons-outlined text-5xl mb-3">error</span>
        <p class="text-sm">${err.message}</p>
      </div>`;
  }
}

export function renderSessionsPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="p-3 md:p-6 max-w-3xl">
      <div class="flex items-center gap-3 mb-6">
        <span class="material-icons-outlined text-2xl text-blue-500">devices</span>
        <div>
          <h1 class="text-lg font-semibold">Active Sessions</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400">Manage devices where your account is logged in</p>
        </div>
      </div>
      <div id="sessions-container">
        <div class="flex items-center justify-center h-32">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  `;
  loadSessions();
}
