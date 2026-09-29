# היום בגן — אפיון MVP

> פחות התעסקות לצוות. יותר שקט להורים.

This document captures the product thinking behind the MVP, in the order it was done:
requirements → information architecture → data model & permissions → flows → simplifications.

---

## 1. Requirements analysis

**The one problem:** a teacher documents a child's day quickly; a parent understands it instantly.

| Who | Job to be done | Time budget |
|---|---|---|
| Staff (גננת / סייעת) | Record food, sleep, bowel movement, mood for ~12–20 kids; add a personal moment when there is one | ≤ 5 min per class |
| Parent | "How was my child's day?" + "What do I need to bring tomorrow?" | ≤ 10 sec to understand |
| Manager | "Are the updates getting done? Is anything waiting on me?" | One glance |

Key observation: in a typical class **most children have the same answer** for each field
(everyone ate lunch, everyone napped roughly 12:30–14:30). The data entry problem is therefore
not a *form* problem — it is an *exceptions* problem. The UI is built around that.

## 2. Information architecture

Three role-specific apps, each with exactly three tabs. The role is decided by the login;
there is no role switcher.

```
Staff                         Parent                        Manager
├─ היום   (field-by-field      ├─ היום   (the child's day)   ├─ היום     (הגן שלי overview)
│          batch + exceptions)├─ הודעות לגן (עדכון לגן)     ├─ הכיתות   (read-only class drill-down)
├─ הילדים (per-child status,   └─ הילד/ה שלי (info +          └─ ניהול    (structure: classes, staff)
│          highlight, supplies)            recent days)
└─ הגן    (menu + activities,
           entered once per class)
```

## 3. Data model

```
kindergartens ─┬─ classes ─┬─ children ─┬─ daily_reports      (child × date)
               │           │            ├─ supply_requests    (child × date, open/done)
               │           │            └─ parent_updates     (child × date, seen/unseen)
               │           ├─ class_days (class × date: menu, activities)
               │           └─ staff_classes ── users(role=staff)
               └─ users (role = parent | staff | manager)
                     parent_children ── children
sessions (hashed tokens → users)
```

| Table | Notes |
|---|---|
| `daily_reports` | `absent`, `food` (all/most/little/none), `sleep_status` (slept/none) + `sleep_start`/`sleep_end`, `poop` (yes/no), `mood` (great/good/hard), `highlight`, `note`. One row per child per day, upserted field-by-field. |
| `class_days` | Menu (בוקר / צהריים) and activities — entered **once** per class, shown to every parent in that class. |
| `supply_requests` | One row per child per day with a list of items. Parent marks "טופל ✓"; staff sees it. Open requests stay visible until handled. |
| `parent_updates` | Structured morning updates (fixed options + optional short note). Staff marks "ראיתי" and the parent sees "הגן ראה ✓". Not a chat. |
| `children.gender` | Used only to render correct Hebrew grammar ("אכלה" / "אכל"). |

A report is **complete** when food, sleep, bowel movement and mood are set.
Children marked absent are excluded from completion percentages.

## 4. Permissions

Enforced on the server for every request (the client never decides access):

| Role | Can read | Can write |
|---|---|---|
| Parent | Only children linked in `parent_children`; that child's report, the child's class menu/activities, the child's supply requests and own updates | Parent updates for own child; mark own child's supply request as handled |
| Staff | Only children in classes linked in `staff_classes` | Reports, supplies, class day, "seen" on parent updates — for those classes only |
| Manager | Everything in own kindergarten (aggregate + read-only drill-down) | Nothing child-level (read-only by design) |

Authentication: phone + password, scrypt hashes, random 256-bit session tokens stored only as
SHA-256 hashes, `HttpOnly` + `SameSite=Lax` (+ `Secure` in production) cookie, login rate limiting,
a required custom header on all mutating requests (CSRF), strict input validation, and no child photos.

## 5. Core flows

### Staff — full class in ~5 minutes

```
Open app ──▶ "היום" (today's class, already open)
   │
   ├─ tab אוכל ─▶ "לכל מי שטרם סומן (12)" → [אכלו הכל]        1 tap
   │               tap the 2 exceptions → "מעט"                 2 taps
   ├─ tab שינה ─▶ times prefilled 12:30–14:30 → [החלה]          1 tap
   │               1 child woke early → adjust                   ~3 taps
   ├─ tab יציאה ─▶ set per child (it genuinely varies)           ~12 taps
   ├─ tab איך עבר ─▶ [יום טוב] for all, 2 × "מעולה"            3 taps
   └─ "הגן" ─▶ menu + activity chips, once for the whole class  ~4 taps
```

≈ 30 taps for a class of 12 — well under 5 minutes. Every batch action has **undo**.
Batch targets default to "whoever isn't set yet", so batching never silently overwrites
an exception the teacher already entered. "בחירה" mode lets the teacher pick specific kids instead.

Per-child extras (רגע קטן מהיום, כדאי לדעת, חסר בתיק) live in a bottom sheet with
"הבא ←" to walk through the class without closing.

### Parent — understand the day in 10 seconds

The first card answers the question: mood + the personal highlight. Then a short timeline
(food with the day's menu, sleep duration, bowel movement, activities). Then anything that
needs action: "למחר" with a single "טופל ✓" button.

### Manager — one glance

Present today, updates complete, open supply requests, items needing attention,
and completion per class ("צעירים — 100% עודכנו").

## 6. What was simplified away (on purpose)

- **No per-meal food tracking.** One food value ("the main meal"), shown to parents next to the lunch menu.
- **No attendance flow.** Everyone is present by default; one tap marks a child absent.
- **No chat / threads / read receipts beyond "ראיתי".** Parent updates are structured options.
- **No push notifications, calendars, photos, reports, or history analytics.**
- **No user management UI.** Accounts are provisioned at onboarding (seed script for the demo).
- **Manager is read-only.** Managers monitor; staff document.
- **No separate "publish" step.** Parents see updates as they are entered — one less action for staff.
