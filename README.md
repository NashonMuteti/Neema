# Group Finance App (Vite + React + TypeScript + Supabase)

A single-page React application built with **Vite**, **React Router**, **shadcn/ui**, **Tailwind CSS**, and **Supabase** (Auth + Database + Storage + Edge Functions).

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Production build](#production-build)
- [Deploying for production](#deploying-for-production)
  - [Option A: On‑prem (Nginx)](#option-a-on-prem-nginx)
  - [Option B: On‑prem (Apache)](#option-b-on-prem-apache)
  - [Option C: Vercel (recommended)](#option-c-vercel-recommended)
  - [Option D: GitHub Pages](#option-d-github-pages)
- [Supabase setup notes (database + edge functions)](#supabase-setup-notes-database--edge-functions)
- [Production troubleshooting (common Vite/SPA issues)](#production-troubleshooting-common-vitespa-issues)

---

## Prerequisites

### Required

- **Node.js**: 18+ (recommended: latest LTS)
- **pnpm**: this repo is pinned to pnpm (see `package.json#packageManager`)
- A **Supabase project** (for auth + data)

### Optional (for on‑prem hosting)

- Nginx or Apache (or any static file server)

---

## Project structure

Key folders/files:

- `src/` — application source
  - `src/App.tsx` — routes are defined here (React Router)
  - `src/pages/` — pages
  - `src/components/` — components
  - `src/integrations/supabase/client.ts` — Supabase client (reads Vite env vars)
- `supabase/` — migrations and Edge Functions source
- `vite.config.ts` — Vite config
- `vercel.json` — SPA rewrite for Vercel (so deep-links work)

---

## Environment variables

This app requires **build-time** Vite environment variables.

Create a `.env` file for local development and provide the same values in your hosting provider for production.

Required:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key

Example `.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Notes:

- Vite only exposes env vars prefixed with `VITE_` to client code.
- If these are missing, the app will throw on startup (see `src/integrations/supabase/client.ts`).

---

## Local development

1. Install dependencies.

```bash
pnpm install
```

2. Add your `.env` (see [Environment variables](#environment-variables)).

3. Start the dev server.

```bash
pnpm dev
```

Vite will run the app locally and provide a dev URL.

---

## Production build

1. Build the app.

```bash
pnpm build
```

2. The production output is generated in:

- `dist/`

3. (Optional) Preview the production build locally.

```bash
pnpm preview
```

---

## Deploying for production

This is a **single page application (SPA)** using React Router's `BrowserRouter`.

That means:

- **Directly visiting deep links** (e.g. `/projects`) must return `index.html` from your server.
- Your server must be configured with an **SPA fallback rewrite**.

### Option A: On‑prem (Nginx)

1. Build the app (`pnpm build`).
2. Copy the contents of `dist/` to your server (for example to `/var/www/group-finance-app`).
3. Configure an Nginx site to serve static files **and** rewrite all routes to `index.html`.

Example Nginx config:

```nginx
server {
  listen 80;
  server_name your-domain.example;

  root /var/www/group-finance-app;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # (Optional) Cache static assets more aggressively
  location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
    expires 7d;
    add_header Cache-Control "public";
    try_files $uri =404;
  }
}
```

If you terminate TLS (HTTPS), ensure your app is served over HTTPS as well.

### Option B: On‑prem (Apache)

1. Build the app (`pnpm build`).
2. Upload `dist/` to your Apache web root.
3. Enable `mod_rewrite` and add an `.htaccess` file in the `dist/` folder:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # If the requested file/folder exists, serve it
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Otherwise, send everything to the SPA entry
  RewriteRule ^ index.html [L]
</IfModule>
```

### Option C: Vercel (recommended)

Vercel is the simplest production hosting option for Vite SPAs.

This repo already includes a `vercel.json` rewrite so deep links work.

Step-by-step:

1. Push the project to a GitHub repository.
2. In Vercel: **New Project** → import your GitHub repo.
3. Framework preset: Vite (Vercel usually auto-detects this).
4. Set **Environment Variables** in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Build settings:
   - Build Command: `pnpm build`
   - Output Directory: `dist`
6. Deploy.

After deploy:

- If you use Supabase Auth redirects, ensure your Supabase Auth settings include your Vercel domain in:
  - Authentication → URL Configuration → **Site URL**
  - Authentication → URL Configuration → **Redirect URLs**

### Option D: GitHub Pages

GitHub Pages is possible, but **requires extra SPA routing handling** because it only serves static files.

You have two main approaches:

#### D1) Keep `BrowserRouter` (recommended for real hosting) + add a SPA redirect workaround

This approach uses a `404.html` trick so deep links redirect back to `index.html`.

High-level steps:

1. Set `base` in `vite.config.ts` to your repo name:

   - Example: if your repo is `my-org/group-finance-app`, set `base: '/group-finance-app/'`.

2. Ensure `dist/404.html` exists and redirects to `index.html`.

   Common approach: copy `dist/index.html` to `dist/404.html` as part of your deploy workflow.

3. Deploy the `dist/` folder to GitHub Pages.

#### D2) Switch the app to `HashRouter`

If you can accept URLs like `/#/projects`, switching to `HashRouter` avoids server rewrites.

This requires a code change (in `src/App.tsx`) and is usually only chosen for GitHub Pages.

---

## Supabase setup notes (database + edge functions)

This repo contains:

- SQL migrations under `supabase/migrations/`
- Supabase Edge Functions under `supabase/functions/`

Typical production setup:

1. Create a Supabase project.
2. Apply the migrations to your Supabase database.
3. Ensure required Storage buckets + RLS policies exist (some migrations handle this).
4. Deploy Edge Functions if your app uses them.
5. Configure Supabase Auth URL settings for your production domain.

Important:

- **RLS must be enabled** for all tables in production.
- Review `SECURITY.md` for the baseline security practices used in this project.

---

## Production troubleshooting (common Vite/SPA issues)

### 1) "Works locally, fails in production"

Common causes:

- Missing `VITE_...` environment variables in production
- SPA routing not configured (refreshing `/projects` returns 404)
- Incorrect `base` path when hosting under a sub-path (e.g. GitHub Pages)

### 2) Blank screen after deploy

Check:

- Browser DevTools Console for errors (often missing env vars)
- Your hosting platform is serving `dist/index.html` and static assets correctly
- Your server is not caching `index.html` too aggressively

### 3) WebSocket errors in production

Most Vite apps only use WebSockets for **dev-only HMR**.

If you see WebSocket errors in production:

- Ensure you are not accidentally running the dev server behind a reverse proxy
- Confirm your production host is serving `dist/` and not running `pnpm dev`
- Check if a third-party library is trying to connect to a WebSocket endpoint

### 4) Caching issues (needing a "hard refresh")

Common workarounds:

- Configure your server/CDN to **avoid caching `index.html` for too long** (because it references hashed asset filenames)
- Allow aggressive caching for hashed files like `assets/*.js` but short caching for `index.html`

---