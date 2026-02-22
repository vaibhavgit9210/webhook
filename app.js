const WORKER_BASE_URL = "https://simple-webhook-endpoint.vaibhav-webhook.workers.dev";
const CHANNEL_ID = "main";

const endpointEl = document.getElementById("endpoint");
const copyBtn = document.getElementById("copy-btn");
const statusEl = document.getElementById("status");
const eventsEl = document.getElementById("events");
const detailsEl = document.getElementById("details");

const endpointUrl = `${WORKER_BASE_URL}/hook/${CHANNEL_ID}`;
const wsBase = WORKER_BASE_URL.replace("https://", "wss://").replace("http://", "ws://");
const wsUrl = `${wsBase}/ws/${CHANNEL_ID}`;

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

let events = [];
let selected = -1;

function fmt(ts) {
  return new Date(ts).toLocaleTimeString();
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

  if (selected >= 0 && events[selected]) {
    detailsEl.textContent = JSON.stringify(events[selected], null, 2);
  } else {
    detailsEl.textContent = "Waiting for webhook...";
  }
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
