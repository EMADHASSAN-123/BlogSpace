import { supabase } from './supabaseClient.js';


const form = document.getElementById('magic-form');
const emailInput = document.getElementById('email');
const message = document.getElementById('message');
const buttonGoogle = document.getElementById('ButtonGoogle');
const buttonGithub = document.getElementById('ButtonGithub');

buttonGoogle.addEventListener('click', () => {
  signInWithProvider('google'); 
});
buttonGithub.addEventListener('click', () => {  
    signInWithProvider('github');
});



    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.value,
      });
      if (error) {
        alert(error.message);
      } else {
        message.classList.remove('hidden');
      }
    });

    // OAuth Providers login
    function signInWithProvider(provider) {
      supabase.auth.signInWithOAuth({ provider });
    }

    // Determine returnTo param (used when redirecting back to the original page)
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');

    // For debugging purposes and redirect after login
    async function checkSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
      } else if (session) {
        // Redirect back to requested page or dashboard
        window.location.href = returnTo || "http://localhost:8081/BackEnd/DashBoard.html";
      }
    }
    checkSession();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = returnTo || "http://localhost:8081/BackEnd/DashBoard.html";
      }
    });
