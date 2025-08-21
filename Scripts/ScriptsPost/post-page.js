// /Scripts/ScriptsPost/post-page.js  (refactored)
// مسؤوليات مفصّلة: CacheService, PostService, Renderer, Controller
import { getQueryParam, timeAgo, setSiteYear } from './utils.js';
import { supabase } from '../supabaseClient.js';

// ------ إعدادات ------
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 دقائق (قابل للتعديل)
const SESSION_PREFIX = 'post_cache:'; // الشكل: post_cache:<id>

// ------ CacheService: مسؤول عن sessionStorage فقط ------
const CacheService = (() => {
  function _key(id) { return `${SESSION_PREFIX}${id}`; }

  function get(id) {
    try {
      const raw = sessionStorage.getItem(_key(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // parsed should be object { post: {...}, ts: number }
      if (!parsed || !parsed.post) return null;
      return parsed;
    } catch (e) {
      console.warn('CacheService.get parse error, removing key', e);
      sessionStorage.removeItem(_key(id));
      return null;
    }
  }

  function set(id, post, ttlMs = CACHE_TTL_MS) {
    try {
      const payload = { post, ts: Date.now(), ttl: ttlMs };
      sessionStorage.setItem(_key(id), JSON.stringify(payload));
    } catch (e) {
      console.warn('CacheService.set failed', e);
    }
  }

  function remove(id) {
    try { sessionStorage.removeItem(_key(id)); } catch (e) { /* ignore */ }
  }

  function isFresh(cached) {
    if (!cached) return false;
    const { ts, ttl } = cached;
    if (!ts) return false;
    return (Date.now() - ts) <= (ttl ?? CACHE_TTL_MS);
  }

  return { get, set, remove, isFresh };
})();

// ------ PostService: مسؤول عن جلب المنشور (Supabase) ------
const PostService = (() => {
  // fetch post and try to include profile in single query
  async function fetchPost(id) {
    if (!id) return null;
    try {
      // نستخدم subselect profiles إن كان المعامل معرفًا في DB
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          excerpt,
          content,
          created_at,
          author_id,
          category,
          profiles ( id, full_name, avatar_url )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        // لا نرمي خطأ فوراً؛ نسمح للمتحكّم أن يتعامل مع الـ cached fallback
        console.warn('PostService.fetchPost supabase error', error);
        throw error;
      }
      if (!data) return null;

      // normalize author profile location (some schemas return profiles as array/object)
      const authorProfile = (data.profiles && (Array.isArray(data.profiles) ? data.profiles[0] : data.profiles)) || null;
      const merged = {
        id: data.id,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        created_at: data.created_at,
        author_id: data.author_id,
        author_avatar: data.author_avatar,
        read_time: data.read_time,
        category: data.category,
        author_profile: authorProfile
      };
      return merged;
    } catch (err) {
      // Bubble up for controller to handle fallback logic
      throw err;
    }
  }

  return { fetchPost };
})();

// ------ Renderer: مسؤول عن DOM (وأمن العرض) ------
const Renderer = (() => {
  // DOM refs cached once
  const refs = {
    titleEl: document.getElementById('post-title'),
    excerptEl: document.getElementById('post-excerpt'),
    timeEl: document.getElementById('post-time'),
    readtimeEl: document.getElementById('post-readtime'),
    authorNameEl: document.getElementById('post-author'),
    authorAvatarEl: document.getElementById('post-author-avatar'),
    contentEl: document.getElementById('post-content'),
    // postIdMeta: document.getElementById('post-id-meta'),
    categoryEl: document.getElementById('post-category'),
    loadingSkeleton: null, // reserved if you want to show/hide
  };

  function _sanitizedHtml(html) {
    const purifier = window.DOMPurify || null;
    if (purifier && html) {
      // Allow some tags for embed but keep safe
      return purifier.sanitize(html, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'] });
    }
    return null;
  }

  function renderMeta(post, authorProfile) {
    const desc = post.excerpt || (post.content ? post.content.replace(/(<([^>]+)>)/ig,"").slice(0,160) : '');
    const pageTitle = `${post.title} — مساحة`;
    document.title = pageTitle;
    document.getElementById('meta-description')?.setAttribute('content', desc);
    document.getElementById('og-title')?.setAttribute('content', post.title || pageTitle);
    document.getElementById('og-desc')?.setAttribute('content', desc);
    document.getElementById('og-image')?.setAttribute('content', authorProfile?.avatar_url || post.author_avatar || '');
    // structured data LD+JSON (optional)
    const ld = {
      "@context":"https://schema.org",
      "@type":"Article",
      "headline": post.title,
      "author": { "@type": "Person", "name": authorProfile?.full_name || 'محرر' },
      "datePublished": post.created_at
    };
    const ldEl = document.getElementById('ld-json');
    if (ldEl) ldEl.textContent = JSON.stringify(ld);
  }

  function renderPost(post) {
    if (!post) return;
    const profile = post.author_profile;

    if (refs.titleEl) refs.titleEl.textContent = post.title || 'عنوان';
    if (refs.excerptEl) refs.excerptEl.textContent = post.excerpt || '';
    if (refs.timeEl) {
      refs.timeEl.textContent = timeAgo(post.created_at);
      refs.timeEl.setAttribute('datetime', post.created_at || '');
    }
    if (refs.readtimeEl) refs.readtimeEl.textContent = `⏱ ${post.read_time || '5'} دقائق`;
    // if (refs.postIdMeta) refs.postIdMeta.textContent = post.id || '';
    if (refs.authorNameEl) refs.authorNameEl.textContent = profile?.full_name || (post.author_id || 'محرر') || 'محرر';
    if (refs.authorAvatarEl) {
      const src = profile?.avatar_url || post.author_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(profile?.id || post.author_id || 'author')}`;
      refs.authorAvatarEl.src = src;
    }
    if (refs.categoryEl) refs.categoryEl.textContent = post.category || 'عام';

    // content: sanitized HTML or fallback to textContent
    if (refs.contentEl) {
      if (post.content) {
        const safe = _sanitizedHtml(post.content);
        if (safe !== null) refs.contentEl.innerHTML = safe;
        else refs.contentEl.textContent = post.content;
      } else {
        refs.contentEl.textContent = post.excerpt || '';
      }
    }

    // update meta tags
    renderMeta(post, profile);

    // dispatch event so comments module can react
    document.dispatchEvent(new CustomEvent('post:loaded', { detail: { postId: post.id, author: profile } }));
  }

  function showNotFound() {
    if (refs.titleEl) refs.titleEl.textContent = 'المقال غير موجود';
    if (refs.contentEl) refs.contentEl.innerHTML = '<p class="text-gray-400">عذراً، لا يمكن العثور على المقال.</p>';
  }

  return { renderPost, showNotFound };
})();

// ------ Controller: Orchestrator مسؤول عن منطق العرض/الكاش/الفالباك ------
const Controller = (() => {
  async function init() {
    setSiteYear?.();
    const postId = getQueryParam('id');
    if (!postId) {
      Renderer.showNotFound?.();
      return;
    }
    await loadAndRender(postId);
    // listen to storage events to sync between tabs
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key === `${SESSION_PREFIX}${postId}`) {
        // re-render if updated in another tab
        const cached = CacheService.get(postId);
        if (cached && cached.post) Renderer.renderPost(cached.post);
      }
    });
  }

  async function loadAndRender(id) {
    // 1) try cache
    const cached = CacheService.get(id);
    if (cached && cached.post) {
      // show immediately
      Renderer.renderPost(cached.post);
      // if stale -> revalidate in background
      if (!CacheService.isFresh(cached)) {
        try {
          const fresh = await PostService.fetchPost(id);
          if (fresh) {
            // compare shallowly; if different update cache and UI
            if (JSON.stringify(fresh) !== JSON.stringify(cached.post)) {
              CacheService.set(id, fresh);
              Renderer.renderPost(fresh);
            } else {
              CacheService.set(id, fresh); // refresh timestamp
            }
          }
        } catch (e) {
          console.warn('Background revalidate failed', e);
        }
      }
      return;
    }

    // 2) no cache: fetch (blocking) and then cache+render
    try {
      const post = await PostService.fetchPost(id);
      if (!post) {
        Renderer.showNotFound();
        return;
      }
      CacheService.set(id, post);
      Renderer.renderPost(post);
    } catch (err) {
      console.error('Controller.loadAndRender error', err);
      if (cached && cached.post) {
        // if we had stale cached earlier, we already showed it; nothing more
        return;
      }
      Renderer.showNotFound();
    }
  }

  return { init, loadAndRender };
})();

// ----- بدء التنفيذ -----
document.addEventListener('DOMContentLoaded', () => {
  Controller.init();
});

