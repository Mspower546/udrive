function formatStorage(bytes) {
  if (bytes < 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes < 1024 ** 3) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
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
