# Simple Webhook Receiver (GitHub Pages + Cloudflare Worker)

This is a minimal webhook.site-like setup:
- Frontend: static website on GitHub Pages
- Backend: Cloudflare Worker endpoint + Durable Object for live streaming
- Storage: no persistence (live-only while page is open)

## Live behavior

- Webhook endpoint always returns `200` JSON ack.
- If your page is open, incoming requests appear live in the UI.
- If page is closed, events are dropped (not stored).

## Deployed endpoints

- Webhook URL: `https://simple-webhook-endpoint.vaibhav-webhook.workers.dev/hook/main`
- Live stream socket (used by UI): `wss://simple-webhook-endpoint.vaibhav-webhook.workers.dev/ws/main`

## Local files

- `index.html`, `styles.css`, `app.js`: GitHub Pages frontend
- `worker.js`: Cloudflare Worker + Durable Object room
- `wrangler.toml`: Worker config

## Deploy updates

```bash
npx wrangler deploy
```

## Important constraint

GitHub Pages alone cannot receive webhook `POST` requests because it is static hosting only.
A real HTTP runtime (Worker) is required for webhook endpoints.
