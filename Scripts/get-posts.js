// get-posts.refactor.prefetch.js
// Refactored + prefetch & content caching
(() => {
  'use strict';

  // ----- إعدادات -----
  const CONFIG = {
    FUNCTIONS_BASE: 'https://vbnnzmhopcjlkvtuubcj.supabase.co/functions/v1',
    FUNCTION_NAME: 'get-public-posts',
    PER_PAGE: 6,
    CACHE_KEY: 'public_posts_cache_v1', // existing key you use
    PREFETCH_DEBOUNCE_MS: 150,
    CACHE_TTL_MS: 1000 * 60 * 60 // (اختياري) افتراضي ساعة لصلاحية العناصر المفصلة
  };

  // ----- Helpers -----
  function timeAgo(dateIso) {
    if (!dateIso) return '';
    const date = new Date(dateIso);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
    return `${Math.floor(diff / 86400)} يوم`;
  }

  // ----- DOM refs -----
  const DOM = {
    postsGrid: document.getElementById('posts-grid'),
    featuredTitle: document.getElementById('featured-title'),
    featuredExcerpt: document.getElementById('featured-excerpt'),
    featuredDate: document.getElementById('featured-date'),
    featuredCategory: document.getElementById('featured-category'),
    featuredReadMore: document.getElementById('featured-read-more'),
    loadMoreButton: document.getElementById('load-more')
  };

  // ----- CacheService (مسؤول عن sessionStorage وخرائط الكاش) -----
  const CacheService = (() => {
    let cacheByCategory = { all: [] };

    function loadFromSession() {
      try {
        const raw = sessionStorage.getItem(CONFIG.CACHE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        // support both array (legacy) or object { all: [...] }
        if (Array.isArray(parsed)) cacheByCategory.all = parsed.slice();
        else if (parsed && Array.isArray(parsed.all)) cacheByCategory = parsed;
      } catch (e) {
        console.warn('Cache corrupted — clearing', e);
        sessionStorage.removeItem(CONFIG.CACHE_KEY);
        cacheByCategory = { all: [] };
      }
    }

    function persist() {
      try {
        sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheByCategory));
      } catch (e) {
        console.warn('Failed to persist cache', e);
      }
    }

    function getCategory(cat = 'all') {
      return (cacheByCategory[cat] || []).slice();
    }

    function setCategory(cat = 'all', posts = []) {
      cacheByCategory[cat] = posts.slice();
      persist();
    }

    function appendToCategory(cat = 'all', posts = []) {
      cacheByCategory[cat] = (cacheByCategory[cat] || []).concat(posts);
      persist();
    }

    function replaceAll(posts = []) {
      cacheByCategory.all = posts.slice();
      persist();
    }

    // new: upsert a detailed post into 'all' (keeps content)
    function upsertPostIntoAll(post) {
      if (!post || !post.id) return;
      const all = cacheByCategory.all || [];
      const idx = all.findIndex(p => String(p.id) === String(post.id));
      const toStore = Object.assign({}, all[idx] || {}, post, { _cached_at: Date.now() });
      if (idx === -1) all.unshift(toStore);
      else all[idx] = toStore;
      cacheByCategory.all = all;
      persist();
    }

    loadFromSession();
    return { getCategory, setCategory, appendToCategory, replaceAll, upsertPostIntoAll, _raw: () => cacheByCategory };
  })();

  // ----- PostService (API) مسؤولة عن جلب الصفحات وأيضًا جلب منشور مفصل -----
  const PostService = (() => {
    let currentAbort = null;

    async function fetchPostsPage({ page = 1, per = CONFIG.PER_PAGE, category = null, retry = 1 } = {}) {
      if (currentAbort) try { currentAbort.abort(); } catch (e) {}
      currentAbort = new AbortController();
      const signal = currentAbort.signal;

      const qs = new URLSearchParams({ page: String(page), per: String(per) });
      if (category && category !== 'all') qs.set('category', category);

      const url = `${CONFIG.FUNCTIONS_BASE}/${CONFIG.FUNCTION_NAME}?${qs.toString()}`;

      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal, cache: 'no-store' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Server ${res.status}: ${txt}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : (data.posts || []);
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        if (retry > 0) {
          await new Promise(r => setTimeout(r, 500));
          return fetchPostsPage({ page, per, category, retry: retry - 1 });
        }
        throw err;
      }
    }

    // new: fetch single post by id (using same edge function with ?id= or separate endpoint)
    async function fetchPostById(id, retry = 1) {
      if (!id) return null;
      // abort previous single-fetch? we keep it separate to avoid canceling list fetches
      const controller = new AbortController();
      const signal = controller.signal;
      const url = `${CONFIG.FUNCTIONS_BASE}/${CONFIG.FUNCTION_NAME}?id=${encodeURIComponent(id)}`;
      try {
        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal, cache: 'no-store' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Server ${res.status}: ${txt}`);
        }
        const data = await res.json();
        // handle various shapes
        if (!data) return null;
        if (Array.isArray(data)) return data.find(p => String(p.id) === String(id)) || data[0] || null;
        if (data.posts && Array.isArray(data.posts)) return data.posts.find(p => String(p.id) === String(id)) || data.posts[0] || null;
        return data;
      } catch (err) {
        if (retry > 0 && err.name !== 'AbortError') {
          await new Promise(r => setTimeout(r, 300));
          return fetchPostById(id, retry - 1);
        }
        throw err;
      }
    }

    return { fetchPostsPage, fetchPostById, _abort: () => currentAbort && currentAbort.abort() };
  })();

  // ----- Renderer (DOM) -----
  const Renderer = (() => {
    function createPostCard(post) {
      const wrapper = document.createElement('div');
      wrapper.className = "bg-gray-900/70 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30 hover:shadow-[0_0_15px_rgba(138,43,226,0.3)] transition-all duration-300";
      if (post.id) wrapper.dataset.postId = post.id;

      const container = document.createElement('div');
      container.className = 'relative';

      const h3 = document.createElement('h3');
      h3.className = 'text-lg font-bold text-white mb-2 line-clamp-2';
      h3.textContent = post.title || '';

      const p = document.createElement('p');
      p.className = 'text-gray-300 mb-3 text-sm line-clamp-3';
      p.textContent = post.excerpt || '';

      const meta = document.createElement('div');
      meta.className = 'flex justify-between items-center text-xs';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'text-purple-300';
      timeSpan.textContent = timeAgo(post.created_at ? new Date(post.created_at).toISOString() : '');

      const catSpan = document.createElement('span');
      catSpan.className = 'bg-indigo-900/50 px-2 py-1 rounded-full';
      catSpan.textContent = post.category || 'عام';

      meta.appendChild(timeSpan);
      meta.appendChild(catSpan);

      const btn = document.createElement('button');
      btn.className = 'read-more-btn mt-3 w-full px-3 py-1.5 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white text-sm rounded-full hover:from-purple-700 hover:to-indigo-700 transition-colors';
      btn.type = 'button';
      btn.textContent = 'قراءة المزيد';
      if (post.id) {
        btn.addEventListener('click', () => {
          window.location.href = `post.html?id=${encodeURIComponent(post.id)}`;
        });
      }

      container.appendChild(h3);
      container.appendChild(p);
      container.appendChild(meta);
      container.appendChild(btn);
      wrapper.appendChild(container);

      // attach prefetch listeners (pointerover for desktop hover, touchstart/mousedown for mobile/quick click)
      attachPrefetchHooks(btn, post.id);

      return wrapper;
    }

    function renderPostsAppend(posts) {
      if (!DOM.postsGrid) return;
      const frag = document.createDocumentFragment();
      posts.forEach(p => frag.appendChild(createPostCard(p)));
      DOM.postsGrid.appendChild(frag);
    }

    function updateFeaturedPost(post) {
      if (!post) return;
      if (DOM.featuredTitle) DOM.featuredTitle.textContent = post.title || 'عنوان';
      if (DOM.featuredExcerpt) DOM.featuredExcerpt.textContent = post.excerpt || '';
      if (DOM.featuredDate) DOM.featuredDate.textContent = timeAgo(post.created_at);
      if (DOM.featuredCategory) DOM.featuredCategory.textContent = post.category || 'عام';
      if (DOM.featuredReadMore) DOM.featuredReadMore.onclick = () => {
        if (post.id) window.location.href = `post.html?id=${encodeURIComponent(post.id)}`;
      };
    }

    function renderEmptyState() {
      if (!DOM.postsGrid) return;
      DOM.postsGrid.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'col-span-full text-center text-gray-400 py-8';
      el.textContent = 'لا توجد منشورات حالياً.';
      DOM.postsGrid.appendChild(el);
    }

    function renderErrorState() {
      if (!DOM.postsGrid) return;
      DOM.postsGrid.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'col-span-full text-center text-red-300 py-8';
      el.textContent = 'عذراً، حدث خطأ أثناء تحميل المقالات. يرجى المحاولة لاحقاً.';
      DOM.postsGrid.appendChild(el);
    }

    function showLoadingSkeleton(count = 6) {
      if (!DOM.postsGrid) return;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const sk = document.createElement('div');
        sk.className = "bg-gray-800/30 rounded-lg p-4 animate-pulse h-40";
        frag.appendChild(sk);
      }
      DOM.postsGrid.appendChild(frag);
    }

    function removeLoadingSkeleton() {
      if (!DOM.postsGrid) return;
      DOM.postsGrid.querySelectorAll('.animate-pulse').forEach(el => el.remove());
    }

    return {
      createPostCard, renderPostsAppend, updateFeaturedPost,
      renderEmptyState, renderErrorState, showLoadingSkeleton, removeLoadingSkeleton
    };
  })();

  // ----- Prefetch logic & helper -----
  // debounce map per id to avoid duplicate prefetches
  const prefetchTimers = new Map();
  const prefetchInFlight = new Set();

  function attachPrefetchHooks(element, postId) {
    if (!element || !postId) return;

    const doPrefetch = async () => {
      if (prefetchInFlight.has(postId)) return;
      // if cache already has content field for this id, skip
      const existing = CacheService.getCategory('all').find(p => String(p.id) === String(postId));
      if (existing && existing.content) return;
      prefetchInFlight.add(postId);
      try {
        const detailed = await PostService.fetchPostById(postId);
        if (detailed) {
          // store detailed post into cache (upsert)
          CacheService.upsertPostIntoAll(detailed);
        }
      } catch (e) {
        // ignore prefetch failures (non-blocking)
        console.warn('prefetch failed for', postId, e);
      } finally {
        prefetchInFlight.delete(postId);
      }
    };

    const onPointerOver = () => {
      if (prefetchTimers.has(postId)) clearTimeout(prefetchTimers.get(postId));
      prefetchTimers.set(postId, setTimeout(() => { doPrefetch(); prefetchTimers.delete(postId); }, CONFIG.PREFETCH_DEBOUNCE_MS));
    };

    const onCancel = () => {
      if (prefetchTimers.has(postId)) {
        clearTimeout(prefetchTimers.get(postId));
        prefetchTimers.delete(postId);
      }
    };

    element.addEventListener('pointerover', onPointerOver, { passive: true });
    element.addEventListener('mouseenter', onPointerOver, { passive: true });
    element.addEventListener('touchstart', onPointerOver, { passive: true });
    element.addEventListener('mousedown', onPointerOver, { passive: true });

    // cancel on leave
    element.addEventListener('pointerout', onCancel, { passive: true });
    element.addEventListener('mouseleave', onCancel, { passive: true });
  }

  // ----- fetchPostsPage wrapper that also upserts content if provided by server -----
  async function fetchPostsPageAndCache(page = 1, per = CONFIG.PER_PAGE, category = null) {
    const posts = await PostService.fetchPostsPage({ page, per, category });
    // if any returned item includes `content`, upsert into cache
    posts.forEach(p => {
      if (p && p.content) {
        CacheService.upsertPostIntoAll(p);
      }
    });
    return posts;
  }

  // ----- Controller (orchestrator) -----
  let currentPage = 1;
  let isLoading = false;
  let reachedEnd = false;
  let activeCategory = 'all';

  async function loadInitialPosts() {
    const cached = sessionStorage.getItem(CONFIG.CACHE_KEY);
    if (cached) {
      try {
        CacheService.replaceAll(JSON.parse(cached));
        const cachedAll = CacheService.getCategory('all');
        if (cachedAll.length) {
          Renderer.updateFeaturedPost(cachedAll[0]);
          Renderer.renderPostsAppend(cachedAll.slice(0, CONFIG.PER_PAGE));
        }
      } catch (e) {
        console.warn('الكاش تالف، سيتم تجاهله', e);
        sessionStorage.removeItem(CONFIG.CACHE_KEY);
      }
    }

    if (CacheService.getCategory('all').length === 0) Renderer.showLoadingSkeleton(CONFIG.PER_PAGE);

    try {
      isLoading = true;
      const posts = await fetchPostsPageAndCache(1, CONFIG.PER_PAGE);
      CacheService.replaceAll(posts); // replace snapshot of 'all' with server list
      // ensure persisted snapshot follows same shape (legacy code expects array)
      sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(CacheService.getCategory('all')));

      if (posts && posts.length) {
        // if some posts include content they were already upserted above
        // render initial page slice
        DOM.postsGrid && (DOM.postsGrid.innerHTML = '');
        Renderer.updateFeaturedPost(posts[0]);
        Renderer.renderPostsAppend(posts.slice(0, CONFIG.PER_PAGE));
        currentPage = 1;
        reachedEnd = posts.length < CONFIG.PER_PAGE;
        toggleLoadMoreUI();
      } else {
        DOM.postsGrid && (DOM.postsGrid.innerHTML = '');
        Renderer.renderEmptyState();
        reachedEnd = true;
        toggleLoadMoreUI();
      }
    } catch (err) {
      console.error('خطأ أثناء تحميل المنشورات:', err);
      Renderer.renderErrorState();
    } finally {
      isLoading = false;
      Renderer.removeLoadingSkeleton();
    }
  }

  async function loadMorePosts() {
    if (isLoading || reachedEnd) return;
    isLoading = true;
    const nextPage = currentPage + 1;
    Renderer.showLoadingSkeleton(3);

    try {
      const posts = await fetchPostsPageAndCache(nextPage, CONFIG.PER_PAGE, activeCategory);
      if (!posts || posts.length === 0) {
        reachedEnd = true;
        toggleLoadMoreUI();
        return;
      }

      Renderer.renderPostsAppend(posts);
      if (!CacheService.getCategory(activeCategory).length) CacheService.setCategory(activeCategory, []);
      CacheService.appendToCategory(activeCategory, posts);

      if (activeCategory === 'all') {
        CacheService.appendToCategory('all', posts);
        sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(CacheService.getCategory('all')));
      }

      currentPage = nextPage;
      if (posts.length < CONFIG.PER_PAGE) {
        reachedEnd = true;
        toggleLoadMoreUI();
      }
    } catch (err) {
      console.error('خطأ أثناء تحميل صفحة إضافية:', err);
      Renderer.renderErrorState();
    } finally {
      isLoading = false;
      Renderer.removeLoadingSkeleton();
    }
  }

  function toggleLoadMoreUI() {
    if (!DOM.loadMoreButton) return;
    if (reachedEnd) DOM.loadMoreButton.classList.add('hidden');
    else DOM.loadMoreButton.classList.remove('hidden');
  }

  // ----- filtering functions (unchanged largely) -----
  function setupActiveTabStyles(activeTabOrCategory) {
    const tabs = document.querySelectorAll('[data-category]');
    let activeEl = null;
    if (typeof activeTabOrCategory === 'string') {
      activeEl = Array.from(tabs).find(t => t.dataset.category === activeTabOrCategory);
    } else activeEl = activeTabOrCategory;

    tabs.forEach(t => {
      t.classList.remove('active-tab', 'from-purple-600', 'to-indigo-600', 'text-white');
      t.classList.add('text-purple-300');
      t.setAttribute('aria-pressed', 'false');
    });

    if (activeEl) {
      activeEl.classList.remove('text-purple-300');
      activeEl.classList.add('active-tab', 'from-purple-600', 'to-indigo-600', 'text-white');
      activeEl.setAttribute('aria-pressed', 'true');
    }
  }

  function debounce(fn, wait = 250) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  async function filterPostsByCategory(category) {
    activeCategory = category;
    currentPage = 1;
    reachedEnd = false;

    const tabs = document.querySelectorAll('[data-category]');
    tabs.forEach(t => {
      if (t.dataset.category === category) {
        t.classList.add('active-tab', 'from-purple-600', 'to-indigo-600', 'text-white');
        t.classList.remove('text-purple-300');
      } else {
        t.classList.remove('active-tab', 'from-purple-600', 'to-indigo-600', 'text-white');
        t.classList.add('text-purple-300');
      }
    });

    const norm = s => String(s || '').trim().toLowerCase();
    const localCache = CacheService.getCategory(category) || [];
    let filteredLocal = (localCache.length ? localCache : CacheService.getCategory('all').filter(p => norm(p.category) === norm(category)));

    if (filteredLocal.length > 0) {
      DOM.postsGrid && (DOM.postsGrid.innerHTML = '');
      Renderer.updateFeaturedPost(filteredLocal[0]);
      Renderer.renderPostsAppend(filteredLocal.slice(0, CONFIG.PER_PAGE));
      currentPage = 1;
      reachedEnd = filteredLocal.length < CONFIG.PER_PAGE;
      toggleLoadMoreUI();
      return;
    }

    try {
      DOM.postsGrid && (DOM.postsGrid.innerHTML = '');
      Renderer.showLoadingSkeleton(CONFIG.PER_PAGE);
      const posts = await fetchPostsPageAndCache(1, CONFIG.PER_PAGE, category);
      if (!posts || posts.length === 0) {
        CacheService.setCategory(category, []);
        sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(CacheService.getCategory('all')));
        Renderer.renderEmptyState();
        reachedEnd = true;
        toggleLoadMoreUI();
        return;
      }

      DOM.postsGrid && (DOM.postsGrid.innerHTML = '');
      Renderer.updateFeaturedPost(posts[0]);
      Renderer.renderPostsAppend(posts);
      CacheService.setCategory(category, posts.slice());
      sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(CacheService.getCategory('all')));
      currentPage = 1;
      reachedEnd = posts.length < CONFIG.PER_PAGE;
      toggleLoadMoreUI();
    } catch (err) {
      console.error('filterPostsByCategory error:', err);
      Renderer.renderErrorState();
    } finally {
      Renderer.removeLoadingSkeleton();
    }
  }

  function setupCategoryFilters() {
    const tabs = Array.from(document.querySelectorAll('[data-category]'));
    tabs.forEach(tab => tab.replaceWith(tab.cloneNode(true)));
    const freshTabs = Array.from(document.querySelectorAll('[data-category]'));

    const handleClick = debounce(async (tab) => {
      const cat = tab.dataset.category;
      setupActiveTabStyles(tab);
      try { await filterPostsByCategory(cat); } catch (err) { console.error('filterPostsByCategory failed:', err); }
    }, 120);

    freshTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoading) return;
        handleClick(tab);
      });
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isLoading) return;
          handleClick(tab);
        }
      });
      if (!tab.hasAttribute('tabindex')) tab.setAttribute('tabindex', '0');
      if (!tab.hasAttribute('role')) tab.setAttribute('role', 'button');
    });
  }

  function setupEventListeners() {
    if (DOM.loadMoreButton) DOM.loadMoreButton.addEventListener('click', loadMorePosts);
    setupCategoryFilters();

    if (window.supabase && typeof window.supabase.channel === 'function') {
      try {
        window.supabase
          .channel('public:posts')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
            loadInitialPosts();
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime not enabled or failed:', e);
      }
    }
  }

  // ----- بدء التنفيذ ----- 
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadInitialPosts();
  });

})();
