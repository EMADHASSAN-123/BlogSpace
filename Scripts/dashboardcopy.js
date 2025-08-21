// Import necessary modules
import { supabase } from 'supabaseClient.js';
import { protectPage } from 'auth-guard.js';

// Check if user is authenticated, redirect to login if not
protectPage();

// DOM Elements

const body = document.getElementById('body');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const toggleThemeBtn = document.getElementById('toggleTheme');
const themeIcon = document.getElementById('themeIcon');
const sectionButtons = document.querySelectorAll('.show-section');
const sections = document.querySelectorAll('[id^="section-"]');
const logoutButton = document.getElementById('logoutButton');
const loadingOverlay = document.getElementById('loadingOverlay');
const quickActionsButton = document.getElementById('quickActionsButton');
const quickActionsMenu = document.getElementById('quickActionsMenu');
const newPostBtn = document.getElementById('newPostBtn');
const newPostAction = document.getElementById('newPostAction');
const postEditorModal = document.getElementById('postEditorModal');
const closeEditorModal = document.getElementById('closeEditorModal');
const postForm = document.getElementById('postForm');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const publishPostBtn = document.getElementById('publishPostBtn');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const postsContainer = document.getElementById('postsContainer');
const postsListContainer = document.getElementById('postsListContainer');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const usersListBody = document.getElementById('usersListBody');


// Initialize Lucide Icons
lucide.createIcons();

// Initialize AOS (Animate On Scroll)
AOS.init({
  duration: 800,
  easing: 'ease-in-out',
  once: true
});

function createChart(canvasId, type, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type,
        data,
        options
    });
}

// إعدادات ألوان الوضع الفاتح والداكن
const isDark = document.documentElement.classList.contains('dark');
const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
const textColor = isDark ? 'white' : 'black';

// إعدادات عامة للمخططات الكبيرة
const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: textColor }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: gridColor }
        },
        x: {
            grid: { color: gridColor }
        }
    }
};

// إعدادات المخططات الصغيرة
const smallChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
    },
    scales: {
        x: { display: false },
        y: { display: false }
    },
    elements: {
        line: { borderWidth: 2, tension: 0.4 },
        point: { radius: 0 }
    }
};


// تعريف كل المخططات في مصفوفة
const chartsConfig = [
    {
        id: 'visitsChart',
        type: 'line',
        data: {
            labels: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
            datasets: [
                {
                    label: 'الزيارات',
                    data: [350, 420, 380, 450, 580, 620, 510],
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'المشاهدات',
                    data: [480, 520, 470, 560, 670, 780, 690],
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: baseOptions
    },
    {
        id: 'trafficSourcesChart',
        type: 'doughnut',
        data: {
            labels: ['محركات البحث', 'وسائل التواصل', 'روابط مباشرة', 'أخرى'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(249, 115, 22, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: { ...baseOptions, plugins: { legend: { position: 'right', labels: { color: textColor } } } }
    },
    {
        id: 'browsersChart',
        type: 'bar',
        data: {
            labels: ['كروم', 'فايرفوكس', 'سفاري', 'إيدج', 'أخرى'],
            datasets: [{
                label: 'المتصفحات',
                data: [65, 15, 12, 7, 1],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(156, 163, 175, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            ...baseOptions,
            scales: { y: { beginAtZero: true, grid: { color: gridColor } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    },
    // مخططات صغيرة
    {
        id: 'visitorsChart',
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => i + 1),
            datasets: [{ data: [12, 19, 15, 20, 25, 23, 27, 30, 35, 40], borderColor: 'rgba(99, 102, 241, 1)', backgroundColor: 'rgba(99, 102, 241, 0.2)', fill: true }]
        },
        options: smallChartOptions
    },
    {
        id: 'pageViewsChart',
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => i + 1),
            datasets: [{ data: [32, 40, 37, 45, 52, 48, 57, 65, 70, 80], borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true }]
        },
        options: smallChartOptions
    },
    {
        id: 'bounceRateChart',
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => i + 1),
            datasets: [{ data: [45, 43, 40, 38, 35, 36, 34, 32, 33, 35], borderColor: 'rgba(245, 158, 11, 1)', backgroundColor: 'rgba(245, 158, 11, 0.2)', fill: true }]
        },
        options: smallChartOptions
    },
    {
        id: 'sessionDurationChart',
        type: 'line',
        data: {
            labels: Array.from({ length: 10 }, (_, i) => i + 1),
            datasets: [{ data: [1.5, 1.7, 1.8, 2.1, 2.3, 2.5, 2.4, 2.7, 2.6, 2.9], borderColor: 'rgba(16, 185, 129, 1)', backgroundColor: 'rgba(16, 185, 129, 0.2)', fill: true }]
        },
        options: smallChartOptions
    }
];
// cfg = charts graph configuration object
// تشغيل جميع المخططات
function initializeCharts() {
    chartsConfig.forEach(cfg => createChart(cfg.id, cfg.type, cfg.data, cfg.options));
}


// Check for dark mode preference
function initTheme() {
  if (localStorage.getItem('color-theme') === 'dark' || 
    (!localStorage.getItem('color-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    themeIcon.setAttribute('name', 'moon');
  } else {
    document.documentElement.classList.remove('dark');
    themeIcon.setAttribute('name', 'sun');
  }
}

// Toggle dark/light theme
function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('color-theme', 'light');
    themeIcon.setAttribute('name', 'sun');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('color-theme', 'dark');
    themeIcon.setAttribute('name', 'moon');
  }
  
  // Reinitialize charts with new theme colors
  initializeCharts();
}

// Mobile sidebar toggle
function toggleSidebar() {
  if (sidebar.classList.contains('translate-x-0')) {
    sidebar.classList.replace('translate-x-0', 'translate-x-full');
  } else {
    sidebar.classList.replace('translate-x-full', 'translate-x-0');
  }
}

// Show different sections based on navigation
function showSection(sectionId) {
  sections.forEach(section => {
    section.classList.add('hidden');
  });
  
  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
  
  // On mobile, close sidebar after section selection
  if (window.innerWidth < 1024) {
    sidebar.classList.replace('translate-x-0', 'translate-x-full');
  }
  
  // Initialize charts if showing dashboard or stats sections
  if (sectionId === 'dashboard' || sectionId === 'stats') {
    initializeCharts();
  }
}

// Toggle quick actions menu
function toggleQuickActions() {
  quickActionsMenu.classList.toggle('hidden');
}

// Handle post editor modal
function openPostEditor() {
  postEditorModal.classList.remove('hidden');
  initTinyMCE();
}

function closePostEditor() {
  postEditorModal.classList.add('hidden');
}

// Initialize TinyMCE editor
function initTinyMCE() {
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

// Toggle between grid and list view
function setGridView() {
  postsContainer.classList.remove('hidden');
  postsListContainer.classList.add('hidden');
  gridViewBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
  gridViewBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  listViewBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  listViewBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
}

function setListView() {
  postsContainer.classList.add('hidden');
  postsListContainer.classList.remove('hidden');
  gridViewBtn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
  gridViewBtn.classList.add('text-gray-500', 'dark:text-gray-400');
  listViewBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  listViewBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
}

// Handle logout
async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error during logout:', error);
  } else {
    window.location.href = "../assets/login.html";
  }
}

// Load user information
async function loadUserInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Update avatar if available
    if (user.user_metadata && user.user_metadata.avatar_url) {
      userAvatar.src = user.user_metadata.avatar_url;
      console.log(userAvatar.src);
    }
    
    // Update user name
    if (user.user_metadata && user.user_metadata.full_name) {
      userName.textContent = user.user_metadata.full_name;
    } else {
      userName.textContent = user.email;
    }
  }
}

// Load posts from database
async function loadPosts() {
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
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">${post.excerpt || 'لا يوجد وصف'}</p>
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

//event click to load users
// document.getElementById("users").addEventListener("click", loadUsers);


// load users from database
async function loadUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading users:', error);
    return;
  }
  
  renderUsers(users);

}

// Render users in the users list
function renderUsers(users) { 
  // Clear current users
  usersListBody.innerHTML = '';
  
  if (users.length === 0) {
    usersListBody.innerHTML = `
      <tr class="bg-gray-700 border-b border-gray-600">
        <td colspan="5" class="px-6 py-4 text-center text-gray-400">لا يوجد مستخدمين</td>
      </tr>
    `;
    return;
  }
  
  // Render each user
  users.forEach(user => {
    const row = document.createElement('tr');
    row.className = 'bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
    
    row.innerHTML = `
      <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">${user.email}</td>
      <td class="px-6 py-4">${user.user_metadata.full_name || 'غير معروف'}</td>
      <td class="px-6 py-4">${user.created_at ? formatDate(user.created_at) : 'غير معروف'}</td>
      <td class="px-6 py-4">${user.role || 'مستخدم'}</td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-2">
          <button class="font-medium text-indigo-600 dark:text-indigo-500 hover:underline edit-user" data-id="${user.id}">تعديل</button>
          <button class="font-medium text-red-600 dark:text-red-500 hover:underline delete-user" data-id="${user.id}">حذف</button>
        </div>
      </td>
    `;
    
    usersListBody.appendChild(row);
  });
  
  // Re-initialize icons for the new content
  lucide.createIcons();
  
  // Add event listeners to edit/delete buttons
  document.querySelectorAll('.edit-user').forEach(button => {
    button.addEventListener('click', () => editUser(button.dataset.id));
  });
  
  document.querySelectorAll('.delete-user').forEach(button => {
    button.addEventListener('click', () => deleteUser(button.dataset.id));
  });
}





// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-EG', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}

// Edit post
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

// Delete post
async function deletePost(postId) {
  if (!confirm('هل أنت متأكد من حذف هذه التدوينة؟')) {
    return;
  }
  
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  
  if (error) {
    console.error('Error deleting post:', error);
    alert('حدث خطأ أثناء حذف التدوينة');
  } else {
    loadPosts();
  }
}

// Save or update post
async function savePost(status) {
  const postId = document.getElementById('post-id').value;
  const title = document.getElementById('post-title').value;
  const excerpt = document.getElementById('post-excerpt').value;
  const category = document.getElementById('post-category').value;
  const content = tinymce.get('post-content').getContent();
  
  if (!title) {
    alert('عنوان التدوينة مطلوب');
    return;
  }
  
  const postData = {
    title,
    excerpt,
    content,
    status
  };
  
  let result;
  
  if (postId) {
    // Update existing post
    result = await supabase
      .from('posts')
      .update(postData)
      .eq('id', postId);
  } else {
    // Insert new post
    postData.created_at = new Date().toISOString();
    result = await supabase
      .from('posts')
      .insert([postData]);
  }
  
  if (result.error) {
    console.error('Error saving post:', result.error);
    alert('حدث خطأ أثناء حفظ التدوينة');
  } else {
    closePostEditor();
    loadPosts();
  }
}

// Show loading overlay
function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// Initialize the dashboard
async function initDashboard() {
  showLoading();
  
  try {
    // Initialize theme
    initTheme();
    
    // Load user info
    await loadUserInfo();
    
    // Load initial posts data
    await loadPosts();
    
    // Initialize charts for dashboard
    initializeCharts();
    
    // Show dashboard section by default
    showSection('dashboard');
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  } finally {
    // Hide loading overlay when everything is loaded
    hideLoading();
  }
}


// Event Listeners
// البدااااية
document.addEventListener('DOMContentLoaded', () => {
  // Initialize dashboard
  initDashboard();
  
  // Theme toggle
  toggleThemeBtn.addEventListener('click', toggleTheme);
  
  // Mobile sidebar toggle
  openSidebarBtn.addEventListener('click', toggleSidebar);
  closeSidebarBtn.addEventListener('click', toggleSidebar);
  
  // Section navigation
  sectionButtons.forEach(button => {
    button.addEventListener('click', () => {
      showSection(button.dataset.section);
    });
  });
  
  // Logout button
  logoutButton.addEventListener('click', handleLogout);
  
  // Quick actions toggle
  quickActionsButton.addEventListener('click', toggleQuickActions);
  document.addEventListener('click', (e) => {
    if (!quickActionsButton.contains(e.target) && !quickActionsMenu.contains(e.target)) {
      quickActionsMenu.classList.add('hidden');
    }
  });
  
  // Post editor modal
  newPostBtn?.addEventListener('click', () => {
    document.getElementById('post-id').value = '';
    document.getElementById('post-title').value = '';
    document.getElementById('post-excerpt').value = '';
    document.getElementById('post-status').value = 'draft';
    document.getElementById('modalTitle').textContent = 'إضافة تدوينة جديدة';
    openPostEditor();
  });
  
  newPostAction?.addEventListener('click', () => {
    document.getElementById('post-id').value = '';
    document.getElementById('post-title').value = '';
    document.getElementById('post-excerpt').value = '';
    document.getElementById('post-status').value = 'draft';
    document.getElementById('modalTitle').textContent = 'إضافة تدوينة جديدة';
    openPostEditor();
    quickActionsMenu.classList.add('hidden');
  });
  
  closeEditorModal?.addEventListener('click', closePostEditor);
  
  // Post form submission
  postForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    savePost(document.getElementById('post-status').value);
  });
  
  // Save draft button
  saveDraftBtn?.addEventListener('click', () => {
    savePost('draft');
  });
  
  // Post view toggle
  gridViewBtn?.addEventListener('click', setGridView);
  listViewBtn?.addEventListener('click', setListView);
  
  // Search and filter posts
  searchInput?.addEventListener('input', loadPosts);
  statusFilter?.addEventListener('change', loadPosts);
  
  // Initialize Tabs for Settings
  const tabs = document.querySelectorAll('[role="tab"]');
  const tabContents = document.querySelectorAll('[role="tabpanel"]');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs
      tabs.forEach(t => {
        t.classList.remove('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400', 'dark:border-indigo-400');
        t.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Hide all tab contents
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      // Activate current tab
      tab.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300', 'dark:hover:text-gray-300');
      tab.classList.add('border-indigo-600', 'text-indigo-600', 'dark:text-indigo-400', 'dark:border-indigo-400');
      tab.setAttribute('aria-selected', 'true');
      
      // Show current tab content
      const tabContent = document.getElementById(tab.getAttribute('aria-controls'));
      if (tabContent) {
        tabContent.classList.remove('hidden');
      }
    });
  });
  
  // Real-time updates for posts
  supabase
    .channel('public:posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      loadPosts();
    })
    .subscribe();
});