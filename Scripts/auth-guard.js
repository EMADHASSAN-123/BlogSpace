import { supabase } from './supabaseClient.js';

export async function protectPage() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "http://localhost:8081/assets/login.html";
  }
  // console.log("المستخدم مسجّل دخول:", session.user.email);
    // console.log("المستخدم مسجّل دخول:", session.access_token);


}

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

