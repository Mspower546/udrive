let menuEl = null;
let closeHandler = null;

export function showContextMenu(x, y, items) {
  hideContextMenu();
  menuEl = document.getElementById('context-menu');

  menuEl.innerHTML = `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-48">
      ${items.map(item => {
        if (item.divider) return '<hr class="my-1 border-gray-200 dark:border-gray-700">';
        return `<div class="context-menu-item" data-action="${item.action}">
          <span class="material-icons-outlined text-lg">${item.icon}</span>
          <span>${item.label}</span>
        </div>`;
      }).join('')}
    </div>
  `;

  menuEl.style.left = `${x}px`;
  menuEl.style.top = `${y}px`;
  menuEl.classList.remove('hidden');

  const rect = menuEl.getBoundingClientRect();
  let finalX = x;
  let finalY = y;

  if (rect.right > window.innerWidth) finalX = x - rect.width;
  if (finalX < 0) finalX = 8;

  if (rect.bottom > window.innerHeight) finalY = y - rect.height;
  if (finalY < 0) finalY = 8;

  menuEl.style.left = `${finalX}px`;
  menuEl.style.top = `${finalY}px`;

  menuEl.querySelectorAll('.context-menu-item').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      const item = items.find(i => i.action === action);
      if (item && item.handler) item.handler();
      hideContextMenu();
    });
  });

  closeHandler = (e) => {
    if (!menuEl.contains(e.target)) hideContextMenu();
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

export function hideContextMenu() {
  if (menuEl) {
    menuEl.classList.add('hidden');
    menuEl.innerHTML = '';
  }
  if (closeHandler) {
    document.removeEventListener('click', closeHandler);
    closeHandler = null;
  }
}
