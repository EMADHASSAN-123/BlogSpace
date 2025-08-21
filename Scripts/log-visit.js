import { supabase } from 'supabaseClient.js';

const functionsBase = "https://vbnnzmhopcjlkvtuubcj.supabase.co/functions/v1";

  function getVisitorId() {
    let v = localStorage.getItem("visitor_id");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("visitor_id", v);
    }
    return v;
  }

  async function logVisit() {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    try {
      await fetch(`${functionsBase}/log-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          page_url: window.location.href,
          referrer: document.referrer,
          user_id: userId
        })
      });
    } catch (e) {
      console.warn("log-visit failed", e);
    }
  }

  // سجّل بعد تحميل الصفحة بقليل لتقليل التداخل
  window.addEventListener("load", () => setTimeout(logVisit, 400));