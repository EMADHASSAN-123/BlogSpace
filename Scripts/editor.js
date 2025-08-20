
const postEditorModal = document.getElementById('postEditorModal');

export function openPostEditor() {
  postEditorModal.classList.remove('hidden');
  initTinyMCE();
}

export function closePostEditor() {
  postEditorModal.classList.add('hidden');
}

// Initialize TinyMCE editor
export function initTinyMCE() {
  tinymce.remove('#post-content'); // Remove any existing instances
   
  tinymce.init({
    selector: '#post-content',
    plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
    tinycomments_mode: 'embedded',
    tinycomments_author: 'Author name',
    mergetags_list: [
      { value: 'First.Name', title: 'First Name' },
      { value: 'Email', title: 'Email' },
    ],
    directionality: 'rtl',
    language: 'ar',
    height: 400
  });
}
