import { supabase } from './supabaseClient.js';

export function initSettingsManager() {
  const siteSettingsForm = document.getElementById('siteSettingsForm');
  
  // Load initial settings
  loadSettings();

  // Handle form submission
  siteSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(siteSettingsForm);
    const settings = Object.fromEntries(formData);
    
    try {
      const { data, error } = await supabase
        .from('settings')
        .upsert([settings])
        .select();
      
      if (error) throw error;
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  });
}

async function loadSettings() {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .single();
    
    if (error) throw error;
    populateSettingsForm(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function populateSettingsForm(settings) {
  document.getElementById('siteName').value = settings.site_name || '';
  document.getElementById('siteDescription').value = settings.site_description || '';
}