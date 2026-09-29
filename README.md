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

## Demo accounts

Password for all: `gan12345` (the login screen also has one-tap demo buttons).

| Entrance | Name | Username |
|---|---|---|
| כניסת הורים | נוי (parent of ניב and אלה) | `noy` |
| כניסת צוות הגן | מיכל (teacher) | `michal` |
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
