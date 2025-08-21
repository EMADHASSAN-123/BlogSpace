import { supabase } from './supabaseClient.js'
const circularGrid = document.getElementById('circular-grid')

// إنشاء بطاقة مقالة (نفس التصميم السابق)
function createArticleCard(post) {
  const card = document.createElement('div')
  card.className = "absolute w-40 h-40 p-4 bg-white rounded-xl shadow-lg border border-gray-200 text-center hover:scale-105 transition-all duration-300"
  card.innerHTML = `
    <h3 class="text-md font-bold text-gray-700 truncate">${post.title}</h3>
    <p class="text-sm text-gray-500 mt-1">${post.excerpt || 'لا يوجد وصف'}</p>
    <p class="text-xs text-gray-400 mt-2">${timeAgo(post.created_at)}</p>
  `
  return card
}

// توزيع العناصر على دائرة
function positionCardsInCircle(container, cards) {
  const radius = 200
  const centerX = container.offsetWidth / 2
  const centerY = container.offsetHeight / 2
  const total = cards.length
  cards.forEach((card, i) => {
    const angle = (i / total) * (2 * Math.PI)
    const x = centerX + radius * Math.cos(angle) - card.offsetWidth / 2
    const y = centerY + radius * Math.sin(angle) - card.offsetHeight / 2
    card.style.left = `${x}px`
    card.style.top = `${y}px`
  })
}

// تنسيق الوقت بشكل نسبي
function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`
  return `${Math.floor(diff / 86400)} يوم`
}

// تحميل أولي للبيانات
async function loadPosts() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('status','draft')
    .order('created_at', { ascending: false })
    .limit(8)

  circularGrid.innerHTML = ''
  const cards = posts.map(post => {
    const card = createArticleCard(post)
    circularGrid.appendChild(card)
    return card
  })
  positionCardsInCircle(circularGrid, cards)
}

// اشتراك Realtime
supabase
  .channel('public:posts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
    loadPosts()
  })
  .subscribe()

// عند التحميل
window.addEventListener('DOMContentLoaded', loadPosts)