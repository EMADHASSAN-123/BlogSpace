// save-post.js
import { getAccessToken } from './auth-guard.js';

// ضع رابط مشروع Supabase (أو نقطة النهاية العامة لوظائف Edge)
const SUPABASE_URL = 'hhttps://vbnnzmhopcjlkvtuubcj.supabase.co'; // استبدلها


// عناصر الـ DOM
const form = document.getElementById('postForm');
const publishBtn = document.getElementById('publishPostBtn');
const draftBtn = document.getElementById('saveDraftBtn');

// بسيطة لإظهار إشعار (يمكن استبدالها بصندوق خاص بك)
function showNotification(message, type = 'success') {
  const notify = document.createElement('div');
  notify.textContent = message;
  notify.className = `fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white z-50
    ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
  document.body.appendChild(notify);
  setTimeout(() => notify.remove(), 3000);
}

// تنظيف المدخلات
function sanitizeInput(str) {
  return String(str || '').trim();
}

// توليد مقتطف من المحتوى (حذف HTML ثم أخذ أول 150 حرف)
function generateExcerpt(html, max = 150) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const text = tmp.textContent || tmp.innerText || '';
  return text.trim().slice(0, max);
}

// دالة انتظار TinyMCE instance جاهز
function waitForEditor(id = 'post-content', timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = 50;
    let waited = 0;
    const timer = setInterval(() => {
      const ed = window.tinymce ? window.tinymce.get(id) : null;
      if (ed) {
        clearInterval(timer);
        resolve(ed);
      } else {
        waited += interval;
        if (waited >= timeout) {
          clearInterval(timer);
          reject(new Error('TinyMCE did not initialize in time'));
        }
      }
    }, interval);
  });
}

// نداء لواجهة Edge Function الموجودة عندك
async function callEdgeFunction(name, payload, method = 'POST') {
  const token = await getAccessToken();
  if (!token) throw new Error('غير مصادق — يرجى تسجيل الدخول.');

  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: method === 'GET' ? undefined : JSON.stringify(payload)
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errMsg = data?.error || (data?.message ? data.message : `خطأ من الخادم (${res.status})`);
    const err = new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    err.status = res.status;
    throw err;
  }
  return data;
}

// الدالة العامة للحفظ (نستعملها لنشر أو حفظ مسودة)
export async function savePost(e, isDraft = false) {
  if (e) e.preventDefault();

  // انتظر المحرر إن لم يكن جاهزاً
  let editor;
  try {
    editor = await waitForEditor('post-content', 5000);
  } catch (err) {
    console.error(err);
    showNotification('المحرر غير جاهز. حاول مرة أخرى.', 'error');
    return;
  }

  // اجمع الحقول
  const postIdEl = document.getElementById('post-id');
  const postId = postIdEl ? sanitizeInput(postIdEl.value) : '';
  const title = sanitizeInput(document.getElementById('post-title')?.value);
  const category = sanitizeInput(document.getElementById('post-category')?.value);
  const status = isDraft ? 'draft' : sanitizeInput(document.getElementById('post-status')?.value || 'published');
  const excerptField = document.getElementById('post-excerpt');
  let excerpt = excerptField ? sanitizeInput(excerptField.value) : '';
  const content = editor.getContent();

  // تحقق سريع
  if (!title || title.length < 3) {
    showNotification('الرجاء إدخال عنوان صالح (3 أحرف على الأقل).', 'error');
    return;
  }
  // نتحقق من النص الفعلي بعد إزالة الوسوم
  const tmp = document.createElement('div');
  tmp.innerHTML = content || '';
  const plainText = (tmp.textContent || tmp.innerText || '').trim();
  if (!plainText || plainText.length < 10) {
    showNotification('المحتوى قصير جداً.', 'error');
    return;
  }
  if (!excerpt) excerpt = generateExcerpt(content);

  // تعطيل الأزرار وإظهار حالة loading
  const origPublishHTML = publishBtn ? publishBtn.innerHTML : 'نشر';
  const origDraftHTML = draftBtn ? draftBtn.innerHTML : 'حفظ';
  if (publishBtn) { publishBtn.disabled = true; publishBtn.innerHTML = 'جاري الحفظ...'; }
  if (draftBtn) { draftBtn.disabled = true; draftBtn.innerHTML = 'جاري الحفظ...'; }

  try {
    const payload = { title, content, excerpt, status, category };

    if (postId) {
      // تحديث منشور
      const body = { id: postId, ...payload };
      await callEdgeFunction('update-post', body, 'PATCH');
      showNotification('تم تحديث التدوينة بنجاح.');
    } else {
      // إنشاء منشور جديد
      await callEdgeFunction('create-post', payload, 'POST');
      showNotification(isDraft ? 'تم حفظ المسودة بنجاح.' : 'تم نشر التدوينة بنجاح.');
      // إعادة تعيين الحقول
      if (form) form.reset();
      editor.setContent(''); // تفريغ المحرر
    }

    // إغلاق الفورم إن أردت
    const postEditorModal = document.getElementById('postEditorModal');
    if (postEditorModal) postEditorModal.classList.add('hidden');

    // هنا يمكنك إعادة تحميل قائمة المنشورات أو تحديث الواجهة محليًا
  } catch (err) {
    console.error('Save post error:', err);
    if (err.status === 401) showNotification('الجلسة انتهت — يرجى تسجيل الدخول مجددًا.', 'error');
    else if (err.status === 403) showNotification('لا تملك صلاحية القيام بهذه العملية.', 'error');
    else showNotification(err.message || 'حدث خطأ أثناء الحفظ.', 'error');
  } finally {
    if (publishBtn) { publishBtn.disabled = false; publishBtn.innerHTML = origPublishHTML; }
    if (draftBtn) { draftBtn.disabled = false; draftBtn.innerHTML = origDraftHTML; }
  }
}

// ربط الأحداث عند التحميل
window.addEventListener('DOMContentLoaded', () => {
  if (form) {
    form.addEventListener('submit', (e) => savePost(e, false));
  }
  if (draftBtn) {
    draftBtn.addEventListener('click', (e) => savePost(e, true));
  }
});
