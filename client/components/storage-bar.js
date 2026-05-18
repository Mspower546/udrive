function formatStorage(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function renderStorageBar(used, limit, fileCount = null) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const usedStr = formatStorage(used);
  const limitStr = formatStorage(limit);
  const countStr = fileCount !== null && fileCount !== undefined ? ` (${fileCount})` : '';

  return `
    <div class="storage-bar">
      <div class="storage-bar-fill" style="width: ${percent}%"></div>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${usedStr} of ${limitStr} used${countStr}</p>
  `;
}
