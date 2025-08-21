
import { supabase } from 'supabaseClient.js';

const postsContainer = document.getElementById('postsContainer');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const addPostBtn = document.getElementById('addPostBtn');

let allPosts = [];/* This will hold all posts fetched from the database */

async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('خطأ في جلب المقالات:', error);
    postsContainer.innerHTML = '<p class="text-red-400">فشل في تحميل التدوينات.</p>';
    return;
  }

  allPosts = data;
  renderPosts();
}


function renderPosts() {
  const query = searchInput.value.toLowerCase();
  const status = statusFilter.value;

  const filtered = allPosts.filter(post => {
    const matchTitle = post.title?.toLowerCase().includes(query);
    const matchStatus = status ? post.status === status : true;
    return matchTitle && matchStatus;
  });

  if (!filtered.length) {
    postsContainer.innerHTML = '<p class="text-gray-400 col-span-full">لا توجد تدوينات مطابقة.</p>';
    return;
  }
   postsContainer.innerHTML = filtered.map(post => `
    <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow hover:shadow-xl hover:border-indigo-500 transition group flex flex-col justify-between">
      <div>
        <h2 class="text-lg font-semibold group-hover:text-indigo-400 transition mb-2">${post.title}</h2>
        <p class="text-gray-400 text-sm line-clamp-3">${post.excerpt || post.content?.slice(0, 100)}...</p>
      </div>
      <div class="mt-4 flex justify-between items-center text-sm text-gray-500">
        <span class="text-xs px-2 py-1 rounded-full ${
          post.status === 'published' ? 'bg-green-700 text-green-200' : 'bg-yellow-700 text-yellow-200'
        }">${post.status === 'published' ? 'منشور' : 'مسودة'}</span>
        <div class="flex gap-2">
          <a href="edit-post.html?id=${post.id}" class="text-indigo-400 hover:underline">تعديل</a>
          <button onclick="deletePost('${post.id}')" class="text-red-500 hover:underline">حذف</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function deletePost(id) {
  const confirmDelete = confirm('هل أنت متأكد من حذف هذه التدوينة؟');
  if (!confirmDelete) return;

  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    alert('حدث خطأ أثناء الحذف');
    return;
  }

  allPosts = allPosts.filter(p => p.id !== id);
  renderPosts();
}

searchInput.addEventListener('input', renderPosts);
statusFilter.addEventListener('change', renderPosts);

// الانتقال إلى صفحة الإضافة
addPostBtn.addEventListener('click', () => {
  window.location.href = 'new-post.html';
});
fetchPosts();
