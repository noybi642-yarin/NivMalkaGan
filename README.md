# היום בגן

A mobile-first daily communication app for kindergartens.
Staff document a child's day in a few taps; parents understand it in 10 seconds.

> פחות התעסקות לצוות. יותר שקט להורים.

Product analysis, information architecture, data model, permissions and flows: [`docs/PRODUCT.md`](docs/PRODUCT.md).

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

Other scripts: `npm test` (API + permission tests), `npm run seed` (reset the demo database).
The database lives at `data/gan.db` (override with `DB_PATH`).

## Demo accounts

Password for all: `gan12345` (the login screen also has one-tap demo buttons).

| Role | Name | Phone |
|---|---|---|
| Parent (ניב's mom) | נוי | 050-0000001 |
| Staff, class צעירים | מיכל | 050-0000002 |
| Manager | אורית | 050-0000003 |

## Structure

```
server/            Express API
  app.js           routes wiring, auth endpoints, security headers, error handling
  auth.js          scrypt passwords, hashed session tokens, CSRF header, login rate limit
  access.js        every "may this user see this child/class" decision
  domain.js        validation, report shape, completion rules
  routes/          staff.js · parent.js · manager.js
  seed.js          Hebrew demo data
  test/            node:test API & permission tests
client/src/        React (Vite), RTL Hebrew UI
  teacher/         היום (batch + exceptions) · הילדים · הגן · child sheet
  parent/          היום של ניב · עדכון לגן · הילדה שלי · לוח חופשות (schedule data: parent/vacations.js)
  manager/         הגן שלי · הכיתות · ניהול
  shared/          API client, Hebrew copy & gender-aware phrasing, UI primitives
```
