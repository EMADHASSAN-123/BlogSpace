const postEditorModal = document.getElementById('postEditorModal');

/* ---------- واجهات لفتح / غلق المودال ---------- */
export function openPostEditor() {
  postEditorModal.classList.remove('hidden');
  // انتظر إطار واحد لو لزم لتجنب مشاكل قياس عناصر مخفية (اختياري):
  requestAnimationFrame(() => initTinyMCE());
}

export function closePostEditor() {
  postEditorModal.classList.add('hidden');
  // نزيل المحرر عند الإغلاق لتحرير الموارد ومنع نسخ متعددة:
  const existing = tinymce.get('post-content');
  if (existing) {
    existing.remove();
  }
}

export function initTinyMCE() {
  const existing = tinymce.get('post-content');
  if (existing) existing.remove();

  tinymce.init({
    selector: '#post-content',
    license_key: 'gpl',
    plugins: [
      'anchor','autolink','charmap','codesample','emoticons',
      'link','lists','searchreplace','table',
      'visualblocks','wordcount','directionality'
      // لاحظ: لم ندرج 'image' أو 'media' إن أردنا منع أيقونة الإدراج — لكن إن أردت زر إدراج الصورة بالرابط ضع 'image' هنا
    ],
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline | link | align lineheight | ltr rtl | numlist bullist indent outdent | codesample | emoticons charmap | removeformat | wordcount',
    menubar: false,
    height: 500,
    branding: false,
    language: 'ar',
    directionality: 'rtl',
    skin: 'oxide-dark',
    skin_url: './tinymce/skins/ui/oxide',
    content_css: '.tinymce/skins/content/dark/content.min.css',
    placeholder: 'ابدأ الكتابة هنا...',
    toolbar_sticky: true,
    paste_data_images: false, // يمنع لصق الصور كـ base64
    autosave_ask_before_unload: true,
    setup: function(editor) {
      editor.on('change', function() { editor.save(); });
    }
  });
}