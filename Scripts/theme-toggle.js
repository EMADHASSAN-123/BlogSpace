// theme-toggle.js
(function(){
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const mobileToggle = document.getElementById('mobileToggleTheme'); // إن وُجد
  const mobileToggleMenuBtn = document.getElementById('mobileToggleThemeMenuBtn'); // إن وُجد في الصفحة
  const themeIconContainer = document.getElementById('themeIcon');

  const ICONS = {
    light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636M12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>`,
    dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
  };

  function setMetaThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  function applyTheme(name) {
    if (name === 'dark') {
      root.classList.add('dark');
      if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
      if (themeIconContainer) themeIconContainer.innerHTML = ICONS.dark;
      setMetaThemeColor('#111827');
    } else {
      root.classList.remove('dark');
      if (themeToggle) themeToggle.setAttribute('aria-pressed', 'false');
      if (themeIconContainer) themeIconContainer.innerHTML = ICONS.light;
      setMetaThemeColor('#ffffff');
    }
  }

  function getStoredTheme() {
    try {
      const s = localStorage.getItem('theme');
      if (s === 'dark' || s === 'light') return s;
    } catch (e) {}
    return null;
  }

  function toggleTheme() {
    const current = root.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch(e){}
    applyTheme(next);
  }

  function init() {
    const initial = root.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(initial);

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (mobileToggle) mobileToggle.addEventListener('click', toggleTheme);
    if (mobileToggleMenuBtn) mobileToggleMenuBtn.addEventListener('click', toggleTheme);

    [themeToggle, mobileToggle, mobileToggleMenuBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        if (!getStoredTheme()) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      };
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', listener);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(listener);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
