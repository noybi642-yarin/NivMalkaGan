// All Hebrew copy that depends on data (gender, values, dates) lives here.

/** Gendered Hebrew: g(child.gender, 'אכל', 'אכלה'). */
export const g = (gender, male, female) => (gender === 'f' ? female : male);

export const FOOD = [
  { value: 'well', short: 'יפה', batch: 'אכלו יפה', emoji: '😋' },
  { value: 'partial', short: 'חלקית', batch: 'אכלו חלקית', emoji: '🙂' },
  { value: 'little', short: 'כמעט לא', batch: 'כמעט לא אכלו', emoji: '🌱' },
];

/** 'well' → 'אכלה יפה' */
export function foodLabel(food, gender) {
  return {
    well: g(gender, 'אכל יפה', 'אכלה יפה'),
    partial: g(gender, 'אכל חלקית', 'אכלה חלקית'),
    little: g(gender, 'כמעט לא אכל', 'כמעט לא אכלה'),
  }[food];
}

export const POOP = [
  { value: 'yes', short: 'כן', batch: 'כן' },
  { value: 'no', short: 'לא', batch: 'לא' },
];

export const MOOD = [
  { value: 'great', short: 'מעולה', batch: 'יום מעולה', label: 'יום מעולה', emoji: '😄' },
  { value: 'good', short: 'טוב', batch: 'יום טוב', label: 'יום טוב', emoji: '😊' },
  { value: 'hard', short: 'מאתגר', batch: 'יום מאתגר', label: 'יום מאתגר', emoji: '😕' },
];

export const FIELDS = [
  { key: 'food', label: 'ארוחות', icon: '🍽️', options: FOOD },
  { key: 'mood', label: 'איך עבר', title: 'איך עבר היום?', icon: '😊', options: MOOD },
  { key: 'sleep', label: 'שינה', icon: '😴' },
  { key: 'poop', label: 'יציאה', icon: '💩', options: POOP },
];

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

export const SUPPLIES = [
  { value: 'diapers', label: 'חיתולים', ask: 'חבילת חיתולים' },
  { value: 'wipes', label: 'מגבונים', ask: 'חבילת מגבונים' },
  { value: 'clothes', label: 'בגדים להחלפה', ask: 'בגדים להחלפה' },
  { value: 'bottle', label: 'בקבוק', ask: 'בקבוק' },
  { value: 'other', label: 'אחר' },
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
  if (minutes < 60) return `${minutes} דקות`;
  if (minutes === 60) return 'שעה';
  if (minutes === 120) return 'שעתיים';
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  return `${ltr(`${h}:${m}`)} שעות`;
}

/** Keeps times like 12:30–14:15 in reading order inside RTL text. */
export const ltr = (text) => `\u2066${text}\u2069`;

export const timeRange = (sleep) => ltr(`${sleep.start}–${sleep.end}`);

export function sleepShort(sleep, gender) {
  if (!sleep) return null;
  if (sleep.status === 'none') return g(gender, 'לא ישן', 'לא ישנה');
  const h = Math.floor(sleep.minutes / 60);
  const m = String(sleep.minutes % 60).padStart(2, '0');
  return `${timeRange(sleep)} · ${ltr(`${h}:${m}`)}`;
}

export function moodSentence(mood, name) {
  return {
    great: `היה ל${name} יום מעולה`,
    good: `היה ל${name} יום טוב`,
    hard: `היה ל${name} יום קצת מאתגר`,
  }[mood];
}

export function sleepSentence(sleep, gender) {
  if (sleep.status === 'none') return g(gender, 'לא ישן היום', 'לא ישנה היום');
  return `${g(gender, 'ישן', 'ישנה')} ${formatDuration(sleep.minutes)}`;
}

export const poopSentence = (poop) => (poop === 'yes' ? 'הייתה יציאה' : 'לא הייתה יציאה היום');

export function supplySentence(supply) {
  const asks = supply.items
    .map((v) => (v === 'other' ? supply.otherText : SUPPLIES.find((s) => s.value === v)?.ask))
    .filter(Boolean);
  return asks.length ? `נשמח להביא ${joinHe(asks)}` : 'נשמח להשלים ציוד בתיק';
}

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
