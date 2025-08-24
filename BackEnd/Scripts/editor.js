const postEditorModal = document.getElementById('postEditorModal');

/* ---------- واجهات لفتح / غلق المودال ---------- */
export function openPostEditor() {
  postEditorModal.classList.remove('hidden');
  // انتظر إطار واحد لو لزم لتجنب مشاكل قياس عناصر مخفية (اختياري):
   requestAnimationFrame(() => {
    initTinyMCE();
  });
}

export function closePostEditor() {
  postEditorModal.classList.add('hidden');
  // نزيل المحرر عند الإغلاق لتحرير الموارد ومنع نسخ متعددة:
  const existing = window.tinymce ? window.tinymce.get('post-content') : null;
  if (existing) {
    existing.remove();
  }
}

export function initTinyMCE() {
   if (!window.tinymce) {
    console.error('tinymce is not loaded');
    return;
  }

  const existing = window.tinymce.get('post-content');
  if (existing) {
    existing.remove();
  }

window.tinymce.init({
    selector: '#post-content',
    license_key: 'gpl',
    plugins: [
      'anchor','autolink','charmap','codesample','emoticons',
      'link','lists','searchreplace','table',
      'visualblocks','wordcount','directionality','autoresize'
    ],
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline | link | align lineheight | ltr rtl | numlist bullist indent outdent | codesample | emoticons charmap | removeformat | wordcount',
    menubar: false,
    height: 420,
    branding: false,
    language: 'ar',
    directionality: 'rtl',
    skin: 'oxide-dark',
    // تأكد من أن المسار صحيح بالنسبة لملف Dashboard.html
    skin_url: './tinymce/skins/ui/oxide',
    content_css: './tinymce/skins/content/dark/content.min.css',
    placeholder: 'ابدأ الكتابة هنا...',
    toolbar_sticky: true,
    paste_data_images: false, // يمنع لصق الصور كمضمّن
    autosave_ask_before_unload: true,
    setup: function(editor) {
      editor.on('change', function() {
        editor.save(); // يكتب المحتوى إلى textarea
      });
      // لو تريد: معالجة إعادة القياس عند الظهور
      editor.on('init', function() {
        // إذا المحرر داخل مودال قد يحتاج إلى إعادة رسم:
        editor.execCommand('mceAutoResize');
      });
    }
  });
}