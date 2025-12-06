// public/code.js

// Get the :code part from URL path /code/:code
function getCodeFromPath() {
  const parts = window.location.pathname.split("/"); // ["", "code", ":code"]
  return parts[2] || "";
}

async function loadStats() {
  const statusEl = document.getElementById("status");
  const cardEl = document.getElementById("stats-card");

  const code = getCodeFromPath();

  if (!code) {
    statusEl.textContent = "No code provided in URL.";
    return;
  }

  statusEl.textContent = "Loading stats...";

  try {
    const res = await fetch(`/api/links/${encodeURIComponent(code)}`);

    if (res.status === 404) {
      statusEl.textContent = `Link with code "${code}" was not found.`;
      cardEl.classList.add("hidden");
      return;
    }

    if (!res.ok) {
      statusEl.textContent = "Failed to load stats. Please try again.";
      cardEl.classList.add("hidden");
      return;
    }

    const data = await res.json();

    // Fill fields
    document.getElementById("code").textContent = data.code;

    const shortUrl = `${window.location.origin}/${data.code}`;
    const shortUrlEl = document.getElementById("short_url");
    shortUrlEl.textContent = shortUrl;
    shortUrlEl.href = shortUrl;

    document.getElementById("target_url").textContent = data.target_url;
    document.getElementById("clicks").textContent = data.clicks;

    document.getElementById("last_clicked").textContent =
      data.last_clicked ? new Date(data.last_clicked).toLocaleString() : "-";

    document.getElementById("created_at").textContent =
      data.created_at ? new Date(data.created_at).toLocaleString() : "-";

    // Open short link button
    const openShort = document.getElementById("open-short");
    openShort.href = shortUrl;

    // Show card, clear status
    cardEl.classList.remove("hidden");
    statusEl.textContent = "";
  } catch (err) {
    console.error("Error loading stats", err);
    statusEl.textContent = "Network error while loading stats.";
    cardEl.classList.add("hidden");
  }
}

// Run when page loads
loadStats();
