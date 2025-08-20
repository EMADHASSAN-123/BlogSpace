// get-posts.js
// نسخة محسّنة لاستدعاء Edge Function get-public-posts وعرض المنشورات بأداء وأمان جيدين.

// ----- إعدادات -----
const FUNCTIONS_BASE = 'https://vbnnzmhopcjlkvtuubcj.supabase.co/functions/v1'; // غيّر إن لزم
const FUNCTION_NAME = 'get-public-posts';
const PER_PAGE = 6;                    // عدد المنشورات لكل صفحة
const CACHE_KEY = 'public_posts_cache_v1'; // مفتاح الكاش في sessionStorage

// ----- مراجع عناصر DOM (تأكد أنها موجودة في الصفحة) -----
const postsGrid = document.getElementById('posts-grid');
const featuredTitle = document.getElementById('featured-title');
const featuredExcerpt = document.getElementById('featured-excerpt');
const featuredDate = document.getElementById('featured-date');
const featuredCategory = document.getElementById('featured-category');
const featuredReadTime = document.getElementById('featured-read-time');
const featuredReadMore = document.getElementById('featured-read-more');
const loadMoreButton = document.getElementById('load-more');

// ----- حالة داخلية -----
// مستخدم للـ pagination
let currentPage = 1;

let isLoading = false; //حماية لمنع طلبات متزامنة متكررة
let reachedEnd = false;//يحدد إن لم يعد هناك المزيد من المنشورات في السيرفر
let allPostsCache = [];//مصفوفة المنشورات المخزنة محليًا (قد تمثل صفحة/صفحات مُحمّلة)
let activeCategory = 'all';
let abortController = null;
 
// جديد: كاش لكل تصنيف (object mapping)
const cacheByCategory = {
  all: []  
  // سنملأها عند loadInitialPosts
};
// ----- أمان: هروب نصّي بسيط لمنع XSS -----
function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----- أداة زمنية مساعدة -----
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

// ----- إنشاء بطاقة منشور بأداء جيد -----
function createPostCard(post) {
  const wrapper = document.createElement('div');
  wrapper.className = "bg-gray-900/70 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30 hover:shadow-[0_0_15px_rgba(138,43,226,0.3)] transition-all duration-300";
  wrapper.dataset.postId = post.id || '';

  const title = escapeHTML(post.title || '');
  const excerpt = escapeHTML(post.excerpt || '');
  const category = escapeHTML(post.category || 'عام');
  const created = post.created_at ? new Date(post.created_at).toISOString() : '';

  const catSpan = `<span class="bg-indigo-900/50 px-2 py-1 rounded-full">${category}</span>`;

  wrapper.innerHTML = `
    <div class="relative" data-id="${escapeHTML(post.id || '')}">
      <h3 class="text-lg font-bold text-white mb-2 line-clamp-2">${title}</h3>
      <p class="text-gray-300 mb-3 text-sm line-clamp-3">${excerpt}</p>
      <div class="flex justify-between items-center text-xs">
        <span class="text-purple-300">${timeAgo(created)}</span>
        ${catSpan}
      </div>
      <button class="read-more-btn mt-3 w-full px-3 py-1.5 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white text-sm rounded-full hover:from-purple-700 hover:to-indigo-700 transition-colors">
        قراءة المزيد
      </button>
    </div>
  `;

  // ربط حدث الانتقال لصفحة المنشور
  const btn = wrapper.querySelector('.read-more-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (post.id) window.location.href = `post.html?id=${encodeURIComponent(post.id)}`;
    });
  }
  return wrapper;
}

// ----- تعامل مع الحالات الفارغة/الأخطاء -----
function renderEmptyState() {
  if (!postsGrid) return;
  postsGrid.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'col-span-full text-center text-gray-400 py-8';
  el.textContent = 'لا توجد منشورات حالياً.';
  postsGrid.appendChild(el);
}

function renderErrorState() {
  if (!postsGrid) return;
  postsGrid.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'col-span-full text-center text-red-300 py-8';
  el.textContent = 'عذراً، حدث خطأ أثناء تحميل المقالات. يرجى المحاولة لاحقاً.';
  postsGrid.appendChild(el);
}

// ----- skeleton أثناء التحميل -----
function showLoadingSkeleton(count = 6) {
  if (!postsGrid) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = "bg-gray-800/30 rounded-lg p-4 animate-pulse h-40";
    frag.appendChild(sk);
  }
  postsGrid.appendChild(frag);
}

function removeLoadingSkeleton() {
  if (!postsGrid) return;
  postsGrid.querySelectorAll('.animate-pulse').forEach(el => el.remove());
}

// ----- تحديث المنشور المميز -----
function updateFeaturedPost(post) {
  if (!post) return;
  if (featuredTitle) featuredTitle.textContent = post.title || 'عنوان';
  if (featuredExcerpt) featuredExcerpt.textContent = post.excerpt || '';
  if (featuredDate) featuredDate.textContent = timeAgo(post.created_at);
  if (featuredCategory) featuredCategory.textContent = post.category || 'عام';
  if (featuredReadMore) featuredReadMore.onclick = () => {
    if (post.id) window.location.href = `post.html?id=${encodeURIComponent(post.id)}`;
  };
}
// استخدام DocumentFragment يقلّل إعادة الرسم (reflow
// ----- رندر مجموعة منشورات (append) -----
function renderPostsAppend(posts) {
  if (!postsGrid) return;
  const frag = document.createDocumentFragment();
  posts.forEach(p =>
     frag.appendChild(
      createPostCard(p)
    ));
  postsGrid.appendChild(frag);
}

// ----- إلغاء الطلب السابق وإنشاء جديد -----
async function fetchPostsPage(page = 1, per = PER_PAGE,category = null, retry = 1) {
  if (abortController) abortController.abort();
  abortController = new AbortController();
  const signal = abortController.signal;
   // URL مع تمرير category إن وُجد

  const qs = new URLSearchParams({
    page: String(page),
    per: String(per),
  });

    if (category && category !== 'all') qs.set('category', category);

  // const url = `${FUNCTIONS_BASE}/${FUNCTION_NAME}?page=${encodeURIComponent(page)}&per=${encodeURIComponent(per)}${activeCategory && activeCategory !== 'all' ? `&category=${encodeURIComponent(activeCategory)}` : ''}`;
    const url = `${FUNCTIONS_BASE}/${FUNCTION_NAME}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
       method: 'GET',
        headers: { 'Accept': 'application/json' },
         signal,
          cache: 'no-store' 
        }); 
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`خطأ من الخادم ${res.status}: ${txt}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : (data.posts || []);
  } catch (err) {
    if (retry > 0 && err.name !== 'AbortError') {
      await new Promise(r => setTimeout(r, 500));
      return fetchPostsPage(page, per, category, retry - 1);
    }
    throw err;
  }
}
// ----- تحميل الصفحة الأولى (محليًا من الكاش أولًا ثم شبكياً) -----
// ظهر للمستخدم شيئًا بسرعة (من الكاش إن وُجد)
//  ثم نُحمّل البيانات الحقيقية من الخادم تدريجياً
async function loadInitialPosts() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      cacheByCategory.all = JSON.parse(cached);
      // allPostsCache = JSON.parse(cached);
      if (cacheByCategory.all.length) {
        updateFeaturedPost(cacheByCategory.all[0]);
        renderPostsAppend(cacheByCategory.all.slice(0, PER_PAGE));
      }
    } catch (e) {
      console.warn('الكاش تالف، سيتم تجاهله', e);
      sessionStorage.removeItem(CACHE_KEY);
      cacheByCategory.all = [];
    }
  }

  if (cacheByCategory.all.length === 0) showLoadingSkeleton(PER_PAGE);

  try {
    isLoading = true;
    const posts = await fetchPostsPage(1, PER_PAGE);
    cacheByCategory.all = posts.slice();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheByCategory.all));
    postsGrid.innerHTML = '';
    if (cacheByCategory.all.length) {
      updateFeaturedPost(cacheByCategory.all[0]);
      renderPostsAppend(cacheByCategory.all.slice(0, PER_PAGE));
      currentPage = 1;
      // **تصحيح**: إذا جاءت نتائج أقل من per فهذا يعني النهاية؛ إذا جاءت مساوية لـ per فنفترض قد تكون هناك صفحة لاحقة.
      reachedEnd = cacheByCategory.all.length < PER_PAGE;
      toggleLoadMoreUI();
    } else {
      renderEmptyState();
      reachedEnd = true;
      toggleLoadMoreUI();
    }
  } catch (err) {
    console.error('خطأ أثناء تحميل المنشورات:', err);
    renderErrorState();
  } finally {
    isLoading = false;
    removeLoadingSkeleton();
  }
}
// ----- تحميل المزيد (server-side pagination) -----
async function loadMorePosts() {
  if (isLoading || reachedEnd) return;
  isLoading = true;
  const nextPage = currentPage + 1;
  showLoadingSkeleton(3);

  try {
    const posts = await fetchPostsPage(nextPage, PER_PAGE, activeCategory);
    if (!posts || posts.length === 0) {
      reachedEnd = true;
      toggleLoadMoreUI();
      return;
    }
    
    // append to DOM
    renderPostsAppend(posts);

    // تحديث cacheByCategory
    if (!cacheByCategory[activeCategory]) cacheByCategory[activeCategory] = [];
    cacheByCategory[activeCategory] = cacheByCategory[activeCategory].concat(posts);

    // إذا كنا في 'all' نحدث الكاش العام في sessionStorage
    if (activeCategory === 'all') {
      cacheByCategory.all = cacheByCategory.all.concat(posts);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheByCategory.all));
    }

    currentPage = nextPage;
    if (posts.length < PER_PAGE) {
      reachedEnd = true;
      toggleLoadMoreUI();
    }
  } catch (err) {
    console.error('خطأ أثناء تحميل صفحة إضافية:', err);
    renderErrorState();
  } finally {
    isLoading = false;
    removeLoadingSkeleton();
  }
}

// ----- واجهة التحكم بزر "تحميل المزيد" -----
function toggleLoadMoreUI() {
  if (!loadMoreButton) return;
  if (reachedEnd) loadMoreButton.classList.add('hidden');
  else loadMoreButton.classList.remove('hidden');
}

// ----- فلترة محلية حسب التصنيف (تصفية من الكاش) -----
function filterPostsByCategoryLocal(category) {
  activeCategory = category;
  const tabs = document.querySelectorAll('[data-category]');
  tabs.forEach(t => {
    if (t.dataset.category === category) t.classList.add('active-tab');
    else t.classList.remove('active-tab');
  });

  const filtered = category === 'all' ? cacheByCategory.all : cacheByCategory.all.filter(p => p.category === category);
  postsGrid.innerHTML = '';
  if (!filtered.length) {
    renderEmptyState();
    toggleLoadMoreUI();
    return;
  }
  updateFeaturedPost(filtered[0]);
  renderPostsAppend(filtered.slice(0, currentPage * PER_PAGE));
  if (filtered.length <= currentPage * PER_PAGE) loadMoreButton.classList.add('hidden');
  else loadMoreButton.classList.remove('hidden');
}


// filterPostsByCategory: يجرّب الكاش لكل تصنيف أولًا
async function filterPostsByCategory(category) {
  activeCategory = category;
  currentPage = 1;
  reachedEnd = false;

  // update tabs UI (use your existing function or similar)
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

  // Normalize helper: اجعل المقارنة case-insensitive
  const norm = s => String(s || '').trim().toLowerCase();

  const localCache = cacheByCategory[category] || [];
  // إذا لم يكن لدينا cacheByCategory[category] فحاول فلترة من cacheByCategory.all
  let filteredLocal = (localCache.length ? localCache : cacheByCategory.all.filter(p => norm(p.category) === norm(category)));

  if (filteredLocal.length > 0) {
    postsGrid.innerHTML = '';
    updateFeaturedPost(filteredLocal[0]);
    renderPostsAppend(filteredLocal.slice(0, PER_PAGE));
    currentPage = 1;
    reachedEnd = filteredLocal.length < PER_PAGE;
    toggleLoadMoreUI();
    return;
  }
  
  // إن لم توجد نتائج محلية — جلب من الخادم (server-side filtering)
  try {
    postsGrid.innerHTML = '';
    showLoadingSkeleton(PER_PAGE);

    const posts = await fetchPostsPage(1, PER_PAGE, category);
    if (!posts || posts.length === 0) {
      cacheByCategory[category] = [];
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheByCategory.all));
      renderEmptyState();
      reachedEnd = true;
      toggleLoadMoreUI();
      return;
    }

    // عرض وتخزين الكاش الخاص بالتصنيف
    postsGrid.innerHTML = '';
    updateFeaturedPost(posts[0]);
    renderPostsAppend(posts);
    cacheByCategory[category] = posts.slice();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheByCategory.all));
    currentPage = 1;
    reachedEnd = posts.length < PER_PAGE;
    toggleLoadMoreUI();
  } catch (err) {
    console.error('filterPostsByCategory error:', err);
    renderErrorState();
  } finally {
    removeLoadingSkeleton();
  }
}

// ----- إعداد فلترة التبويبات -----
// ربط مستمعين التبويبات: يستدعي filterPostsByCategory بدلاً من الفلترة المحلية
function setupCategoryFilters() {
  // جلب التبويبات
  const tabs = Array.from(document.querySelectorAll('[data-category]'));

  // إزالة أي مستمعين سابقين عن طريق استبدال كل زر بنسخة cloneNode
  tabs.forEach(tab => tab.replaceWith(tab.cloneNode(true)));

  // إعادة الحصول على التبويبات الطازجة
  const freshTabs = Array.from(document.querySelectorAll('[data-category]'));

  // وظيفة المعالجة (debounced) — تستدعي فلترة الخادم/الكاش
  const handleClick = debounce(async (tab) => {
    const cat = tab.dataset.category;
    // اجعل التبويب فعّال بصريًا فورًا
    setupActiveTabStyles(tab);
    // استدعاء دالة الفلترة الذكية (ستحاول الكاش ثم السيرفر)
    try {
      await filterPostsByCategory(cat);
    } catch (err) {
      console.error('filterPostsByCategory failed:', err);
    }
  }, 120); // تأخير صغير مناسب للمستخدم

  // أضف مستمعي النقر ولوحة المفاتيح
  freshTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      // نمنع الاستدعاء إذا هناك تحميل جار (يمكن تعديل حسب رغبتك)
      if (isLoading) return;
      handleClick(tab);
    });

    // دعم الوصول: Enter أو Space تعمل مثل النقر
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isLoading) return;
        handleClick(tab);
      }
    });

    // تحسين الوصول: اجعل العناصر قابلة للتركيز إن لم تكن أزراراً فعلية
    if (!tab.hasAttribute('tabindex')) tab.setAttribute('tabindex', '0');
    // aria role (إن لم تكن موجودة)
    if (!tab.hasAttribute('role')) tab.setAttribute('role', 'button');
  });
}


// تحديث الستايل للتبويب النشط - تقبل إما عنصر أو نص التصنيف
function setupActiveTabStyles(activeTabOrCategory) {
  const tabs = document.querySelectorAll('[data-category]');
  // إذا أعطينا عنصر DOM فاستخدمه، وإلا ابحث عن العنصر المطابق حسب القيمة
  let activeEl = null;
  if (typeof activeTabOrCategory === 'string') {
    activeEl = Array.from(tabs).find(t => t.dataset.category === activeTabOrCategory);
  } else {
    activeEl = activeTabOrCategory;
  }

  tabs.forEach(t => {
    t.classList.remove('active-tab', 'from-purple-600', 'to-indigo-600', 'text-white');
    t.classList.add('text-purple-300');
    // تنظيف aria
    t.setAttribute('aria-pressed', 'false');
  });

  if (activeEl) {
    activeEl.classList.remove('text-purple-300');
    activeEl.classList.add('active-tab', 'from-purple-600', 'to-indigo-600', 'text-white');
    activeEl.setAttribute('aria-pressed', 'true');
  }
}

// debounce بسيط لمنع طلبات متكررة عند النقر السريع
function debounce(fn, wait = 250) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}


// ----- إعداد الأحداث العامة ----- 
function setupEventListeners() {
  if (loadMoreButton) loadMoreButton.addEventListener('click', loadMorePosts);
  setupCategoryFilters();

  // إذا كان لديك supabase client على window وتريد التحديث في الوقت الحقيقي
  if (window.supabase && typeof window.supabase.channel === 'function') {
    try {
      window.supabase
        .channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          // تجديد الصفحة الأولى تلقائياً عند تغيرات DB
          loadInitialPosts();
        })
        .subscribe();
    } catch (e) {
      console.warn('لم يتم تفعيل ريال تايم أو حدث خطأ:', e);
    }
  }
}



// ----- بدء التنفيذ عند جاهزية DOM -----
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadInitialPosts();
});
