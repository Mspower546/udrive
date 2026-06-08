import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { downloadBackground, downloadViaBrowser } from '../components/transfer-panel.js';
import { hasPermission } from '../auth-state.js';
import { formatDate } from '../time-utils.js';

let starredList = [];

function formatFileSize(bytes) {
  if (!bytes || bytes === '0') return '—';
  const s = parseInt(bytes);
  if (s < 1024) return s + ' B';
  if (s < 1024*1024) return (s/1024).toFixed(1) + ' KB';
  if (s < 1024*1024*1024) return (s/(1024*1024)).toFixed(1) + ' MB';
  return (s/(1024*1024*1024)).toFixed(2) + ' GB';
}

function getFileIcon(mimeType) {
  if (!mimeType) return 'insert_drive_file';
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'movie';
  if (mimeType.startsWith('audio/')) return 'audio_file';
  if (mimeType.includes('pdf')) return 'picture_as_pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'description';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'folder_zip';
  return 'insert_drive_file';
}

function getFileIconColor(mimeType) {
  if (!mimeType) return 'text-gray-400';
  if (mimeType.startsWith('image/')) return 'text-red-500';
  if (mimeType.startsWith('video/')) return 'text-red-600';
  if (mimeType.includes('pdf')) return 'text-red-500';
  if (mimeType.includes('spreadsheet')) return 'text-green-600';
  if (mimeType.includes('document')) return 'text-blue-600';
  return 'text-gray-400';
}

function getStarred() {
  try { return JSON.parse(localStorage.getItem('udrive-starred') || '[]'); } catch { return []; }
}

function removeStar(fileId) {
  let starred = getStarred().filter(id => id !== fileId);
  localStorage.setItem('udrive-starred', JSON.stringify(starred));
  return starred;
}

async function fetchFileInfo(fileId) {
  try {
    return await api('/api/files/' + fileId + '/info');
  } catch {
    return null;
  }
}

async function loadStarredFiles() {
  const container = document.getElementById('starred-container');
  const starred = getStarred();
  
  if (starred.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <span class="material-icons-outlined text-5xl mb-3">star_outline</span>
        <p class="text-lg font-medium">No starred files</p>
        <p class="text-sm mt-1">Right-click any file and select "Star" to bookmark it</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-center h-32">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
    </div>`;

  const results = [];
  for (const fileId of starred) {
    const info = await fetchFileInfo(fileId);
    if (info) {
      results.push(info);
    }
  }
  starredList = results;

  if (results.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <span class="material-icons-outlined text-5xl mb-3">star_outline</span>
        <p class="text-lg font-medium">No starred files found</p>
        <p class="text-sm mt-1">Files may have been deleted or are no longer accessible</p>
        <button id="clear-starred" class="mt-3 text-sm text-red-500 hover:text-red-600">Clear all starred</button>
      </div>`;
    container.querySelector('#clear-starred')?.addEventListener('click', () => {
      localStorage.setItem('udrive-starred', '[]');
      loadStarredFiles();
      showToast('Cleared all starred files', 'info');
    });
    return;
  }

  container.innerHTML = `
    <div class="mb-3 flex items-center justify-between">
      <span class="text-xs text-gray-500 dark:text-gray-400">${results.length} starred file${results.length > 1 ? 's' : ''}</span>
      <button id="clear-all-starred" class="text-xs text-red-500 hover:text-red-600">Clear all</button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            <th class="pb-3 pt-2 pl-4">Name</th>
            <th class="pb-3 pt-2 hidden md:table-cell">Modified</th>
            <th class="pb-3 pt-2 hidden sm:table-cell">Size</th>
            <th class="pb-3 pt-2 pr-4 w-16"></th>
          </tr>
        </thead>
        <tbody>
          ${results.map(file => `
            <tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" data-id="${file.id}">
              <td class="py-2 pl-4">
                <div class="flex items-center gap-3">
                  <span class="material-icons-outlined text-2xl ${getFileIconColor(file.mimeType)}">${getFileIcon(file.mimeType)}</span>
                  <span class="text-sm font-medium truncate max-w-md">${file.name ? escapeHtml(file.name) : 'Unknown'}</span>
                </div>
              </td>
              <td class="py-2 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">${formatDate(file.modifiedTime)}</td>
              <td class="py-2 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">${formatFileSize(file.size)}</td>
              <td class="py-2 pr-4">
                <button class="unstar-btn p-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500" data-id="${file.id}" title="Remove from starred">
                  <span class="material-icons-outlined text-base">star</span>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

  container.querySelectorAll('.unstar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      removeStar(id);
      showToast('Removed from starred', 'info');
      loadStarredFiles();
    });
  });

  container.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('dblclick', () => {
      window.location.hash = '/';
      setTimeout(() => {
        const file = results.find(f => f.id === row.dataset.id);
        if (file) showToast('Navigate to: ' + file.name, 'info');
      }, 300);
    });
  });

  container.querySelector('#clear-all-starred')?.addEventListener('click', () => {
    if (!confirm('Remove all starred files?')) return;
    localStorage.setItem('udrive-starred', '[]');
    loadStarredFiles();
    showToast('Cleared all starred files', 'info');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export function renderStarredPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="p-3 md:p-6">
      <div class="flex items-center gap-3 mb-4">
        <span class="material-icons-outlined text-2xl text-amber-500">star</span>
        <h1 class="text-lg font-semibold">Starred Files</h1>
      </div>
      <div id="starred-container">
        <div class="flex items-center justify-center h-32">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
        </div>
      </div>
    </div>
  `;
  loadStarredFiles();
}
