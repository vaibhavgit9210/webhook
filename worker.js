/**
 * Cloudflare Worker with Durable Object room for live webhook streaming.
 * No persistence: payloads are only broadcast to currently connected clients.
 */

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "*"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}

async function parseBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return { raw: await request.text() };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  const text = await request.text();
  return text || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (pathname.startsWith("/ws/")) {
      const channel = pathname.split("/")[2] || "main";
      const id = env.WEBHOOK_ROOM.idFromName(channel);
      const stub = env.WEBHOOK_ROOM.get(id);
      return stub.fetch("https://room/connect", {
        headers: { Upgrade: request.headers.get("Upgrade") || "" }
      });
    }

    if (pathname.startsWith("/hook/")) {
      const channel = pathname.split("/")[2] || "main";
      const id = env.WEBHOOK_ROOM.idFromName(channel);
      const stub = env.WEBHOOK_ROOM.get(id);

      const payload = {
        channel,
        method: request.method,
        url: request.url,
        receivedAt: new Date().toISOString(),
        query: Object.fromEntries(url.searchParams.entries()),
        headers: Object.fromEntries(request.headers.entries()),
        body: await parseBody(request)
      };

      await stub.fetch("https://room/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      return json({ ok: true, channel, receivedAt: payload.receivedAt });
    }

    return json({ error: "Not found" }, 404);
  }
};

export class WebhookRoom {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.state.acceptWebSocket(server);
      server.send(JSON.stringify({ system: true, message: "connected", at: new Date().toISOString() }));

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/publish") {
      const payload = await request.json();
      const message = JSON.stringify(payload);

      for (const ws of this.state.getWebSockets()) {
        try {
          ws.send(message);
        } catch {
          try {
            ws.close(1011, "send failed");
          } catch {
            // ignore
          }
        }
      }

      return json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
}
