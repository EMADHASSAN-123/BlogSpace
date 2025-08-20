// /Scripts/utils.js
export function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
} 

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
  return `${Math.floor(diff / 86400)} يوم`;
}

// safe escape for text nodes (use when inserting user text as textContent)
export function escapeHTMLText(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// small helper to create avatar url (Dicebear)
export function avatarFor(seed = 'default') {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}

// helper for toggling skeletons / loading states
export function createSkeleton(height = 48) {
  const el = document.createElement('div');
  el.className = 'skeleton h-' + height + ' rounded';
  return el;
}

export function setSiteYear() {
  document.getElementById('site-year').textContent = new Date().getFullYear();
}
