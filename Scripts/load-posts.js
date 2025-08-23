import { supabase } from './supabaseClient.js';
import { openPostEditor } from '../BackEnd/Scripts/editor.js';


const postsContainer = document.getElementById('postsContainer');
const postsListContainer = document.getElementById('postsListContainer');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

searchInput.addEventListener('input', loadPosts);
statusFilter.addEventListener('change', loadPosts);

export async function loadPosts() {
  const status = statusFilter.value;
  const searchTerm = searchInput.value;
  
  let query = supabase.from('posts').select('*');
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (searchTerm) {
    query = query.ilike('title', `%${searchTerm}%`);
  }
  
  const { data: posts, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading posts:', error);
    return;
  }
  
  renderPosts(posts);
}

// Render posts in grid and list views
function renderPosts(posts) {
  // Clear current posts
  postsContainer.innerHTML = '';
  const postsListBody = document.getElementById('postsListBody');
  if (postsListBody) postsListBody.innerHTML = '';
  
  if (posts.length === 0) {
    postsContainer.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i data-lucide="file-question" class="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">لا توجد تدوينات</h3>
        <p class="text-gray-500 dark:text-gray-400 mt-1">جرب البحث بكلمات مختلفة أو إنشاء تدوينة جديدة</p>
      </div>
    `;
    return;
  }
  
  // Grid view
  posts.forEach(post => {
    const postCard = document.createElement('div');
    postCard.className = 'bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow';
    postCard.setAttribute('data-aos', 'fade-up');
    
    const statusBadge = post.status === 'published' 
      ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">منشور</span>'
      : '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">مسودة</span>';
    
    postCard.innerHTML = `
      <div class="relative p-4">
        <div class="absolute top-2 right-2">${statusBadge}</div>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">${post.title}</h3>
        <h4 class="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">${post.excerpt || 'لا يوجد وصف'}</h4>
        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(post.created_at)}</span>
          <div class="flex gap-1">
            <button class="edit-post p-1.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700" data-id="${post.id}">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button class="delete-post p-1.5 text-red-500 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700" data-id="${post.id}">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    
    postsContainer.appendChild(postCard);
  });
  
  // List view
  if (postsListBody) {
    posts.forEach(post => {
      const row = document.createElement('tr');
      row.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
      
      const statusBadge = post.status === 'published' 
        ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">منشور</span>'
        : '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">مسودة</span>';
      
      row.innerHTML = `
        <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">${post.title}</td>
        <td class="px-6 py-4">${post.category || 'غير مصنف'}</td>
        <td class="px-6 py-4">${statusBadge}</td>
        <td class="px-6 py-4">${formatDate(post.created_at)}</td>
        <td class="px-6 py-4">${post.views || 0}</td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-2">
            <button class="font-medium text-indigo-600 dark:text-indigo-500 hover:underline edit-post" data-id="${post.id}">تعديل</button>
            <button class="font-medium text-red-600 dark:text-red-500 hover:underline delete-post" data-id="${post.id}">حذف</button>
          </div>
        </td>
      `;
      
      postsListBody.appendChild(row);
    });
  }
  
  // Re-initialize icons for the new content
  lucide.createIcons();
  
  // Add event listeners to edit/delete buttons
  document.querySelectorAll('.edit-post').forEach(button => {
    button.addEventListener('click', () => editPost(button.dataset.id));
  });
  
  document.querySelectorAll('.delete-post').forEach(button => {
    button.addEventListener('click', () => deletePost(button.dataset.id));
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-EG', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}
// Edit post function
async function editPost(postId) {
  // Fetch post data
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();
  
  if (error) {
    console.error('Error fetching post:', error);
    return;
  }
  
  // Fill the form with post data
  document.getElementById('post-id').value = post.id;
  document.getElementById('post-title').value = post.title;
  document.getElementById('post-excerpt').value = post.excerpt || '';
  document.getElementById('post-status').value = post.status;
  if (post.category) {
    document.getElementById('post-category').value = post.category;
  }
  
  // Open the editor modal
  openPostEditor();
  
  // Set content in TinyMCE after it's initialized
  setTimeout(() => {
    tinymce.get('post-content').setContent(post.content || '');
  }, 100);
  
  // Update modal title
  document.getElementById('modalTitle').textContent = 'تعديل التدوينة';
}

// Delete post function
async function deletePost(postId) {
    if (!confirm('هل أنت متأكد أنك تريد حذف هذه التدوينة؟')) return;
    
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
    
    if (error) {
        console.error('Error deleting post:', error);
        return;
    }
    
    // Reload posts after deletion
    loadPosts();
    }


