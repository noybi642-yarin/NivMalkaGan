# Stitch design review

The Google Stitch screens are a **visual reference**, not a spec. This review decides what the app
takes from them. Six screens were reviewed: login, staff dashboard, children list, quick child
update, parent "היום של ניב", and the vacation calendar.

## 1. Reused — the design language

| Element | In Stitch | In the app |
|---|---|---|
| Palette | Lavender-white surface `#faf8ff`, terracotta primary `#9a442d` / `#e07a5f`, peach `#ffdbd2`, sage `#3e6653` + mint `#c0edd4`, periwinkle containers `#f3f2ff`–`#e4e7fe`, butter mood card `#fef9e7`, lilac milestone card `#f3e8ff` | CSS tokens in `client/src/styles.css` (`:root`) |
| Shape | Large rounded cards (24–32px), pill buttons and chips, round tinted icon badges | `.card`, `.btn`, `.chip`, `.badge-icon` |
| Type | Rubik; 26px/700 page titles, 18–20px/600 card titles, 14px body, 11–12px labels | Same scale |
| Section headers | Small round tinted badge with an icon/emoji + bold title (+ optional pill on the left) | `SectionHead` component |
| Status pills | "עודכן היום" (mint) / "ממתין לעדכון" (peach) / "נעדר/ת היום" (grey) | `StatusPill` |
| Top bar | Leaf badge + kindergarten name + screen title, blurred background | `TopBar` |
| Bottom nav | Icon + label, active in primary; raised round terracotta action button in the middle (staff) | `Shell` with `fab` |
| Login | Illustrated hero card (sun, rainbow, א-ב-ג blocks), two entrance cards, username + password | `Login.jsx` |
| Staff dashboard | Greeting, reminder card, pastel action tiles grid | `Dashboard.jsx` |
| Child update | Child header, big mood cards, meal chips, multi-select activity chips, "משהו חדש שעשיתי 🌟", "כדאי שתדעו 💛", sticky save button | `ChildUpdate.jsx` |
| Parent day | Greeting card, butter mood card, meals card with a status pill, activity cards, lilac milestone card, "כדאי שתדעו 💛", "מה קורה בגן? 📢" | `ParentToday.jsx` / `DaySummary.jsx` |
| Vacations | Emoji badge per holiday, green "חוזרים לגן" pill, amber short-day pill, celebratory summer card | `VacationList.jsx` |

## 2. Simplified or ignored

- **Attendance and KPIs** — "18 מתוך 20 נוכחים", "90% התייצבות", "78% הושלם", progress bars and
  per-class percentages are gone. Staff see simple statuses and "כמה ממתינים לעדכון".
- **Photos** — child photos, profile pictures and the summer photo frame. The product stores no photos;
  children get an initial-letter avatar.
- **Arrival times, "הגיעה עם אבא", "עודכן ע״י … ב-12:15", "נכתב ע״י הגננת"** — extra data entry for staff.
- **Three meals with separate ratings and times** — the menu is entered once for the kindergarten; each
  child gets one eating status (אכל/ה יפה / חלקית / כמעט לא).
- **Four-step progress tracker, "עדכון תוך 30 שניות", character counter** — one screen with one save button.
- **Notifications bell, "אישרתי וקראתי", get-well messages, team memo, print button, vacation filter
  chips, search, SMS login, age display** — not part of daily communication.
- **Several announcements with categories** — one "הודעה להורים" at a time.

## 3. Required screens that were missing

| Required | Before | Now |
|---|---|---|
| Staff דשבורד | Batch screen was the home screen | New dashboard: greeting, "ממתינים לעדכון", parent messages, action tiles. The batch screen is the middle action button |
| עדכון יומי לילד/ה with save | Auto-saving bottom sheet | Full screen with draft state and "שמירת העדכון" |
| Per-child activities | Class activities only | Staff pick which of today's activities each child joined (all by default) |
| עדכון תפריט | Per class, inside "הגן" | Own screen; one menu per kindergarten per day (בוקר / צהריים / ביניים) |
| פעילויות וחוגים | Inside "הגן" | Own screen, per class |
| הודעה להורים | Inside "הגן" | Own screen, next to the parents' incoming messages |
| Parent sections | Mood, facts timeline, highlight | איך עבר היום · מה אכלתי · פעילויות · משהו חדש שעשיתי · כדאי שתדעו · הודעות מהגן · לוח חופשות — each hidden when empty |
| Username + password | Phone number + password | Username + password for both entrances |
| Quick templates | Some free text | Stitch's quick-select approach extended to every field: 4 moods, 4 eating options per meal, sleep quality + duration chips, "משהו חדש שעשיתי" suggestions, "כדאי שתדעו" phrases, "הורים יקרים, תשלימו לי:" supply chips |
