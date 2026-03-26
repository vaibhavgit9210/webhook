const WORKER_BASE_URL = "https://simple-webhook-endpoint.vaibhav-webhook.workers.dev";
const CHANNEL_ID = "main";

const endpointEl = document.getElementById("endpoint");
const copyBtn = document.getElementById("copy-btn");
const statusEl = document.getElementById("status");
const eventsEl = document.getElementById("events");
const detailsEl = document.getElementById("details");
const detailContent = document.querySelector(".detail-content");
const themeToggle = document.getElementById("theme-toggle");
const copyDetailBtn = document.getElementById("copy-detail");

const endpointUrl = `${WORKER_BASE_URL}/hook/${CHANNEL_ID}`;
const wsBase = WORKER_BASE_URL.replace("https://", "wss://").replace("http://", "ws://");
const wsUrl = `${wsBase}/ws/${CHANNEL_ID}`;

endpointEl.textContent = endpointUrl;

// ── Dark mode ──
function getTheme() {
  return localStorage.getItem("wh-theme") || "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
}

applyTheme(getTheme());

themeToggle.addEventListener("click", () => {
  const next = getTheme() === "dark" ? "light" : "dark";
  localStorage.setItem("wh-theme", next);
  applyTheme(next);
});

// ── Copy endpoint ──
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(endpointUrl);
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1200);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1200);
  }
});

// ── Tabs ──
let activeTab = "body";

document.querySelectorAll(".detail-tab[data-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    document.querySelectorAll(".detail-tab[data-tab]").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    renderDetail();
  });
});

// ── Copy detail panel ──
copyDetailBtn.addEventListener("click", async () => {
  const text = detailContent.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyDetailBtn.textContent = "Copied!";
    setTimeout(() => { copyDetailBtn.textContent = "Copy"; }, 1200);
  } catch {
    copyDetailBtn.textContent = "Failed";
    setTimeout(() => { copyDetailBtn.textContent = "Copy"; }, 1200);
  }
});

// ── Events ──
let events = [];
let selected = -1;

function fmt(ts) {
  return new Date(ts).toLocaleTimeString();
}

function renderDetail() {
  if (selected < 0 || !events[selected]) {
    detailContent.innerHTML = `<pre id="details">Waiting for webhook...</pre>`;
    return;
  }

  const evt = events[selected];

  if (activeTab === "body") {
    const body = evt.body;
    const display = body && Object.keys(body).length > 0
      ? JSON.stringify(body, null, 2)
      : "(empty body)";
    detailContent.innerHTML = `<pre id="details">${escapeHtml(display)}</pre>`;
  } else {
    // Meta tab — show method, url, query, headers, timestamps
    let html = `<div class="meta-section">`;

    // Request info
    html += `<p class="meta-section-title">Request</p>`;
    html += `<table class="meta-table">`;
    html += metaRow("Method", evt.method);
    html += metaRow("URL", evt.url);
    html += metaRow("Received", evt.receivedAt);
    if (evt.channel) html += metaRow("Channel", evt.channel);
    html += `</table>`;

    // Query params
    if (evt.query && Object.keys(evt.query).length > 0) {
      html += `<p class="meta-section-title">Query Parameters</p>`;
      html += `<table class="meta-table">`;
      for (const [k, v] of Object.entries(evt.query)) {
        html += metaRow(k, v);
      }
      html += `</table>`;
    }

    // Headers
    if (evt.headers && Object.keys(evt.headers).length > 0) {
      html += `<p class="meta-section-title">Headers</p>`;
      html += `<table class="meta-table">`;
      for (const [k, v] of Object.entries(evt.headers)) {
        html += metaRow(k, v);
      }
      html += `</table>`;
    }

    html += `</div>`;
    detailContent.innerHTML = html;
  }
}

function metaRow(key, value) {
  return `<tr><td class="meta-key">${escapeHtml(key)}</td><td class="meta-val">${escapeHtml(String(value ?? ""))}</td></tr>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function render() {
  eventsEl.innerHTML = "";

  events.forEach((evt, idx) => {
    const li = document.createElement("li");
    li.className = `event-item${idx === selected ? " active" : ""}`;
    li.innerHTML = `<span class="pill">${evt.method}</span><span class="meta">${fmt(evt.receivedAt)}</span>`;
    li.addEventListener("click", () => {
      selected = idx;
      render();
    });
    eventsEl.appendChild(li);
  });

  renderDetail();
}

function connect() {
  statusEl.textContent = "Connecting...";
  const socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    statusEl.textContent = "Live";
  });

  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.system) {
        return;
      }

      events.unshift(data);
      if (events.length > 50) {
        events = events.slice(0, 50);
      }
      selected = 0;
      render();
    } catch {
      // ignore malformed messages
    }
  });

  socket.addEventListener("close", () => {
    statusEl.textContent = "Disconnected. Retrying...";
    setTimeout(connect, 1200);
  });

  socket.addEventListener("error", () => {
    statusEl.textContent = "Connection error";
    socket.close();
  });
}

render();
connect();
