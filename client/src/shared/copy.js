// All Hebrew copy that depends on data (gender, values, dates) lives here.

/** Gendered Hebrew: g(child.gender, 'אכל', 'אכלה'). */
export const g = (gender, male, female) => (gender === 'f' ? female : male);

// Quick-select options. `label(gender)` reads naturally for the specific child ("אכלה יפה" / "אכל יפה"),
// `short` fits the compact rows of the group update, `batch` is the plural group button.

export const MOOD = [
  { value: 'happy', emoji: '😊', short: 'שמח/ה', batch: 'שמחים', label: (gd) => g(gd, 'שמח', 'שמחה') },
  { value: 'calm', emoji: '🙂', short: 'רגוע/ה', batch: 'רגועים', label: (gd) => g(gd, 'רגוע', 'רגועה') },
  { value: 'tired', emoji: '😴', short: 'עייף/ה', batch: 'קצת עייפים', label: (gd) => g(gd, 'קצת עייף', 'קצת עייפה') },
  { value: 'hard', emoji: '💛', short: 'יום קשה', batch: 'יום קצת קשה', label: () => 'היה לי יום קצת קשה' },
];

/** The parent's "איך עבר עליי היום?" line, in the child's voice. */
export function moodSentence(mood, gender) {
  return {
    happy: 'היה לי יום שמח',
    calm: 'היה לי יום רגוע',
    tired: g(gender, 'הייתי קצת עייף היום', 'הייתי קצת עייפה היום'),
    hard: 'היה לי יום קצת קשה',
  }[mood];
}

export const FOOD = [
  { value: 'well', emoji: '😋', short: 'יפה', batch: 'אכלו יפה', label: (gd) => g(gd, 'אכל יפה', 'אכלה יפה') },
  { value: 'partial', emoji: '🙂', short: 'חלקית', batch: 'אכלו חלקית', label: (gd) => g(gd, 'אכל חלקית', 'אכלה חלקית') },
  { value: 'tasted', emoji: '🥄', short: 'טעם/ה', batch: 'טעמו מעט', label: (gd) => g(gd, 'טעם מעט', 'טעמה מעט') },
  { value: 'little', emoji: '🌱', short: 'כמעט לא', batch: 'כמעט לא אכלו', label: (gd) => g(gd, 'כמעט לא אכל', 'כמעט לא אכלה') },
];

/** 'well' → 'אכלה יפה' */
export const foodLabel = (food, gender) => FOOD.find((f) => f.value === food)?.label(gender);

export const SLEEP = [
  { value: 'great', emoji: '🌙', short: 'מצוין', batch: 'ישנו מצוין', label: (gd) => g(gd, 'ישן מצוין', 'ישנה מצוין') },
  { value: 'good', emoji: '😴', short: 'טוב', batch: 'ישנו טוב', label: (gd) => g(gd, 'ישן טוב', 'ישנה טוב') },
  { value: 'hard', emoji: '🥱', short: 'בקושי', batch: 'נרדמו בקושי', label: (gd) => g(gd, 'נרדם בקושי', 'נרדמה בקושי') },
  { value: 'none', emoji: '👀', short: 'לא ישן/ה', batch: 'לא ישנו', label: (gd) => g(gd, 'לא ישן', 'לא ישנה') },
];

/** Quick sleep-duration chips, in minutes. */
export const SLEEP_DURATIONS = [30, 45, 60, 75, 90, 105, 120, 150];

/** 'good', 90 → 'ישנה טוב · שעה וחצי' */
export function sleepLine(quality, minutes, gender) {
  const label = SLEEP.find((s) => s.value === quality)?.label(gender);
  return [label, quality !== 'none' && minutes ? formatDuration(minutes) : null].filter(Boolean).join(' · ');
}

export const POOP = [
  { value: 'yes', short: 'כן', batch: 'כן' },
  { value: 'no', short: 'לא', batch: 'לא' },
];

/** The quick group update: one field at a time (eating is per meal, see MENU_MEALS). */
export const FIELDS = [
  { key: 'food', label: 'ארוחות', icon: '🍽️', options: FOOD },
  { key: 'mood', label: 'איך עבר', title: 'איך עבר היום?', icon: '😊', options: MOOD },
  { key: 'sleep_quality', label: 'שינה', icon: '😴', options: SLEEP },
  { key: 'poop', label: 'יציאה', icon: '💩', options: POOP },
];

/** "משהו חדש שעשיתי" — one tap, in the child's voice; staff can still type their own. */
export const HIGHLIGHT_SUGGESTIONS = [
  { text: 'אכלתי לבד', emoji: '🥄' },
  { text: 'אמרתי מילה חדשה', emoji: '💬' },
  { text: 'שיתפתי פעולה במשחק', emoji: '🤝' },
  { text: 'שיחקתי יפה עם חברים', emoji: '👫' },
  { text: 'ניסיתי משהו חדש', emoji: '✨' },
  { text: 'השתתפתי יפה בפעילות', emoji: '🎨' },
];

/** "כדאי שתדעו" — ready phrases staff tap, then edit if needed. */
export function noteTemplates(gender) {
  return [
    g(gender, 'היה קצת עייף אחרי הצהריים', 'הייתה קצת עייפה אחרי הצהריים'),
    g(gender, 'ביקש הרבה חיבוקים היום', 'ביקשה הרבה חיבוקים היום'),
    g(gender, 'קיבל מכה קלה במשחק — טיפלנו והכל בסדר', 'קיבלה מכה קלה במשחק — טיפלנו והכל בסדר'),
    g(gender, 'שתה מעט מים היום', 'שתתה מעט מים היום'),
    'החלפנו בגדים — הבגדים המלוכלכים בתיק',
    'כדאי לשים לב לחום בערב',
  ];
}

/** 'done' | 'pending' | 'absent' — the only status staff need. */
export function childStatus(report) {
  if (report.absent) return 'absent';
  return report.complete ? 'done' : 'pending';
}

export function statusLabel(status, gender) {
  if (status === 'absent') return g(gender, 'נעדר היום', 'נעדרה היום');
  return status === 'done' ? 'עודכן היום' : 'ממתין לעדכון';
}

/** Which of today's activities the child joined (null in the report = all of them). */
export const childActivities = (report, day) => report.activities ?? day.activities;

export const MENU_MEALS = [
  { key: 'breakfast', label: 'ארוחת בוקר', emoji: '🥣' },
  { key: 'lunch', label: 'ארוחת צהריים', emoji: '🍲' },
  { key: 'snack', label: 'ארוחת ביניים', emoji: '🍎' },
];

export const SUPPLY_TITLE = 'הורים יקרים, תשלימו לי:';

export const SUPPLIES = [
  { value: 'diapers', label: 'חיתולים', emoji: '🧷' },
  { value: 'wipes', label: 'מגבונים', emoji: '🧻' },
  { value: 'clothes', label: 'בגדים להחלפה', emoji: '👕' },
  { value: 'sheets', label: 'מצעים', emoji: '🛏️' },
  { value: 'bottle', label: 'בקבוק', emoji: '🍼' },
  { value: 'pacifier', label: 'מוצץ', emoji: '👶' },
  { value: 'other', label: 'אחר', emoji: '✏️' },
];

export const PARENT_UPDATES = [
  { value: 'bad_night', label: (gd) => g(gd, 'לא ישן טוב הלילה', 'לא ישנה טוב הלילה'), icon: '🌙' },
  { value: 'cold', label: (gd) => g(gd, 'קצת מצונן', 'קצת מצוננת'), icon: '🤧' },
  { value: 'early_pickup', label: () => 'איסוף מוקדם היום', icon: '⏰' },
  { value: 'other_pickup', label: () => 'מישהו אחר אוסף היום', icon: '🧑‍🍼' },
  { value: 'other', label: () => 'אחר', icon: '💬' },
];

export const ACTIVITY_PRESETS = ['חוג מוזיקה', 'יצירה', 'משחקי מים', 'פעילות תנועה', 'סיפור', 'חצר'];

const ACTIVITY_ICONS = {
  'חוג מוזיקה': '🎵',
  'יצירה': '🎨',
  'משחקי מים': '💦',
  'פעילות תנועה': '🤸',
  'סיפור': '📖',
  'חצר': '🌳',
  'משחקי חושים': '✋',
};
export const activityIcon = (a) => ACTIVITY_ICONS[a] || '✨';

export function joinHe(items) {
  if (items.length < 2) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ו${items[items.length - 1]}`;
}

export function formatDuration(minutes) {
  if (minutes == null) return '';
  const named = { 30: 'חצי שעה', 60: 'שעה', 75: 'שעה ורבע', 90: 'שעה וחצי', 120: 'שעתיים', 150: 'שעתיים וחצי', 180: 'שלוש שעות' };
  if (named[minutes]) return named[minutes];
  if (minutes < 60) return `${minutes} דקות`;
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  return `${ltr(`${h}:${m}`)} שעות`;
}

/** Keeps times like 12:30–14:15 in reading order inside RTL text. */
export const ltr = (text) => `\u2066${text}\u2069`;

export const poopSentence = (poop) => (poop === 'yes' ? 'הייתה יציאה' : 'לא הייתה יציאה היום');

export function supplyLabels(supply) {
  return supply.items
    .map((v) => (v === 'other' ? supply.otherText || 'אחר' : SUPPLIES.find((s) => s.value === v)?.label))
    .filter(Boolean);
}

export function parentUpdateText(update, gender) {
  const labels = update.types.map((t) => PARENT_UPDATES.find((p) => p.value === t)?.label(gender)).filter(Boolean);
  return labels.join(' · ');
}

const dayFmt = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const timeFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });

/** '2026-09-29' → 'יום שלישי, 29 בספטמבר' */
export const formatDay = (date) => dayFmt.format(new Date(`${date}T12:00:00Z`));
export const formatDayShort = (date) => shortFmt.format(new Date(`${date}T12:00:00Z`));
export const formatTime = (ms) => timeFmt.format(new Date(ms));

export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Jerusalem' }).format(now),
  );
  if (hour >= 4 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  return 'ערב טוב';
}

export const childWord = (gender) => g(gender, 'הילד שלי', 'הילדה שלי');
