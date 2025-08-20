import { AuthManager } from './managers/AuthManager.js';
import { ThemeManager } from './managers/ThemeManager.js';
import { SectionManager } from './managers/SectionManager.js';
import { PostManager } from './managers/PostManager.js';
import { ChartManager } from './managers/ChartManager.js';
import { UserManager } from './managers/UserManager.js';

class Dashboard {
  constructor() {
    this.managers = {
      auth: new AuthManager(),
      theme: new ThemeManager(),
      sections: new SectionManager(),
      posts: new PostManager(),
      charts: new ChartManager(),
      users: new UserManager()
    };
  }

  async init() {
    try {
      // Initialize authentication
      await this.managers.auth.protectPage();
      
      // Initialize theme
      this.managers.theme.init();
      
      // Initialize sections
      this.managers.sections.init();
      
      // Initialize posts
      await this.managers.posts.init();
      
      // Initialize charts
      this.managers.charts.init();
      
      // Initialize users
      await this.managers.users.init();
      
      // Show default section
      this.managers.sections.show('dashboard');
      
    } catch (error) {
      console.error('Dashboard initialization error:', error);
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  dashboard.init();
});