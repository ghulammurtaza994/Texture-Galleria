# Textures Galleria — Curtains & Interior Design

A full-stack site: public frontend (portfolio + order form) and a Node.js
backend with an admin panel. No external packages required — just Node.js.

## Run it locally

```
node server.js
```

Then open:
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin.html (passcode: `change-this-passcode`)

**Change the admin passcode before going live**, either by editing
`ADMIN_KEY` in `server.js` or setting an environment variable:

```
ADMIN_KEY=your-real-passcode node server.js
```

## How it works

- `server.js` — the backend. Serves the site and exposes:
  - `GET /api/portfolio` — public, returns completed work
  - `POST /api/orders` — public, customers submit an order request
  - `GET /api/orders` — admin only (needs `x-admin-key` header or `?key=`)
  - `POST /api/orders/:id/status` — admin only, updates an order's status
  - `POST /api/portfolio` — admin only, publishes a completed order to the public gallery
- `data/orders.json` — every submitted order lives here
- `data/portfolio.json` — what's shown on the public "Completed Orders" section
- `public/` — the customer-facing site and the admin panel

**Workflow:** a customer submits an order → you see it in `/admin.html` →
you update its status as you work on it → once it's `Completed`, click
**Publish** to add it to the public portfolio.

## Publishing it on the internet (and on Google)

This project is now prepared for deployment as a standard Node.js app.
It also includes a health check endpoint at `/health` for hosting platforms.

### Recommended deployment options

1. **Render / Railway / Fly.io / Google Cloud Run**
   - Connect this GitHub repository.
   - Use the start command: `npm start`
   - Set the environment variables from `.env.example`.
   - For Google Cloud Run, the included Dockerfile can be used.

3. **Get found on Google:**
   - Create a free **Google Business Profile** for Textures Galleria with
     your address and phone — this is what actually gets you into Google
     Maps and local search results, faster than SEO alone.
   - Once the site is live, add it to **Google Search Console** and submit
     it for indexing.

Data is currently stored in JSON files, which is fine to start — if
order volume grows, this can be swapped for a real database later
without changing the frontend.
