import { supabase } from './supabaseClient.js';

export function initUserManager() {
  const addUserBtn = document.getElementById('addUserBtn');
  const usersListBody = document.getElementById('usersListBody');

  // Load initial users
  loadUsers();

  // Handle add user button
  addUserBtn.addEventListener('click', () => {
    // Open user creation modal
  });
}

async function loadUsers() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    renderUsers(users);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function renderUsers(users) {
  const usersListBody = document.getElementById('usersListBody');
  usersListBody.innerHTML = users.map(user => `
    <tr class="border-b border-gray-700">
      <td class="px-6 py-4">${user.name}</td>
      <td class="px-6 py-4">${user.email}</td>
      <td class="px-6 py-4">${user.role}</td>
      <td class="px-6 py-4">${user.status}</td>
      <td class="px-6 py-4">${new Date(user.last_login).toLocaleDateString()}</td>
      <td class="px-6 py-4">
        <button class="text-indigo-400 hover:text-indigo-300">تعديل</button>
        <button class="text-red-500 hover:text-red-400">حذف</button>
      </td>
    </tr>
  `).join('');
}