# Flickle Worker API (V1 Scaffold)

This folder contains a minimal Cloudflare Worker + D1 backend scaffold for:

- magic-link auth skeleton
- session cookie auth
- archive progress storage
- archive stats endpoint

## Endpoints

- `POST /api/auth/request-link`
- `GET /api/auth/callback?token=...`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/archive/progress?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/archive/progress`
- `GET /api/archive/stats`

## 1) Create D1 database

```bash
cd workers
npx wrangler d1 create flickle-db
```

Copy the `database_id` into `wrangler.toml`.

## 2) Apply migration

```bash
cd workers
npx wrangler d1 migrations apply flickle-db --local
npx wrangler d1 migrations apply flickle-db --remote
```

## 3) Run worker locally

```bash
cd workers
npx wrangler dev
```

## 4) Quick auth test (dev mode)

`DEV_AUTH_LINKS = "1"` returns a `dev_magic_link` in the request response.

```bash
curl -X POST http://127.0.0.1:8787/api/auth/request-link \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com"}'
```

Open `dev_magic_link` in your browser. It sets a session cookie.

## 5) Progress test

After login, call:

```bash
curl -X POST http://127.0.0.1:8787/api/archive/progress \
  -H "content-type: application/json" \
  -d '{"puzzle_date":"2026-05-31","status":"won","guesses_used":4}'
```

Then:

```bash
curl "http://127.0.0.1:8787/api/archive/progress?from=2026-05-01&to=2026-05-31"
curl "http://127.0.0.1:8787/api/archive/stats"
```

## Notes

- Session cookie is `Secure`, `HttpOnly`, `SameSite=Lax`.
- Magic link email delivery uses Resend when configured.
- If `DEV_AUTH_LINKS = "1"`, the request endpoint also returns `dev_magic_link` for testing.

## Go-Live Checklist (No CLI Required)

1. In Cloudflare, open `Workers & Pages` -> `flickle-api` -> `Bindings`.
2. Confirm D1 binding exists:
   - Type: `D1 database`
   - Name: `DB`
   - Value: your `flickle-db`
3. Open `flickle-api` -> `Settings` -> `Variables and Secrets`.
4. Set production variables:
   - `PUBLIC_ORIGIN = https://flickle.io`
   - `AUTH_SUCCESS_REDIRECT = https://flickle.io/`
   - `DEV_AUTH_LINKS = 0`
   - `ALLOWED_ORIGINS = https://flickle.io,https://www.flickle.io`
   - `AUTH_EMAIL_PROVIDER = resend`
   - `AUTH_FROM_EMAIL = Flickle <signin@flickle.io>` (must be verified in Resend)
   - `AUTH_EMAIL_SUBJECT = Your Flickle sign-in link`
5. Add secret in `Settings` -> `Variables and Secrets`:
   - `RESEND_API_KEY = <your resend api key>`
6. In Resend, verify the sending domain/address used in `AUTH_FROM_EMAIL`.
7. Open `flickle-api` -> `Domains`.
8. Add a route so the website can call the Worker at the same origin path:
   - Route pattern: `flickle.io/api/*`
   - (Optional) also add `www.flickle.io/api/*` if you serve `www`.
9. Deploy the Worker after saving route/variables/secrets.
10. Test from browser:
   - `https://flickle.io/api/me` should return JSON (401 with `{ "user": null }` when signed out is normal).
   - Request sign-in link from the modal and confirm the email arrives.
   - Complete callback link and confirm `https://flickle.io/api/me` returns your user.
   - Finish an archive or daily puzzle while signed in.
11. Verify progress is saved in D1 Console:
   - `SELECT user_id, puzzle_date, status, guesses_used, updated_at FROM archive_progress ORDER BY updated_at DESC LIMIT 20;`
