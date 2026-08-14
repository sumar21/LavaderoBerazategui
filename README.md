# Lavadero Berazategui

Purchasing, stock and production manager. React + Vite frontend and an Express API that
reads and writes SharePoint through Microsoft Graph.

Both halves live in this repo and deploy together as a single Vercel project: the frontend
is served as static files, the Express app runs at `/api/*`.

## Layout

```
api/          Express API (Microsoft Graph -> SharePoint)
components/   Shared UI and feature components
pages/        Screens
services/     API clients consumed by the pages
src/types.ts  Shared types
```

## Requirements

Node.js 20+.

## Environment

Create a `.env` in the repo root:

```
CLIENT_ID=          # Azure AD app registration
TENANT_ID=
CLIENT_SECRET=
JWT_SECRET=         # signing key for the app's own session tokens
MAIL_SENDER=        # mailbox the app sends from, e.g. info@lavaderoberazategui.com.ar
MAIL_CC_ORDENES=    # optional; semicolon-separated Cc for purchase order emails
MAIL_BCC_ORDENES=   # optional; semicolon-separated Bcc for purchase order emails
PORT=8080           # local API port; Vercel provides its own
```

Sending email needs the **`Mail.Send` application permission** on the Azure AD app
registration, with admin consent granted.

`.env` is gitignored. Never commit it — this repository is public.

The same four variables (without `PORT`) must be set as Environment Variables in the Vercel
project settings.

## Run locally

```bash
npm install
npm run dev
```

This starts both halves: the API on `http://localhost:8080` and the frontend on
`http://localhost:3000`. Vite proxies `/api` to the API, which mirrors how Vercel routes
the same paths in production — so the frontend uses relative URLs in both environments.

To run one side on its own, use `npm run dev:api` or `npm run dev:web`.

## Other scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Production build of the frontend into `dist/` |
| `npm run preview` | Serves the built frontend (no API) |
| `npm run lint` | Typechecks the frontend and the API |
| `npm run mail:preview` | Renders both email templates to `preview-*.html` and checks them. Sends nothing. |

## Deployment

Vercel, from the `main` branch. The Vite preset picks up `npm run build` and `dist/`;
[vercel.json](vercel.json) routes `/api/*` into the Express app.
