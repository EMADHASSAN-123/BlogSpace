import { supabase } from '../supabaseClient.js';

export function initPostManager() {
  const newPostBtn = document.getElementById('newPostBtn');
  const postForm = document.getElementById('postForm');
  const postEditorModal = document.getElementById('postEditorModal');
  const closeEditorModal = document.getElementById('closeEditorModal');

  // Handle new post button
  newPostBtn.addEventListener('click', () => {
    openPostEditor();
  });

  // Handle modal close
  closeEditorModal.addEventListener('click', () => {
    postEditorModal.classList.add('hidden');
  });

  // Handle form submission
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(postForm);
    const postData = Object.fromEntries(formData);
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select();
      
      if (error) throw error;
      postEditorModal.classList.add('hidden');
      loadPosts();
    } catch (error) {
      console.error('Error saving post:', error);
    }
  });

  // Load initial posts
  loadPosts();
}

async function loadPosts() {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    renderPosts(posts);
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function renderPosts(posts) {
  const postsContainer = document.getElementById('postsContainer');
  postsContainer.innerHTML = posts.map(post => `
    <div class="bg-gray-700 rounded-lg p-4">
      <h3 class="text-white font-bold">${post.title}</h3>
      <p class="text-gray-400 text-sm mt-2">${post.excerpt}</p>
      <div class="mt-4 flex justify-between items-center">
        <span class="text-xs text-gray-500">${new Date(post.created_at).toLocaleDateString()}</span>
        <div class="flex gap-2">
          <button class="text-indigo-400 hover:text-indigo-300">تعديل</button>
          <button class="text-red-500 hover:text-red-400">حذف</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openPostEditor(post = null) {
  const postEditorModal = document.getElementById('postEditorModal');
  const postForm = document.getElementById('postForm');
  
  if (post) {
    // Populate form with existing post data
    document.getElementById('post-id').value = post.id;
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-category').value = post.category;
    document.getElementById('post-status').value = post.status;
    document.getElementById('post-excerpt').value = post.excerpt;
    document.getElementById('post-content').value = post.content;
    document.getElementById('modalTitle').textContent = 'تعديل تدوينة';
  } else {
    // Reset form for new post
    postForm.reset();
    document.getElementById('modalTitle').textContent = 'إضافة تدوينة جديدة';
  }
  
  postEditorModal.classList.remove('hidden');
}