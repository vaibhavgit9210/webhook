/**
 * Cloudflare Worker: minimal webhook endpoint + latest payload fetch.
 * No database, only in-memory latest payload per channel.
 */

const latestByChannel = new Map();

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
  if (!text) {
    return null;
  }
  return text;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (pathname.startsWith("/hook/")) {
      const channel = pathname.split("/")[2] || "main";
      const body = await parseBody(request);

      const payload = {
        channel,
        method: request.method,
        url: request.url,
        receivedAt: new Date().toISOString(),
        query: Object.fromEntries(url.searchParams.entries()),
        headers: Object.fromEntries(request.headers.entries()),
        body
      };

      latestByChannel.set(channel, payload);

      return json({ ok: true, channel, receivedAt: payload.receivedAt });
    }

    if (pathname.startsWith("/latest/")) {
      const channel = pathname.split("/")[2] || "main";
      const payload = latestByChannel.get(channel);
      return json(payload || { channel, message: "No payload yet" });
    }

    return json({ error: "Not found" }, 404);
  }
};
