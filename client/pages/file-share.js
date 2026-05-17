import { api } from '../api.js';
import { hasPermission } from '../auth-state.js';
import { formatDateTime } from '../time-utils.js';

let activeTab = 'shares';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function renderFileSharePage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="max-w-5xl mx-auto p-4 md:p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold">File Share</h1>
      </div>

      <div class="border-b border-gray-200 dark:border-gray-700 mb-4">
        <div class="flex gap-4">
          <button class="tab-btn pb-2 px-1 text-sm font-medium border-b-2 transition-colors" data-tab="shares">
            Active Shares
          </button>
          <button class="tab-btn pb-2 px-1 text-sm font-medium border-b-2 transition-colors" data-tab="settings">
            Settings
          </button>
        </div>
      </div>

      <div id="share-tab-content"></div>
    </div>
  `;

  main.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderFileSharePage();
    });
  });

  updateTabStyles(main);

  if (activeTab === 'shares') {
    renderSharesTab(main.querySelector('#share-tab-content'));
  } else {
    renderSettingsTab(main.querySelector('#share-tab-content'));
  }
}

function updateTabStyles(main) {
  main.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === activeTab) {
      btn.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
      btn.classList.remove('border-transparent', 'text-gray-500');
    } else {
      btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
      btn.classList.add('border-transparent', 'text-gray-500');
    }
  });
}

async function renderSharesTab(container) {
  container.innerHTML = `<p class="text-sm text-gray-500">Loading...</p>`;

  try {
    const data = await api('/api/share/list');
    const canManage = hasPermission('share:manage');

    if (data.shares.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <span class="material-icons-outlined text-gray-400 text-4xl">link_off</span>
          <p class="mt-3 text-gray-500 dark:text-gray-400">No active shares</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm text-gray-500">${data.total} share${data.total !== 1 ? 's' : ''}</p>
        ${canManage ? `<button id="cleanup-btn" class="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cleanup Expired</button>` : ''}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left">
              <th class="pb-2 font-medium text-gray-500">File</th>
              <th class="pb-2 font-medium text-gray-500">Size</th>
              <th class="pb-2 font-medium text-gray-500 hidden md:table-cell">Downloads</th>
              <th class="pb-2 font-medium text-gray-500 hidden md:table-cell">Expires</th>
              <th class="pb-2 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody id="shares-tbody"></tbody>
        </table>
      </div>
    `;

    const tbody = container.querySelector('#shares-tbody');
    for (const share of data.shares) {
      const isExpired = new Date(share.expiresAt) < new Date();
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-100 dark:border-gray-800';
      tr.innerHTML = `
        <td class="py-2.5 pr-3">
          <div class="flex items-center gap-2">
            ${share.hasPassword ? '<span class="material-icons-outlined text-xs text-amber-500">lock</span>' : ''}
            <span class="truncate max-w-[200px]" title="${escapeHtml(share.fileName)}">${escapeHtml(share.fileName)}</span>
          </div>
        </td>
        <td class="py-2.5 pr-3 text-gray-500">${formatFileSize(share.fileSize)}</td>
        <td class="py-2.5 pr-3 text-gray-500 hidden md:table-cell">${share.downloadCount}</td>
        <td class="py-2.5 pr-3 hidden md:table-cell ${isExpired ? 'text-red-500' : 'text-gray-500'}">${formatDateTime(share.expiresAt)}</td>
        <td class="py-2.5">
          <div class="flex items-center gap-1">
            <button class="copy-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" data-share-id="${share.shareId}" title="Copy link">
              <span class="material-icons-outlined text-sm">content_copy</span>
            </button>
            ${canManage ? `
              <button class="delete-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500" data-share-id="${share.shareId}" title="Delete">
                <span class="material-icons-outlined text-sm">delete</span>
              </button>
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const link = `${window.location.origin}/#/share/${btn.dataset.shareId}`;
        navigator.clipboard.writeText(link);
        btn.querySelector('span').textContent = 'check';
        setTimeout(() => { btn.querySelector('span').textContent = 'content_copy'; }, 1500);
      });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this share? The file will be permanently removed.')) return;
        try {
          await api(`/api/share/${btn.dataset.shareId}`, { method: 'DELETE' });
          renderFileSharePage();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    if (canManage) {
      container.querySelector('#cleanup-btn')?.addEventListener('click', async () => {
        const btn = container.querySelector('#cleanup-btn');
        btn.disabled = true;
        btn.textContent = 'Cleaning...';
        try {
          const result = await api('/api/share/cleanup', { method: 'POST' });
          btn.textContent = `Cleaned ${result.cleaned} file(s)`;
          setTimeout(() => renderFileSharePage(), 1500);
        } catch (err) {
          btn.textContent = 'Error';
          setTimeout(() => { btn.textContent = 'Cleanup Expired'; btn.disabled = false; }, 2000);
        }
      });
    }
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm">${err.message}</p>`;
  }
}

async function renderSettingsTab(container) {
  if (!hasPermission('share:settings')) {
    container.innerHTML = `<p class="text-sm text-gray-500">You don't have permission to manage share settings.</p>`;
    return;
  }

  container.innerHTML = `<p class="text-sm text-gray-500">Loading...</p>`;

  try {
    const settings = await api('/api/share/settings');

    container.innerHTML = `
      <div class="max-w-lg space-y-4">
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p class="text-sm font-medium">Enable File Sharing</p>
            <p class="text-xs text-gray-500">Allow public file uploads</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="share-enabled" class="sr-only peer" ${settings.share_enabled === '1' ? 'checked' : ''}>
            <div class="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Share Folder ID</label>
          <input type="text" id="share-folder-id" value="${escapeHtml(settings.share_folder_id || '')}" placeholder="Google Drive folder ID for shared files" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          <p class="text-xs text-gray-400 mt-1">Dedicated folder where shared files are stored</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Expiry (days)</label>
            <input type="number" id="share-default-expiry" value="${settings.share_default_expiry_days || '7'}" min="1" max="365" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Expiry (days)</label>
            <input type="number" id="share-max-expiry" value="${settings.share_max_expiry_days || '30'}" min="1" max="365" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max File Size (MB)</label>
            <input type="number" id="share-max-size" value="${settings.share_max_file_size_mb || '100'}" min="1" max="4096" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          </div>
        </div>

        <button id="save-share-settings" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Save Settings
        </button>

        <p id="share-settings-msg" class="text-sm hidden"></p>
      </div>
    `;

    container.querySelector('#save-share-settings').addEventListener('click', async () => {
      const btn = container.querySelector('#save-share-settings');
      const msgEl = container.querySelector('#share-settings-msg');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        await api('/api/share/settings', {
          method: 'PUT',
          body: JSON.stringify({
            share_enabled: container.querySelector('#share-enabled').checked ? '1' : '0',
            share_folder_id: container.querySelector('#share-folder-id').value.trim(),
            share_default_expiry_days: container.querySelector('#share-default-expiry').value,
            share_max_expiry_days: container.querySelector('#share-max-expiry').value,
            share_max_file_size_mb: container.querySelector('#share-max-size').value
          })
        });
        msgEl.textContent = 'Settings saved';
        msgEl.className = 'text-sm text-green-600';
        msgEl.classList.remove('hidden');
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
      } catch (err) {
        msgEl.textContent = err.message;
        msgEl.className = 'text-sm text-red-500';
        msgEl.classList.remove('hidden');
      }

      btn.disabled = false;
      btn.textContent = 'Save Settings';
    });
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-sm">${err.message}</p>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
