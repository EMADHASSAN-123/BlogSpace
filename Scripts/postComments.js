import { supabase } from 'supabaseClient.js';

// Handles comments on post page
const commentInput = document.getElementById('comment-input');
const sendBtn = document.getElementById('send-comment');
const commentsList = document.getElementById('comments-list');
const recentContainer = document.getElementById('recent-comments');

function requireLogin() {
  // Redirect to login page with return url
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `/assets/login.html?returnTo=${returnUrl}`;
}

async function getSessionUser() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session ? data.session.user : null;
  } catch (e) {
    console.error('Failed to get session', e);
    return null;
  }
}

async function postComment(postId, text) {
  const user = await getSessionUser();
  if (!user) {
    requireLogin();
    return;
  }

  // Minimal validation
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  const payload = {
    post_id: postId,
    user_id: user.id,
    user_name: user.user_metadata?.name || user.email || 'مستخدم',
    user_avatar: user.user_metadata?.avatar_url || null,
    text: trimmed,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('comments').insert([payload]);
  if (error) {
    console.error('Error adding comment', error);
    alert('تعذر إضافة التعليق. حاول مرة أخرى.');
    return;
  }

  // Refresh comments list and recent
  await loadComments(postId);
  await loadRecentComments();
  if (commentInput) commentInput.value = '';
}

async function loadComments(postId) {
  if (!postId || !commentsList) return;
  commentsList.innerHTML = '<div class="text-gray-400 text-sm">جاري تحميل التعليقات...</div>';
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  commentsList.innerHTML = '';
  if (error) {
    commentsList.innerHTML = '<div class="text-red-400 text-sm">تعذر تحميل التعليقات.</div>';
    return;
  }
  if (!data || data.length === 0) {
    commentsList.innerHTML = '<div class="text-gray-500 text-xs">لا توجد تعليقات بعد.</div>';
    return;
  }

  data.forEach(c => renderComment(commentsList, c));
}

function renderComment(list, comment) {
  const div = document.createElement('div');
  div.className = 'comment bg-gray-800 rounded px-3 py-2 flex items-center gap-3';
  const timeString = new Date(comment.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = `
    <img src="${comment.user_avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=default'}" alt="أفاتار" class="w-8 h-8 rounded-full border-2 border-purple-500" />
    <div class="flex-1">
      <div class="font-bold text-purple-300 text-sm flex items-center gap-2">
        ${escapeHTML(comment.user_name || 'مستخدم')}
        <span class="text-xs text-gray-400">${timeString}</span>
      </div>
      <div class="text-white text-sm mt-1">${escapeHTML(comment.text)}</div>
    </div>
  `;
  list.appendChild(div);
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// Load the three most recent comments via serverless function `get-comments`
async function loadRecentComments() {
  if (!recentContainer) return;
  recentContainer.innerHTML = '<div class="text-gray-400 text-sm">جاري تحميل أحدث التعليقات...</div>';
  try {
    // Call Supabase Edge Function: get-comments
    const functionsBase = 'https://vbnnzmhopcjlkvtuubcj.supabase.co/functions/v1';
    const res = await fetch(`${functionsBase}/get-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 3 })
    });
    if (!res.ok) throw new Error('Failed to fetch recent comments');
    const data = await res.json();
    recentContainer.innerHTML = '';
    if (!data || !Array.isArray(data) || data.length === 0) {
      recentContainer.innerHTML = '<div class="text-gray-500 text-xs">لا توجد تعليقات حديثة.</div>';
      return;
    }
    const box = document.createElement('div');
    box.className = 'bg-gray-900/60 rounded p-4 mb-4';
    box.innerHTML = '<h4 class="text-sm font-semibold text-purple-200 mb-2">أحدث التعليقات</h4>';
    data.forEach(c => {
      const r = document.createElement('div');
      r.className = 'flex items-start gap-3 mb-2';
      r.innerHTML = `
        <img src="${c.user_avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=default'}" class="w-8 h-8 rounded-full border-2 border-purple-500" />
        <div class="flex-1 text-sm">
          <div class="font-semibold text-purple-300">${escapeHTML(c.user_name || 'مستخدم')}</div>
          <div class="text-gray-300 mt-1">${escapeHTML(c.text)}</div>
        </div>
      `;
      box.appendChild(r);
    });
    recentContainer.appendChild(box);
  } catch (e) {
    console.error(e);
    recentContainer.innerHTML = '<div class="text-red-400 text-sm">تعذر تحميل أحدث التعليقات.</div>';
  }
}

// Wire up send button
sendBtn?.addEventListener('click', async (e) => {
  const postId = new URL(window.location.href).searchParams.get('id');
  if (!postId) return;
  const text = commentInput?.value || '';
  // If user not logged in, postComment will redirect
  await postComment(postId, text);
});

// Initialize on load
(async function init() {
  const postId = new URL(window.location.href).searchParams.get('id');
  if (!postId) return;
  await loadComments(postId);
  await loadRecentComments();

  // If user is not logged in, replace send action with login prompt
  const user = await getSessionUser();
  if (!user && sendBtn) {
    // ensure clicking shows login (postComment will redirect anyway), but provide immediate UX
    sendBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      requireLogin();
    }, { once: true });
  }
})();

export { loadComments, loadRecentComments };
