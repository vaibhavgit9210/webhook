# Simple Webhook Receiver (GitHub Pages + Cloudflare Worker)

This is a minimal webhook.site-like setup:
- Frontend: static website (host on GitHub Pages)
- Backend: Cloudflare Worker endpoint (no DB)
- Storage: keeps only latest payload in-memory per channel

## Important constraint
GitHub Pages alone cannot receive webhooks, because it is static hosting only.
You need a real HTTP endpoint. Cloudflare Worker is the lightest option.

## 1) Deploy Worker

1. Install Wrangler:
   - `npm i -g wrangler`
2. Login:
   - `wrangler login`
3. Create `wrangler.toml`:

```toml
name = "simple-webhook-endpoint"
main = "worker.js"
compatibility_date = "2026-02-22"
```

4. Deploy:
   - `wrangler deploy`
5. Copy the Worker URL (looks like `https://simple-webhook-endpoint.<subdomain>.workers.dev`)

## 2) Configure frontend

1. Open `app.js`
2. Set:
   - `WORKER_BASE_URL = "https://...workers.dev"`

## 3) Publish frontend to GitHub Pages

1. Push files to your GitHub repo.
2. In GitHub repo settings, enable Pages from your branch (for example `main` root).
3. Open your GitHub Pages URL.

## Webhook URL

Your webhook URL will be:
- `https://<worker>.workers.dev/hook/main`

Latest payload API used by page:
- `https://<worker>.workers.dev/latest/main`

## Notes

- No persistent storage: restart/redeploy may clear data.
- This is intentionally simple and cheap for testing workflows.
