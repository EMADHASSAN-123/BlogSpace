// /Scripts/post-comments.js
import { getQueryParam, timeAgo, escapeHTMLText, avatarFor } from 'utils.js';
import { supabase } from '../supabaseClient.js';

// config
const COMMENTS_PER_PAGE = 5;

let commentsPage = 1;
let commentsReachedEnd = false;
let currentPostId = null;
const commentsListEl = () => document.getElementById('recent-comments');
const loadMoreBtn = () => document.getElementById('load-more-comments');
const formWrap = () => document.getElementById('comment-form-wrap');
const loginPrompt = () => document.getElementById('comment-login-prompt');
const commentsCountEl = () => document.getElementById('comments-count');

async function initComments() {
  currentPostId = getQueryParam('id');
  if (!currentPostId) return;

  // show skeleton until loaded
  commentsListEl().innerHTML = '<div class="text-gray-400">جاري تحميل التعليقات...</div>';
  await loadCommentsPage(1);

  // wire buttons
  loadMoreBtn().addEventListener('click', () => {
    if (!commentsReachedEnd) loadCommentsPage(commentsPage + 1);
  });

  // show/hide comment form according to auth state
  const session = supabase.auth.getSession ? await supabase.auth.getSession() : { data: { session: null } };
  const user = session?.data?.session?.user ?? null;
  if (user) {
    formWrap().classList.remove('hidden');
    loginPrompt().classList.add('hidden');
    setupCommentForm(user);
  } else {
    formWrap().classList.add('hidden');
    loginPrompt().classList.remove('hidden');
  }

  // listen when post is loaded to refresh count (postPage triggers event)
  document.addEventListener('post:loaded', () => {
    // optional: refresh comments count
  });
}

async function loadCommentsPage(page = 1) {
  if (!currentPostId) return;
  commentsListEl().innerHTML = '<div class="text-gray-400">جاري تحميل التعليقات...</div>';
  try {
    const from = (page - 1) * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        edited,
        is_deleted,
        profiles: user_id ( id, full_name, avatar_url )
      `, { count: 'exact' })
      .eq('post_id', currentPostId)
      .eq('is_deleted', false)  // بديل عن status = published
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // تفريغ أو إلحاق
    if (page === 1) commentsListEl().innerHTML = '';
    const frag = document.createDocumentFragment();
    data.forEach(c => {
      frag.appendChild(renderCommentElement(c));
    });
    commentsListEl().appendChild(frag);

    // تحديث الترقيم
    commentsPage = page;
    commentsReachedEnd = (data.length < COMMENTS_PER_PAGE) || ((count ?? 0) <= page * COMMENTS_PER_PAGE);
    loadMoreBtn().classList.toggle('hidden', commentsReachedEnd);
    commentsCountEl().textContent = `(${count ?? data.length})`;
  } catch (err) {
    console.error('loadCommentsPage error', err);
    commentsListEl().innerHTML = '<div class="text-red-400">تعذر تحميل التعليقات.</div>';
  }
}


function renderCommentElement(comment) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-gray-800 rounded px-3 py-2 flex items-start gap-3';

  const profile = comment.profiles || {};
  const avatar = profile.avatar_url || avatarFor(comment.user_id || 'guest');
  const name = profile.full_name || 'مستخدم';
  const timeString = new Date(comment.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  wrapper.innerHTML = `
    <img src="${escapeHTMLText(avatar)}" alt="avatar" class="w-10 h-10 rounded-full border-2 border-purple-500 flex-shrink-0" />
    <div class="flex-1">
      <div class="flex items-center justify-between gap-2">
        <div class="font-bold text-purple-300 text-sm">${escapeHTMLText(name)}</div>
        <div class="text-xs text-gray-400">${escapeHTMLText(timeString)}</div>
      </div>
      <div class="mt-1 text-white text-sm">${escapeHTMLText(comment.content)}</div>
    </div>`;
  return wrapper;
}

function setupCommentForm(user) {
  const input = document.getElementById('comment-input');
  const send = document.getElementById('send-comment');
  const feedback = document.getElementById('comment-form-feedback');

  send.addEventListener('click', async () => {
    const text = input.value?.trim();
    feedback.textContent = '';
    if (!text) { feedback.textContent = 'الرجاء كتابة تعليق.'; return; }
    if (text.length > 1000) { feedback.textContent = 'التعليق طويل جداً.'; return; }

    // optimistic UI: append temporary comment
    const temp = {
      id: 'temp-' + Date.now(),
      post_id: currentPostId,
      user_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: {
        full_name: user.user_metadata?.full_name || user.email || 'مستخدم',
        avatar_url: user.user_metadata?.avatar_url || avatarFor(user.id)
      }
    };
    const el = renderCommentElement(temp);
    commentsListEl().insertBefore(el, commentsListEl().firstChild);
    input.value = '';
    feedback.textContent = 'جاري الإرسال...';

    try {
      // الإدخال الصحيح حسب هيكل الجدول
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: currentPostId,
          user_id: user.id,
          content: text
        }]);

      if (error) throw error;

      feedback.textContent = 'تم الإرسال!';
      await loadCommentsPage(1); // إعادة تحميل الصفحة الأولى لتأكيد البيانات
    } catch (err) {
      console.error('comment submit error', err);
      feedback.textContent = 'حدث خطأ عند الإرسال.';
      el.remove(); // حذف التعليق المؤقت
    }
  });
}

// initialize
document.addEventListener('DOMContentLoaded', () => {
  initComments();
  console.log(currentPostId)
});
