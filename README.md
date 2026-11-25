# Northbridge Capital — Private Wealth & Client Portal

A responsive financial-services website and authenticated private-client portal built with React, TypeScript, Tailwind CSS, Recharts, and Supabase v2, configured for Netlify deployment.

## Included Pages & Portals

### Public Website
1. **Home** (`/`) — Institutional hero, operating principles, About preview, Services grid, Market Insights preview, Risk & Transparency notice, and Contact inquiry form.
2. **About Northbridge Capital** (`/about`)
3. **Services** (`/services`)
4. **Market Insights** (`/insights`) — Filterable institutional commentary plus live announcements from `public.broadcasts`.
5. **Investment & Risk Disclosure** (`/investment`, `/risk-disclosure`)
6. **Contact** (`/contact`) — London & Zurich office details and validated inquiry form submitting to `public.leads`.
7. **Client Login** (`/login`)
8. **Client Registration** (`/register`) — Uses `supabase.auth.signUp()` with `full_name` metadata and email verification.
9. **Forgot Password** (`/forgot-password`) & **Reset Password** (`/reset-password`)
10. **Privacy Policy** (`/privacy`)
11. **Terms of Service** (`/terms`)

### Protected Portals
- **Client Dashboard** (`/dashboard`): Account overview, account information (`public.accounts`), portfolio holdings & allocation chart (`public.holdings`), searchable/printable/shareable ledger activity (`public.account_ledger`), administrative financial requests (`public.financial_requests`), admin-controlled community updates (`public.broadcasts`), and client support messaging (`public.support_threads`).
- **Admin Dashboard** (`/admin`): Verified strictly via the Supabase `public.is_admin()` RPC. Includes registered client search and inspector, portfolio holdings management (`public.holdings`), financial request review (`admin_review_request`), default-disabled administrative ledger adjustments (`admin_credit`, `admin_debit`), client support replies, community post publishing (`admin_broadcast`), and audit log inspection (`admin_action_log`).

---

## Environment Variables Setup

The application does not hardcode any Supabase connection URL or key. Create a `.env` file locally (never commit `.env` to Git):

```env
VITE_SUPABASE_URL=https://kivpdiyzyurkwobcvxxk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

> **Security Note:** Only use your Supabase **publishable / anon** key in `VITE_SUPABASE_PUBLISHABLE_KEY`. Never place a `service_role` key, secret key, or database password in frontend environment variables.

If either `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing, the portal will display an explicit configuration warning on authentication and dashboard screens.

---

## Fresh Supabase Database Preparation

The frontend does **not** automatically create tables or modify your database schema. On a fresh Supabase project, provision your schema, triggers, Row Level Security (RLS) policies, and RPC functions in the Supabase SQL Editor before enabling user registration and portal features:

- **Tables**: `profiles`, `accounts`, `account_ledger`, `financial_requests`, `holdings`, `broadcasts`, `leads`, `support_threads`, `admin_action_log`
- **Auth Trigger**: `handle_new_user()` on `auth.users` to provision initial `profiles` (and optionally `accounts`) records on sign-up
- **RPC Functions**: `is_admin()` (returns `boolean` checked via `auth.uid()`), plus optional admin RPCs `admin_review_request`, `admin_credit`, `admin_debit`, and `admin_broadcast`

If any table or RPC has not yet been created in your fresh schema, the application reports a clear status notice instead of fabricating data.

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

---

## Netlify Deployment (Free Tier)

This repository includes `netlify.toml` and `public/_redirects` pre-configured for React Router SPA routing.

1. Push this project to a GitHub, GitLab, or Bitbucket repository (or deploy `dist/` after running `npm run build`).
2. In **Netlify**, select **Add new site -> Import an existing project**.
3. Confirm the build settings (auto-detected from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Open **Site configuration -> Environment variables** and add:
   - `VITE_SUPABASE_URL` = `https://kivpdiyzyurkwobcvxxk.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = *(your Supabase publishable key)*
5. Trigger a deploy.
6. In your **Supabase Dashboard -> Authentication -> URL Configuration**:
   - Set **Site URL** to your Netlify URL (e.g. `https://your-site.netlify.app`).
   - Add `https://your-site.netlify.app/**` to **Redirect URLs** so email verification and password reset links return to your live site cleanly.
