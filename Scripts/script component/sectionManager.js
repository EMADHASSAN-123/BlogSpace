export function initSectionManager() {
  const sections = document.querySelectorAll('[data-section]');
  const sectionContainers = document.querySelectorAll('[id^="section-"]');
  
  // Show default section
  showSection('dashboard');

  // Add event listeners to section buttons
  sections.forEach(button => {
    button.addEventListener('click', () => {
      const section = button.getAttribute('data-section');
      showSection(section);
    });
  });

  // Handle mobile menu
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Handle sidebar toggle
  const openSidebar = document.getElementById('openSidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');
  
  openSidebar.addEventListener('click', () => {
    sidebar.classList.remove('hidden');
  });
  
  closeSidebar.addEventListener('click', () => {
    sidebar.classList.add('hidden');
  });
}

function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('[id^="section-"]').forEach(section => {
    section.classList.add('hidden');
  });
  
  // Show the selected section
  const sectionToShow = document.getElementById(`section-${sectionName}`);
  if (sectionToShow) {
    sectionToShow.classList.remove('hidden');
  }
}