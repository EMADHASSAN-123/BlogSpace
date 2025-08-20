// theme-init.js
// يطبّق dark سريعاً اعتماداً على localStorage أو تفضيل النظام لتقليل FOUC
(function(){
  try {
    const saved = localStorage.getItem('theme'); // 'dark' | 'light' | null
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (saved === null && prefersDark)) {
      document.documentElement.classList.add('dark');
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = '#111827';
    } else {
      document.documentElement.classList.remove('dark');
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = '#ffffff';
    }
  } catch (e) {
    console.warn('theme-init error', e);
  }
})();
