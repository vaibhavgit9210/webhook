// Deployed Cloudflare Worker base URL.
const WORKER_BASE_URL = "https://simple-webhook-endpoint.vaibhav-webhook.workers.dev";

// Keep one fixed channel id so you always get one single endpoint URL.
const CHANNEL_ID = "main";

const endpointEl = document.getElementById("endpoint");
const payloadEl = document.getElementById("payload");
const statusEl = document.getElementById("status");
const copyBtn = document.getElementById("copy-btn");

const endpointUrl = `${WORKER_BASE_URL}/hook/${CHANNEL_ID}`;
const latestUrl = `${WORKER_BASE_URL}/latest/${CHANNEL_ID}`;

endpointEl.textContent = endpointUrl;

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(endpointUrl);
    copyBtn.textContent = "Copied";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1200);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1200);
  }
});

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

async function loadLatest() {
  if (WORKER_BASE_URL.includes("REPLACE_ME")) {
    statusEl.textContent = "Set WORKER_BASE_URL in app.js";
    return;
  }

  try {
    const response = await fetch(latestUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.receivedAt) {
      payloadEl.textContent = pretty(data);
      statusEl.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
    } else {
      payloadEl.textContent = "Waiting for webhook...";
      statusEl.textContent = "No payload yet";
    }
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  }
}

loadLatest();
setInterval(loadLatest, 2000);
