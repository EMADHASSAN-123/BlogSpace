// load-stats.js


async function loadStats() {
  try {
    const res = await fetch("https://YOUR_PROJECT.functions.supabase.co/get-stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    // عرض البيانات في HTML
    document.getElementById("total-visits").textContent = data.total_visits ?? 0;
    document.getElementById("unique-ips").textContent = data.unique_ips ?? 0;
    document.getElementById("top-page").textContent = data.top_page ?? "N/A";
    document.getElementById("top-source").textContent = data.top_source ?? "N/A";

  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// استدعاء عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", loadStats);
