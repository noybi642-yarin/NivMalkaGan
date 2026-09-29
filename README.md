# היום בגן

A mobile-first daily communication app for kindergartens.
Staff document a child's day in a few taps; parents understand it in 10 seconds.

> פחות התעסקות לצוות. יותר שקט להורים.

Product analysis, information architecture, data model, permissions and flows: [`docs/PRODUCT.md`](docs/PRODUCT.md).
Visual design (based on the Google Stitch reference) and what was taken from it: [`docs/DESIGN.md`](docs/DESIGN.md).

## Run it

Requires Node 22.13+ (uses the built-in `node:sqlite`, so there are no native dependencies).

```bash
npm install
npm run dev        # http://localhost:3000 (API + Vite with hot reload, demo data seeded automatically)
```

Production:

```bash
npm run build
DEMO_MODE=true npm start   # omit DEMO_MODE for a real deployment (no demo logins, no auto-seed)
```

Other scripts: `npm test` (API + permission tests), `npm run seed` (reset the demo database —
also needed once after pulling a schema change; the server refuses to start on an outdated database).
The database lives at `data/gan.db` (override with `DB_PATH`).

## Deploying to Vercel

`vercel.json` builds the React client to `client/dist` (served as static files) and runs the same Express API as
one Vercel Function (`api/index.js`). Environment variables (Project → Settings → Environment Variables):

| Variable | Value | Why |
|---|---|---|
| `DEMO_MODE` | `true` | Seeds the demo kindergarten and shows the one-tap demo logins |
| `DB_PATH` | `/tmp/gan.db` (default) | Vercel Functions can only write to `/tmp` |
| `SESSION_SECRET` | a long random string (mark as *Sensitive*) | Signs login cookies so every function instance accepts them. Required outside demo mode; in demo mode a per-deployment key is used if it is missing |

**Limitation:** `/tmp` is temporary. The SQLite database is recreated whenever a function instance starts, so data
entered on the live site is not permanent and sessions can end when an instance is replaced. That is fine for a
demo; real use needs a persistent database (for example a hosted Postgres or libSQL database) in place of the
local SQLite file.

## Demo accounts

Password for all: `gan12345` (the login screen also has one-tap demo buttons).

| Entrance | Name | Username |
|---|---|---|
| כניסת הורים | נוי (parent of ניב and אלה) | `noy` |
| כניסת צוות הגן | דנה (teacher) | `dana` |
| כניסת צוות הגן | אורית (owner — same role as teachers) | `orit` |

## Structure

```
server/            Express API
  app.js           routes wiring, auth endpoints, security headers, error handling
  auth.js          scrypt passwords, hashed session tokens, CSRF header, login rate limit
  access.js        authorization: every lookup is scoped in SQL to the user's children / kindergarten
  kindergarten.js  general info + vacation calendar
  domain.js        validation, report shape, completion rules
  routes/          staff.js · parent.js
  seed.js          Hebrew demo data
  test/            node:test API & permission tests
client/src/        React (Vite), RTL Hebrew UI
  teacher/         staff app: דשבורד · ילדי הגן · עדכון יומי לילד/ה · עדכון מהיר לקבוצה ·
                   עדכון תפריט · פעילויות וחוגים · הודעות · לוח חופשות (editable)
  parent/          parent app: היום של ניב · עדכון לגן · הילדה שלי · לוח חופשות
  shared/          API client, Hebrew copy & gender-aware phrasing, UI primitives
```
