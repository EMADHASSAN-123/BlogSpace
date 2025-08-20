// /Scripts/post-page.js
import { getQueryParam, timeAgo, setSiteYear } from './utils.js';
import { supabase } from '../supabaseClient.js'; // كما لديك

// Wait for DOMPurify to be available
function domPurify() {
  return window.DOMPurify || null;
}
 
async function loadPost() {
   const postId = getQueryParam('id');
  if (!postId) {
    showNotFound();
    return;
  }


  const cacheKey = `post_cache:${postId}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      renderPost(JSON.parse(cached));
    } catch (e) {
      sessionStorage.removeItem(cacheKey);
    }
  }

  try {
    // 1) جلب post نفسه (محتوى وحقل author_id وليس author)
    const { data: post, error } = await supabase
      .from('posts')
  .select(`
    id,
    title,
    content,
    created_at,
    author_id,
    profiles ( full_name, avatar_url )
  `)
  .eq('id', postId)
  .single()
  .maybeSingle(); // maybeSingle => null إذا لم يكن موجوداً

    if (error) {
      console.error('Error fetching post:', error);
      if (!cached) showNotFound();
      return;
    }
    if (!post) {
      if (!cached) showNotFound();
      return;
    }

    // 2) إذا وجد author_id فاجلب ملف البروفايل للحصول على الاسم/الأفاتار
    let authorProfile = null;
    if (post.author_id) {
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', post.author_id)
        .limit(1)
        .maybeSingle();
      if (profErr) console.warn('profile fetch error', profErr);
      authorProfile = profile ?? null;
    }

    // ضم المعلومات معاً وتخزينها في الكاش
    const merged = { ...post, author_profile: authorProfile || null };
    sessionStorage.setItem(cacheKey, JSON.stringify(merged));
    renderPost(merged);
  } catch (err) {
    console.error('unexpected loadPost error', err);
    if (!cached) showNotFound();
  }
}

function showNotFound() {
  const titleEl = document.getElementById('post-title');
  const contentEl = document.getElementById('post-content');
  if (titleEl) titleEl.textContent = 'المقال غير موجود';
  if (contentEl) contentEl.innerHTML = '<p class="text-gray-400">عذراً، لا يمكن العثور على المقال.</p>';
}





function renderPost(post) {
  // عناصر DOM
  const titleEl = document.getElementById('post-title');
  const excerptEl = document.getElementById('post-excerpt');
  const timeEl = document.getElementById('post-time');
  const readtimeEl = document.getElementById('post-readtime');
  const authorNameEl = document.getElementById('post-author');
  const authorAvatarEl = document.getElementById('post-author-avatar');
  const contentEl = document.getElementById('post-content');
  const postIdMeta = document.getElementById('post-id-meta');
  const categoryEl = document.getElementById('post-category');

  if (titleEl) titleEl.textContent = post.title || 'عنوان';
  if (excerptEl) excerptEl.textContent = post.excerpt || '';
  if (timeEl) {
    timeEl.textContent = timeAgo(post.created_at);
    timeEl.setAttribute('datetime', post.created_at || '');
  }
  if (readtimeEl) readtimeEl.textContent = `⏱ ${post.read_time || '5'} دقائق`;
  if (postIdMeta) postIdMeta.textContent = post.id || '';

  // مؤلف
  const profile = post.author_profile;
  if (authorNameEl) {
    authorNameEl.textContent = profile?.full_name || (post.author_id || 'محرر') || 'محرر';
  }
  if (authorAvatarEl) {
    const src = profile?.avatar_url || post.author_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(profile?.id || post.author_id || 'author')}`;
    authorAvatarEl.src = src;
  }

  if (categoryEl) categoryEl.textContent = post.category || 'عام';

  // sanitize content using DOMPurify if موجودة
  const purifier = domPurify();
  if (purifier && post.content) {
    const clean = purifier.sanitize(post.content, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'] });
    contentEl.innerHTML = clean;
  } else {
    // fallback آمن: escape text
    contentEl.textContent = post.content || '';
  }

  // تحديث meta tags (SEO)
  const desc = post.excerpt || (post.content ? post.content.replace(/(<([^>]+)>)/ig,"").slice(0,160) : '');
  const pageTitle = `${post.title} — مساحة`;
  document.title = pageTitle;
  document.getElementById('meta-description')?.setAttribute('content', desc);
  document.getElementById('og-title')?.setAttribute('content', post.title || pageTitle);
  document.getElementById('og-desc')?.setAttribute('content', desc);
  document.getElementById('og-image')?.setAttribute('content', profile?.avatar_url || post.author_avatar || '');

  // أخبر ملفات التعليقات أن البوست محمّل
  document.dispatchEvent(new CustomEvent('post:loaded', { detail: { postId: post.id, author: profile } }));
}

// init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setSiteYear, 10);
  loadPost();
});
