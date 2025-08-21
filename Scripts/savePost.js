tinymce.init({
  selector: '#post-content',
  plugins: [
    'anchor', 'autolink', 'charmap', 'codesample', 'emoticons',
    'link', 'lists', 'media', 'searchreplace', 'table',
    'visualblocks', 'wordcount', 'directionality', 'image'
  ],
  toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | ltr rtl | numlist bullist indent outdent | codesample | emoticons charmap | removeformat | wordcount',
  menubar: false,
  height: 500,
  branding: false,
  language: 'ar',
  directionality: 'rtl',
  skin: 'oxide-dark',
  content_css: 'dark',
  placeholder: 'ابدأ الكتابة هنا...',
  toolbar_sticky: true,
  autosave_ask_before_unload: true,
  images_upload_handler: handleImageUpload,
  setup: function(editor) {
    editor.on('change', function() {
      editor.save(); // Save content to textarea on change
    });
  }
});

import { supabase } from 'supabaseClient.js';
import {getAccessToken} from './auth-guard.js';
const SUPABASE_URL= "https://vbnnzmhopcjlkvtuubcj.supabase.co";



// / عناصر النموذج
const form = document.getElementById('postForm');
const publishBtn = document.getElementById('publishPostBtn');
const draftBtn = document.getElementById('saveDraftBtn');
const notification = (msg, ok = true) => showNotification(msg, ok);



// مساعدة لتنظيف المدخلات
function sanitizeInput(str) {
  return String(str || '').trim();
} 



// Image upload handler (placeholder implementation)
async function handleImageUpload(blobInfo, progress) {
  return new Promise((resolve, reject) => {
    // In a real implementation, you would upload to Supabase storage
    // For now, we'll convert to base64 for demo purposes
    const reader = new FileReader();
    reader.onload = function() {
      resolve(reader.result);
    };
    reader.onerror = function() {
      reject('Image upload failed');
    };
    reader.readAsDataURL(blobInfo.blob());
  });
}



// دالة عامة لإظهار إشعار
function showNotification(message, type = 'success') {
  const notify = document.createElement('div');
  notify.textContent = message;
  notify.className = `fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white z-50
    ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
  document.body.appendChild(notify);

  setTimeout(() => notify.remove(), 3000);
}

// دالة عامة لإغلاق الفورم
function closeForm() {
  const postEditorModal = document.getElementById('postEditorModal');
  if (postEditorModal) {
    // form.reset(); // يمسح الحقول
    postEditorModal.classList.add('hidden'); // يخفي الفورم (تأكد أن عندك CSS للـ hidden)
  }
}
// استدعاء Edge Function عامة (POST) مع توكن
async function callEdgeFunction(name, payload, method = 'POST') {
    const token = await getAccessToken();
    if (!token) throw new Error('غير مصادق — يرجى تسجيل الدخول.');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
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

  

// Save post function (reusable for both publish and draft)
async function savePost(e, isDraft = false) {
  e && e.preventDefault();

  // اجمع الحقول
  const postId = sanitizeInput(document.getElementById('post-id').value);
  const title = sanitizeInput(document.getElementById('post-title').value);
  const category = sanitizeInput(document.getElementById('post-category').value);
  const status = isDraft ? 'draft' : sanitizeInput(document.getElementById('post-status').value);
  const excerptField = document.getElementById('post-excerpt');
  let excerpt = sanitizeInput(excerptField.value);
  const content = tinymce.get('post-content').getContent();

  // تحقق سريع
  if (!title || title.length < 3) return notification('الرجاء إدخال عنوان صالح (3 أحرف على الأقل).', false);
  if (!content || content.length < 10) return notification('المحتوى قصير جدًا.', false);
  if (!excerpt) excerpt = generateExcerpt(content);

  // ضبط حالة الأزرار
  const origPublishHTML = publishBtn.innerHTML;
  const origDraftHTML = draftBtn.innerHTML;
  publishBtn.disabled = true;
  draftBtn.disabled = true;
  publishBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> جاري الحفظ...';
  draftBtn.innerHTML = 'جاري الحفظ...';

  try {
    // payload نجهزه (لا نرسل author_id من الواجهة — الخادم يفرضه)
    const payload = {
      title,
      content,
      excerpt,
      status,
      category
    };

    // إذا كان لدينا postId موجود: نطلب تحديثًا (اختياري — يتطلب وجود update-post function)
    if (postId) {
      // استدعاء update-post
      const body = { id: postId, ...payload };
      await callEdgeFunction('update-post', body, 'PATCH');
      notification('تم تحديث التدوينة بنجاح.');
    } else {
      // استدعاء create-post
      await callEdgeFunction('create-post', payload, 'POST');
      notification(isDraft ? 'تم حفظ المسودة بنجاح.' : 'تم نشر التدوينة بنجاح.');
      // إعادة تعيين الحقول
      form.reset();
      tinymce.get('post-content').setContent('');
    }
    closeForm();

    // Optionally: refresh list of posts in dashboard here
  } catch (err) {
    console.error('Save post error:', err);
    if (err.status === 401) notification('الجلسة انتهت — يرجى تسجيل الدخول مجددًا.', false);
    else if (err.status === 403) notification('لا تملك صلاحية القيام بهذه العملية.', false);
    else notification(err.message || 'حدث خطأ أثناء الحفظ.', false);
  } finally {
    publishBtn.disabled = false;
    draftBtn.disabled = false;
    publishBtn.innerHTML = origPublishHTML;
    draftBtn.innerHTML = origDraftHTML;
  }
}

// عند تحميل الصفحة
// event listeners
window.addEventListener('DOMContentLoaded', () => {

  form.addEventListener('submit', (e) => savePost(e, false));
  draftBtn.addEventListener('click', (e) => savePost(e, true));

  // auto-generate excerpt as user types (optional)
  // ensure tinymce is initialized
  const editor = tinymce.get('post-content');
  if (editor) {
    editor.on('keyup', () => {
      const excerptField = document.getElementById('post-excerpt');
      if (excerptField && !excerptField.value) {
        const content = editor.getContent();
        excerptField.value = generateExcerpt(content);
      }
    });
  }
});