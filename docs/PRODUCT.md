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
| Owner (same staff role) | "Are the updates getting done?" — completion per class | One glance |

Key observation: in a typical class **most children have the same answer** for each field
(everyone ate lunch, everyone napped roughly 12:30–14:30). The data entry problem is therefore
not a *form* problem — it is an *exceptions* problem. The UI is built around that.

## 2. Information architecture

Two roles, each with its own app. The role is decided by the account; the login screen has two
entrances ("כניסת הורים" / "כניסת צוות הגן") and an account only opens through its own entrance.
Teachers and the kindergarten owner share the staff role — same login, screens and permissions.

```
Staff (צוות הגן)                               Parents (הורים)
├─ היום (דשבורד)  what's waiting, parent        ├─ היום        היום של [שם]: איך עבר היום · מה אכלתי ·
│                 messages, action tiles        │              פעילויות · משהו חדש שעשיתי · כדאי שתדעו ·
├─ ילדי הגן       statuses → עדכון יומי לילד/ה  │              הודעות מהגן · לוח חופשות
├─ ⚡ (middle)    עדכון מהיר לקבוצה (batch)     ├─ הודעות לגן  structured morning update
├─ לוח חופשות     add / edit / delete           ├─ הילד/ה שלי  kindergarten info + recent days
└─ הודעות         הודעה להורים + parents' notes └─ לוח חופשות  vacation calendar (read-only)
   from the dashboard: עדכון תפריט · פעילויות וחוגים
```

Staff statuses are only "עודכן" / "ממתין לעדכון" / "נעדר/ה" — no percentages or KPIs.
A class switcher lets any staff member work on any class; a parent with several children gets a child switcher.
Login is username + password, through "כניסת הורים" or "כניסת צוות הגן".

## 3. Data model

```
kindergartens ─┬─ classes ─┬─ children ─┬─ daily_reports      (child × date)
 (general info,│           │            ├─ supply_requests    (child × date, open/done)
  school year, │           │            └─ parent_updates     (child × date, seen/unseen)
  summer date) │           └─ class_days (class × date: menu, activities)
               ├─ vacations
               └─ users (role = staff | parent)
                     parent_children ── children   (a parent ↔ one or more children)
sessions (hashed tokens → users)
```

| Table | Notes |
|---|---|
| `kindergartens` | Root of all data. Holds the general info parents see (hours, phone, notice), the school year and the summer start. Everything else is reachable only through a `kindergarten_id`, so more kindergartens can be added later without changing the model. |
| `daily_reports` | `absent`, `mood` (happy/calm/tired/hard — שמח/ה · רגוע/ה · קצת עייף/ה · היה לי יום קצת קשה), `food_breakfast` / `food_lunch` / `food_snack` (well/partial/tasted/little — אכל/ה יפה · חלקית · טעם/ה מעט · כמעט לא אכל/ה), `sleep_quality` (great/good/hard/none — ישן/ה מצוין · טוב · נרדם/ה בקושי · לא ישן/ה) + optional `sleep_minutes`, `poop`, `activities` (NULL = all of the class's), `highlight` (משהו חדש שעשיתי), `note` (כדאי שתדעו). One row per child per day. |
| `menus` | Breakfast / lunch / snack — entered **once per day for the whole kindergarten**. Children only get an eating status. |
| `class_days` | Today's activities — defined **once** per class; each child's update ticks which ones they joined. |
| `vacations` | Name, type (holiday / staff_day / short_day), start/end/return dates, note. Display wording and weekdays are derived from the dates; optional overrides keep official wording such as "11.09 + 13.09". |
| `supply_requests` | One row per child per day with a list of items. Parent marks "טופל ✓"; staff sees it. Open requests stay visible until handled. |
| `parent_updates` | Structured morning updates (fixed options + optional short note). Staff marks "ראיתי" and the parent sees "הגן ראה ✓". Not a chat. |
| `children.gender` | Used only to render correct Hebrew grammar ("אכלה" / "אכל"). |

A report is **complete** ("עודכן") when mood and at least one meal are set; sleep and bowel movement are optional.

**Quick templates** (tap → tap → tap → save): every field of the child update is a ready-made option. "משהו חדש שעשיתי" and "כדאי שתדעו" offer one-tap phrases (in the child's voice / gendered for the child) that fill the text box, which stays editable. Supplies use "הורים יקרים, תשלימו לי:" with multi-select items (חיתולים, מגבונים, בגדים להחלפה, מצעים, בקבוק, מוצץ, אחר + free text).
Children marked absent are excluded from completion percentages.

## 4. Permissions

Authorization is part of the data access itself (`server/access.js`): every query for a child,
class, report or vacation joins through the requesting user's scope, so out-of-scope rows are
never read. Ids sent by the client are never trusted on their own; out-of-scope ids return 404.

| Role | Can read | Can write |
|---|---|---|
| Staff | Every class and child whose class belongs to their kindergarten; the kindergarten's info and vacations | Reports, supplies, menus/activities, general info, vacation calendar, "seen" on parent updates — all within their kindergarten |
| Parent | Only children linked in `parent_children`; each child's report, class menu/activities and supply requests; their kindergarten's general info and vacation calendar | Parent updates for their own children; mark their own child's supply request as handled |

Authentication: phone + password, scrypt hashes, random 256-bit session tokens stored only as
SHA-256 hashes, `HttpOnly` + `SameSite=Lax` (+ `Secure` in production) cookie, rate limiting of
failed logins, a required custom header on all mutating requests (CSRF), strict input validation,
and no child photos. The child's name is never a credential.

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

## 6. What was simplified away (on purpose)

- **No per-meal food tracking.** One food value ("the main meal"), shown to parents next to the lunch menu.
- **No attendance flow.** Everyone is present by default; one tap marks a child absent.
- **No chat / threads / read receipts beyond "ראיתי".** Parent updates are structured options.
- **No push notifications, calendars, photos, reports, or history analytics.**
- **No user management UI.** Accounts are provisioned at onboarding (seed script for the demo).
- **One staff role.** Teachers and the owner share it; completion per class replaces a separate manager dashboard.
- **No separate "publish" step.** Parents see updates as they are entered — one less action for staff.
